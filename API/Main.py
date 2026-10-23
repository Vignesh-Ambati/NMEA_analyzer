from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from .ENDPOINTS import Routes
from .Config import APP_TITLE, APP_VERSION, ALLOWED_ORIGINS, ROUTE_PREFIX_UTILITIES

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        if origin and origin not in ALLOWED_ORIGINS:
            return JSONResponse(status_code=404, content={"detail": "Resource not found"})
            
        response = await call_next(request)
        
        # Hardened Security Headers
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS, 
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Overrides standard FastAPI exceptions (like 405 Method Not Allowed) with a generic 404
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )

app.include_router(Routes.router, prefix=ROUTE_PREFIX_UTILITIES, tags=["Utilities"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "CORE_API"}