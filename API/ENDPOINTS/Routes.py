import uuid
import datetime
import threading

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from CORE.MANAGERS import JobManager
from CORE import system_logger, error_logger
from CORE.EXTRACTORS import RegexLineExtractor
from DATA_BASE import dev_auth_repo, engine_params_repo
from API import ( ROUTE_DEV_AUTH, ROUTE_DEV_PASSWORD, ROUTE_DEV_ENGINE_PARAMS, ROUTE_EXTRACTION_COPY, ROUTE_EXTRACTION_STATUS, ROUTE_HEALTH, ROUTE_NMEA_UPLOAD, API_PREFIX, EngineParamsResponse, EngineParamsCommitResponse, EngineParamsUpdateRequest, DevAuthRequest, DevAuthResponse, HealthResponse, NmeaUploadResponse, DevPasswordUpdateResponse, DevPasswordUpdateRequest, TaskInitializationResponse, TaskProgressResponse, BulkLineCopyRequest)

router: APIRouter = APIRouter()
_job_manager: JobManager = JobManager()

def _get_utc_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

@router.get(ROUTE_HEALTH, response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service="CORE_API",
        message="API available",
        api_prefix=API_PREFIX,
        backend_state={
            "mode": "standalone_offline",
            "timestamp": _get_utc_now_iso(),
        },
    )

@router.get(ROUTE_DEV_ENGINE_PARAMS, response_model=EngineParamsResponse)
def read_engine_params() -> EngineParamsResponse:
    params = engine_params_repo.get_parameters()
    return EngineParamsResponse(**params)


@router.post(ROUTE_DEV_ENGINE_PARAMS, response_model=EngineParamsCommitResponse)
def update_engine_params(payload: EngineParamsUpdateRequest) -> EngineParamsCommitResponse:
    try:
        engine_params_repo.update_parameters(
            batch_size=payload.resolved_batch_size,
            retention_window=payload.resolved_retention_window,
            worker_count=payload.resolved_worker_count,
        )
        system_logger.info(
            f"Engine parameters updated: BATCH={payload.resolved_batch_size}, "
            f"RETENTION={payload.resolved_retention_window}s, "
            f"WORKERS={payload.resolved_worker_count}x"
        )
        return EngineParamsCommitResponse(
            success=True,
            message="Engine parameters synchronized with backend database."
        )
    except Exception as exc:
        error_logger.error(f"Failed to commit engine parameters: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist engine parameters to database."
        )

@router.post(ROUTE_NMEA_UPLOAD, response_model=NmeaUploadResponse)
async def upload_nmea_file(file: UploadFile = File(...)) -> NmeaUploadResponse:
    content: bytes = await file.read()
    raw_lines: List[str] = content.decode("utf-8", errors="ignore").splitlines()
    sentences: List[str] = [line.strip() for line in raw_lines if line.strip()]
    safe_name: str = file.filename or "uploaded_stream.log"

    return NmeaUploadResponse(
        success=True,
        fileId=str(uuid.uuid4()),
        totalSentences=len(sentences),
        epochs=[{"sentence_count": len(sentences), "filename": safe_name}],
        message="File uploaded and parsed successfully",
    )

def _extraction_worker(task_id: str, req: BulkLineCopyRequest) -> None:
    try:
        extractor = RegexLineExtractor(
            input_path=req.input_path,
            output_path=req.output_path,
            expression=req.expression,
            search_mode=req.search_mode,
            match_case=req.match_case,
            match_whole_word=req.match_whole_word,
        )

        def _update_cb(pct: int, lines: int) -> None:
            status_text = "Complete" if pct == 100 else "Extracting..."
            _job_manager.update_task(task_id, pct, lines, status_text)

        final_lines: int = extractor.process(progress_callback=_update_cb)
        system_logger.info(f"Task {task_id} completed. Extracted {final_lines} lines.")
    except Exception as exc:
        error_logger.error(f"Task {task_id} failed: {exc}", exc_info=True)
        _job_manager.fail_task(task_id, str(exc))

@router.post(ROUTE_EXTRACTION_COPY, response_model=TaskInitializationResponse)
def start_extraction(req: BulkLineCopyRequest) -> TaskInitializationResponse:
    task_id: str = str(uuid.uuid4())
    _job_manager.initialize_task(task_id)
    worker_thread: threading.Thread = threading.Thread(
        target=_extraction_worker,
        args=(task_id, req),
        daemon=True,
    )
    worker_thread.start()
    system_logger.info(f"Dispatched extraction task {task_id}")
    return TaskInitializationResponse(task_id=task_id)

@router.get(ROUTE_EXTRACTION_STATUS, response_model=TaskProgressResponse)
def get_task_progress(task_id: str) -> TaskProgressResponse:
    task: Dict[str, Any] = _job_manager.get_task(task_id)
    if not task:
        error_logger.warning(f"Task status query for non-existent task_id: {task_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return TaskProgressResponse(
        taskId=task_id,
        progress=int(task.get("progress", 0)),
        status=str(task.get("status", "Unknown")),
        lines=int(task.get("lines", 0)),
        error=task.get("error"),
    )

@router.post(ROUTE_DEV_AUTH, response_model=DevAuthResponse)
def authenticate_dev(payload: DevAuthRequest) -> DevAuthResponse:
    entered_password: str = payload.password.strip()
    is_authenticated: bool = dev_auth_repo.verify_developer_passkey(entered_password)
    if is_authenticated:
        system_logger.info("Developer access authorized via sqlite vault")
        return DevAuthResponse(authenticated=True, message="Developer Access granted")
    error_logger.warning("Unauthorized access attempt on developer authentication endpoint.")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "authenticated": False,
            "detail": "Invalid developer credentials.",
        },
    )

@router.post(ROUTE_DEV_PASSWORD, response_model=DevPasswordUpdateResponse)
def update_developer_password(payload: DevPasswordUpdateRequest) -> DevPasswordUpdateResponse:
    current_pwd: str = payload.resolved_current_pwd
    new_pwd: str = payload.resolved_new_pwd

    # 1. Verify that the supplied current password is valid
    if not dev_auth_repo.verify_developer_passkey(current_pwd):
        error_logger.warning("Failed developer password update: incorrect current credentials.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "detail": "Invalid current developer credentials.",
            },
        )

    # 2. Persist new hashed password
    updated: bool = dev_auth_repo.update_developer_passkey(new_pwd)
    if not updated:
        error_logger.error("Failed to write updated developer password to database.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update developer password in database.",
        )

    system_logger.info("Developer access password updated successfully in SQLite vault.")
    return DevPasswordUpdateResponse(
        success=True,
        message="Developer access password successfully updated in backend database.",
    )