# API/Schemas.py
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class HealthResponse(StrictBaseModel):
    status: str
    service: str
    message: str
    api_prefix: str
    backend_state: Dict[str, Any] = Field(default_factory=dict)


class DevAuthRequest(StrictBaseModel):
    password: str = Field(..., min_length=1, description="Developer security passkey")


class DevAuthResponse(StrictBaseModel):
    authenticated: bool
    message: str


class DevSettingsPayload(StrictBaseModel):
    batchSize: int = Field(default=50000, ge=100)
    retentionWindow: int = Field(default=259200, ge=60)
    workerCount: int = Field(default=4, ge=1, le=64)
    debugMode: bool = Field(default=False)
    backendConfig: Optional[Dict[str, Any]] = None


class DevSettingsResponse(StrictBaseModel):
    saved: bool
    message: str
    data: Dict[str, Any]


class EngineParamsResponse(StrictBaseModel):
    saved: bool
    message: str
    data: Dict[str, Any]


class DevLogsQueryResponse(StrictBaseModel):
    count: int
    logs: List[Dict[str, Any]]


class NmeaParseRequest(StrictBaseModel):
    content: str = Field(..., min_length=1)
    filename: Optional[str] = Field(default="raw_stream.log")


class NmeaEpochItem(StrictBaseModel):
    sentence_count: int
    source: str


class NmeaParseResponse(StrictBaseModel):
    success: bool
    totalSentences: int
    epochs: List[NmeaEpochItem]


class NmeaUploadResponse(StrictBaseModel):
    success: bool
    fileId: str
    totalSentences: int
    epochs: List[Dict[str, Any]]
    message: str


class BulkLineCopyRequest(StrictBaseModel):
    input_path: str = Field(..., description="Absolute path to the input NMEA file")
    output_path: str = Field(..., description="Absolute path for the destination file")
    expression: str = Field(..., description="Regex or literal string to search for")
    search_mode: str = Field(default="normal", description="Search mode: normal, extended, or regex")
    match_case: bool = Field(default=False, description="Enable case-sensitive matching")
    match_whole_word: bool = Field(default=False, description="Enable whole word boundary matching")


class TaskInitializationResponse(StrictBaseModel):
    task_id: str


class TaskProgressResponse(StrictBaseModel):
    taskId: str
    progress: int
    status: str
    lines: int
    error: Optional[str] = None


class GenericClientErrorResponse(StrictBaseModel):
    detail: str


__all__ = [
    "HealthResponse",
    "DevAuthRequest",
    "DevAuthResponse",
    "DevSettingsPayload",
    "DevSettingsResponse",
    "EngineParamsResponse",
    "DevLogsQueryResponse",
    "NmeaParseRequest",
    "NmeaParseResponse",
    "NmeaUploadResponse",
    "BulkLineCopyRequest",
    "TaskInitializationResponse",
    "TaskProgressResponse",
    "GenericClientErrorResponse",
]