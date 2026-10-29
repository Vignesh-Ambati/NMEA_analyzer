# API/Schemas.py
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


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

class DevPasswordUpdateRequest(BaseModel):
    """Developer password update payload accepting camelCase or snake_case inputs."""
    model_config = ConfigDict(extra="ignore")

    currentPassword: Optional[str] = Field(default=None, min_length=1)
    current_password: Optional[str] = Field(default=None, min_length=1)
    newPassword: Optional[str] = Field(default=None, min_length=4)
    updating_password: Optional[str] = Field(default=None, min_length=4)

    resolved_current_pwd: str = ""
    resolved_new_pwd: str = ""

    @model_validator(mode="after")
    def resolve_passwords(self) -> "DevPasswordUpdateRequest":
        curr = self.currentPassword or self.current_password
        new_pwd = self.newPassword or self.updating_password

        if not curr or not curr.strip():
            raise ValueError("Current password must be provided and non-empty.")
        if not new_pwd or not new_pwd.strip():
            raise ValueError("New password must be provided and non-empty.")
        if len(new_pwd.strip()) < 4:
            raise ValueError("New password must be at least 4 characters long.")

        self.resolved_current_pwd = curr.strip()
        self.resolved_new_pwd = new_pwd.strip()
        return self

class DevPasswordUpdateResponse(StrictBaseModel):
    success: bool
    message: str

#TODO: We need to add this later.
class DevSettingsPayload(StrictBaseModel):
    batchSize: int = Field(default=50000, ge=100)
    retentionWindow: int = Field(default=259200, ge=60)
    workerCount: int = Field(default=4, ge=1, le=64)
    debugMode: bool = Field(default=False)
    backendConfig: Optional[Dict[str, Any]] = None

#TODO: We need to add this later.
class DevSettingsResponse(StrictBaseModel):
    saved: bool
    message: str
    data: Dict[str, Any]

class EngineParamsResponse(StrictBaseModel):
    batchSize: int
    retentionWindow: int
    workerCount: int
    updatedAt: str

class EngineParamsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    batchSize: Optional[int] = Field(default=None, ge=10, le=500000)
    batch_size: Optional[int] = Field(default=None, ge=10, le=500000)
    retentionWindow: Optional[int] = Field(default=None, ge=10, le=2592000)
    retention_window: Optional[int] = Field(default=None, ge=10, le=2592000)
    workerCount: Optional[int] = Field(default=None, ge=1, le=128)
    worker_count: Optional[int] = Field(default=None, ge=1, le=128)

    resolved_batch_size: int = 500
    resolved_retention_window: int = 3600
    resolved_worker_count: int = 4

    @model_validator(mode="after")
    def resolve_fields(self) -> "EngineParamsUpdateRequest":
        b_size = self.batchSize if self.batchSize is not None else self.batch_size
        r_win = self.retentionWindow if self.retentionWindow is not None else self.retention_window
        w_cnt = self.workerCount if self.workerCount is not None else self.worker_count

        if b_size is None or r_win is None or w_cnt is None:
            raise ValueError("All parameters (batchSize, retentionWindow, workerCount) must be supplied.")

        self.resolved_batch_size = b_size
        self.resolved_retention_window = r_win
        self.resolved_worker_count = w_cnt
        return self

class EngineParamsCommitResponse(StrictBaseModel):
    success: bool
    message: str

#TODO: We need to add this later.
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

__all__ = [
    "HealthResponse",
    
    "DevAuthRequest",
    "DevAuthResponse",
    "DevPasswordUpdateRequest",
    "DevPasswordUpdateResponse",
    
    "DevSettingsPayload",
    "DevSettingsResponse",
    
    "EngineParamsResponse",
    "EngineParamsCommitResponse",
    "EngineParamsUpdateRequest",
    
    "DevLogsQueryResponse",
    
    "NmeaParseRequest",
    "NmeaParseResponse",
    "NmeaUploadResponse",
    
    "BulkLineCopyRequest",
    "TaskInitializationResponse",
    "TaskProgressResponse",
]