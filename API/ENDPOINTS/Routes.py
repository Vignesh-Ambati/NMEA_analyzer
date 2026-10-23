import uuid
import threading
from fastapi import APIRouter, HTTPException

# DTO Imports via Schemas (Relative is fine here because it stays within the API package)
from ..Schemas import BulkLineCopyRequest, TaskInitializationResponse, TaskProgressResponse

# Strict encapsulated module imports using ABSOLUTE paths
from CORE.EXTRACTORS import RegexLineExtractor
from CORE.MANAGERS import JobManager
from LOG import logger

router = APIRouter()
_job_manager = JobManager()

def _extraction_worker(task_id: str, req: BulkLineCopyRequest) -> None:
    try:
        extractor = RegexLineExtractor(
            input_path=req.input_path,
            output_path=req.output_path,
            expression=req.expression,
            search_mode=req.search_mode,
            match_case=req.match_case,
            match_whole_word=req.match_whole_word
        )
        
        def _update_cb(pct: int, lines: int) -> None:
            status = "Complete" if pct == 100 else "Extracting..."
            _job_manager.update_task(task_id, pct, lines, status)
            
        final_lines = extractor.process(progress_callback=_update_cb)
        logger.info(f"Task {task_id} completed. Extracted {final_lines} lines.")
        
    except Exception as e:
        logger.error(f"Task {task_id} failed: {str(e)}")
        _job_manager.fail_task(task_id, str(e))

@router.post("/bulk-line-copy", response_model=TaskInitializationResponse)
def start_extraction(req: BulkLineCopyRequest):
    task_id = str(uuid.uuid4())
    _job_manager.initialize_task(task_id)
    
    thread = threading.Thread(target=_extraction_worker, args=(task_id, req))
    thread.daemon = True
    thread.start()
    
    logger.info(f"Dispatched extraction task {task_id}")
    return TaskInitializationResponse(task_id=task_id)

@router.get("/progress/{task_id}", response_model=TaskProgressResponse)
def get_progress(task_id: str):
    task = _job_manager.get_task(task_id)
    if not task:
        # Standardized 404 for missing tasks
        raise HTTPException(status_code=404, detail="Resource not found")
    return TaskProgressResponse(**task)