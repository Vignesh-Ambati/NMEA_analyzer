import time
from typing import AsyncGenerator, Awaitable, Callable, Final, Optional, List, Set

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager

from DATA_BASE import dev_auth_repo, engine_params_repo
from CORE import system_logger, error_logger
from API.ENDPOINTS import router as endpoints_router
from API.Config import ( ALLOWED_ORIGINS, ALLOWED_ORIGINS_SET, API_PREFIX, APP_TITLE, APP_VERSION, )

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        dev_auth_repo.initialize_schema()
        engine_params_repo.initialize_schema()
        system_logger.info("Developer authentication SQLite Database initialized successfully")
    except Exception as exc:
        error_logger.critical(f"Failed to provision authentication database: {exc}", exc_info=True)
        raise exc
    yield

app: FastAPI = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        origin: Optional[str] = request.headers.get("origin")
        if origin is not None and origin not in ALLOWED_ORIGINS_SET:
            error_logger.warning(f"Blocked unauthorized origin access: {origin} on path: {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"detail": "Resource not found"},
            )

        response: Response = await call_next(request)

        # Hardened Security Transit Headers
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        start_time: float = time.perf_counter()
        client_host: str = request.client.host if request.client else "unknown"
        method: str = request.method
        path: str = request.url.path

        try:
            response: Response = await call_next(request)
        except Exception as exc:
            duration_ms: float = (time.perf_counter() - start_time) * 1000.0
            error_logger.error(f"Unhandled request failure: {method} {path} from {client_host} ({duration_ms:.2f}ms): {exc}", exc_info=True, )
            raise exc

        duration_ms: float = (time.perf_counter() - start_time) * 1000.0
        status_code: int = response.status_code

        system_logger.info(f"HTTP {method} {path} [{status_code}] - {duration_ms:.2f}ms (Client: {client_host})")

        if status_code >= 400:
            error_logger.warning(
                f"HTTP {status_code} on {method} {path} - {duration_ms:.2f}ms (Client: {client_host})"
            )
        return response

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    error_logger.warning(f"HTTP Exception [{exc.status_code}] on {request.method} {request.url.path} - Detail: {exc.detail}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND if exc.status_code == status.HTTP_404_NOT_FOUND else exc.status_code,
        content={"detail": "Resource not found" if exc.status_code == status.HTTP_404_NOT_FOUND else exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    error_logger.warning(f"Validation Failure on {request.method} {request.url.path} - Errors: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Unprocessable Entity", "errors": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    error_logger.critical(f"Unhandled Server Error on {request.method} {request.url.path} - Exception: {exc}", exc_info=True, )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error encountered"},
    )

app.include_router(endpoints_router, prefix=API_PREFIX, tags=["Core_API"])