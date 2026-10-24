import uuid
import datetime
import secrets
import threading

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from CORE.MANAGERS import JobManager
from LOG import error_logger, system_logger
from CORE.EXTRACTORS import RegexLineExtractor
from DATA_BASE import ( append_log, fetch_logs, get_developer_settings, get_engine_params, load_backend_state, save_backend_state, save_developer_settings, save_engine_params, )
from API.Config import ( DEV_PASSPHRASES, ROUTE_DEV_AUTH, ROUTE_DEV_ENGINE_PARAMS, ROUTE_DEV_LOGS, ROUTE_DEV_SETTINGS, ROUTE_EXTRACTION_COPY, ROUTE_EXTRACTION_STATUS, ROUTE_HEALTH, ROUTE_NMEA_PARSE, ROUTE_NMEA_UPLOAD, )
from API.Schemas import ( BulkLineCopyRequest, DevAuthRequest, DevAuthResponse, DevLogsQueryResponse, DevSettingsPayload, DevSettingsResponse, EngineParamsResponse, HealthResponse, NmeaEpochItem, NmeaParseRequest, NmeaParseResponse, NmeaUploadResponse, TaskInitializationResponse, TaskProgressResponse, )

router: APIRouter = APIRouter()
_job_manager: JobManager = JobManager()

def _get_utc_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

@router.get(ROUTE_HEALTH, response_model=HealthResponse)
def health_check() -> HealthResponse:
    state: Dict[str, Any] = load_backend_state()
    return HealthResponse(
        status="healthy",
        service="CORE_API",
        message="API available",
        api_prefix="/api",
        backend_state=state,
    )

@router.get(ROUTE_DEV_LOGS, response_model=DevLogsQueryResponse)
def fetch_dev_logs(
    limit: int = Query(default=200, ge=1, le=1000),
    level: Optional[str] = Query(default=None),
    stage: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
) -> DevLogsQueryResponse:
    rows: List[Dict[str, Any]] = fetch_logs(limit=limit, level=level, stage=stage, source=source)
    return DevLogsQueryResponse(count=len(rows), logs=rows)

@router.post(ROUTE_DEV_AUTH, response_model=DevAuthResponse)
def authenticate_dev(payload: DevAuthRequest) -> DevAuthResponse:
    entered_password: str = payload.password
    authenticated: bool = any(
        secrets.compare_digest(entered_password, valid_pwd) for valid_pwd in DEV_PASSPHRASES
    )

    if authenticated:
        append_log(
            source="backend",
            stage="developer",
            level="success",
            message="Developer authentication granted",
            details={"password_length": len(entered_password)},
        )
        system_logger.info("Developer access authorized successfully.")
        return DevAuthResponse(authenticated=True, message="Developer access granted")

    append_log(
        source="backend",
        stage="developer",
        level="warn",
        message="Developer authentication rejected",
        details={"provided_length": len(entered_password)},
    )
    error_logger.warning("Unauthorized access attempt on developer authentication endpoint.")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

@router.get(ROUTE_DEV_SETTINGS, response_model=Dict[str, Any])
def retrieve_dev_settings() -> Dict[str, Any]:
    settings: Dict[str, Any] = get_developer_settings()
    save_backend_state({
        "status": "online",
        "last_action": "load_dev_settings",
        "updated_at": _get_utc_now_iso(),
    })
    return settings

@router.post(ROUTE_DEV_SETTINGS, response_model=DevSettingsResponse)
def persist_dev_settings(payload: DevSettingsPayload) -> DevSettingsResponse:
    persisted: Dict[str, Any] = save_developer_settings(payload.model_dump())
    save_backend_state({
        "status": "online",
        "last_action": "save_dev_settings",
        "payload": persisted,
        "updated_at": _get_utc_now_iso(),
    })
    append_log(
        source="backend",
        stage="developer",
        level="info",
        message="Developer settings updated",
        details=persisted,
    )
    system_logger.info("Developer settings persisted successfully.")
    return DevSettingsResponse(saved=True, message="Developer settings updated", data=persisted)

@router.get(ROUTE_DEV_ENGINE_PARAMS, response_model=Dict[str, Any])
def read_engine_params() -> Dict[str, Any]:
    return get_engine_params()

@router.post(ROUTE_DEV_ENGINE_PARAMS, response_model=EngineParamsResponse)
def update_engine_params(payload: Dict[str, Any]) -> EngineParamsResponse:
    persisted: Dict[str, Any] = save_engine_params(payload)
    save_backend_state({
        "status": "online",
        "last_action": "save_engine_params",
        "payload": persisted,
        "updated_at": _get_utc_now_iso(),
    })
    append_log(
        source="backend",
        stage="developer",
        level="info",
        message="Engine parameters applied",
        details=persisted,
    )
    system_logger.info("Engine parameters saved.")
    return EngineParamsResponse(saved=True, message="Engine parameters applied successfully", data=persisted)

@router.post(ROUTE_NMEA_PARSE, response_model=NmeaParseResponse)
def parse_nmea(payload: NmeaParseRequest) -> NmeaParseResponse:
    raw_lines: List[str] = payload.content.splitlines()
    sentences: List[str] = [line.strip() for line in raw_lines if line.strip()]
    target_name: str = payload.filename or "raw_stream.log"

    append_log(
        source="backend",
        stage="ingestion",
        level="info",
        message="NMEA parse request received",
        details={"filename": target_name, "sentences": len(sentences)},
    )
    return NmeaParseResponse(
        success=True,
        totalSentences=len(sentences),
        epochs=[NmeaEpochItem(sentence_count=len(sentences), source=target_name)],
    )

@router.post(ROUTE_NMEA_UPLOAD, response_model=NmeaUploadResponse)
async def upload_nmea_file(file: UploadFile = File(...)) -> NmeaUploadResponse:
    content: bytes = await file.read()
    raw_lines: List[str] = content.decode("utf-8", errors="ignore").splitlines()
    sentences: List[str] = [line.strip() for line in raw_lines if line.strip()]
    safe_name: str = file.filename or "uploaded_stream.log"

    append_log(
        source="backend",
        stage="ingestion",
        level="info",
        message="NMEA file uploaded",
        details={"filename": safe_name, "sentences": len(sentences)},
    )
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