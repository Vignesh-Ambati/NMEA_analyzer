from pydantic import BaseModel, Field
from typing import Optional

class BulkLineCopyRequest(BaseModel):
    input_path: str = Field(..., description="Absolute path to the input NMEA file")
    output_path: str = Field(..., description="Absolute path for the output file")
    expression: str = Field(..., description="Regex or literal string to search for")
    search_mode: str = Field(default="normal", description="Search mode: normal, extended, or regex")
    match_case: bool = Field(default=False, description="Enable case-sensitive matching")
    match_whole_word: bool = Field(default=False, description="Enable whole word boundary matching")

class TaskInitializationResponse(BaseModel):
    task_id: str

class TaskProgressResponse(BaseModel):
    progress: int
    status: str
    lines: int
    error: Optional[str] = None

class GenericErrorResponse(BaseModel):
    detail: str
    
__all__ = ["BulkLineCopyRequest", "TaskInitializationResponse", "TaskProgressResponse", "GenericErrorResponse"]