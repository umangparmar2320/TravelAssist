import time
import uuid
from datetime import datetime
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.core.config import settings
from backend.database import Base, engine, check_db_connection
from backend.part_a.utils.logger import logger
import backend.part_a.models  # Ensure all models are registered with Base.metadata
from backend.part_a.api.v1.routes import router as part_a_routes_router
from backend.part_a.api.v1.auth import router as part_a_auth_router
from backend.part_a.api.v1.users import router as part_a_users_router
from backend.part_a.api.v1.preferences import router as part_a_preferences_router
from backend.part_a.api.v1.policies import router as part_a_policies_router
from backend.part_a.api.v1.trips import router as part_a_trips_router
from backend.part_a.api.v1.providers import router as part_a_providers_router
from backend.part_b.api.v1.disruptions import router as part_b_disruptions_router
from backend.part_c.api.v1.hotels import router as part_c_hotels_router
from backend.part_d.api.v1.notifications import router as part_d_notifications_router

# Ensure tables exist on startup
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as db_init_err:
    logger.warning(f"Could not auto-create tables on engine: {db_init_err}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Part A Foundation: Multi-Modal Route Planning Architecture & Real-Time Travel Optimization.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ------------------------------------------------------------------------------
# 1. CORS Middleware
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# 2. Structured Request Logging & Request-ID Middleware
# ------------------------------------------------------------------------------
@app.middleware("http")
async def logging_and_timing_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.time()

    response = await call_next(request)

    process_time_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-MS"] = str(process_time_ms)

    # Log non-healthcheck requests or when in debug
    if "/health" not in request.url.path or settings.DEBUG:
        logger.info(
            f"[{request_id[:8]}] {request.method} {request.url.path} - "
            f"Status: {response.status_code} ({process_time_ms}ms)"
        )

    return response


# ------------------------------------------------------------------------------
# 3. Standardized Error Handling
# ------------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "path": request.url.path,
            },
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed. Please check the provided payload.",
                "details": jsonable_encoder(exc.errors()),
                "path": request.url.path,
            },
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred.",
                "details": str(exc) if settings.DEBUG else None,
                "path": request.url.path,
            },
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# ------------------------------------------------------------------------------
# 4. Health Check Endpoint
# ------------------------------------------------------------------------------
@app.get(
    "/api/v1/health",
    tags=["System Health"],
    summary="Health check & database connectivity",
    description="Returns backend server health, database connectivity status, and environment information.",
)
def health_check():
    db_status = check_db_connection()
    return {
        "status": "healthy" if db_status.get("status") == "connected" else "degraded",
        "service": "Travel Route Optimization System (Part A)",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ------------------------------------------------------------------------------
# 5. Versioned Routers Mount
# ------------------------------------------------------------------------------
app.include_router(part_a_routes_router, prefix=settings.API_V1_STR)
app.include_router(part_a_auth_router, prefix=settings.API_V1_STR)
app.include_router(part_a_users_router, prefix=settings.API_V1_STR)
app.include_router(part_a_preferences_router, prefix=settings.API_V1_STR)
app.include_router(part_a_policies_router, prefix=settings.API_V1_STR)
app.include_router(part_a_trips_router, prefix=settings.API_V1_STR)
app.include_router(part_a_providers_router, prefix=settings.API_V1_STR)
app.include_router(part_b_disruptions_router, prefix=settings.API_V1_STR)
app.include_router(part_c_hotels_router, prefix=settings.API_V1_STR)
app.include_router(part_d_notifications_router, prefix=settings.API_V1_STR)
# Also mount at root to support direct /trips, /routes, /disruptions, /hotels, /notifications paths
app.include_router(part_a_trips_router, include_in_schema=False)
app.include_router(part_a_routes_router, include_in_schema=False)
app.include_router(part_b_disruptions_router, include_in_schema=False)
app.include_router(part_c_hotels_router, include_in_schema=False)
app.include_router(part_d_notifications_router, include_in_schema=False)


@app.get("/", include_in_schema=False)
def root_redirect():
    return {
        "message": "Part A Route Planning API Foundation is active.",
        "documentation": "/docs",
        "health": "/api/v1/health",
        "routes": "/api/v1/routes",
        "auth": "/api/v1/auth",
        "users": "/api/v1/users",
        "preferences": "/api/v1/preferences",
        "policies": "/api/v1/policies",
        "trips": "/api/v1/trips",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG,
    )
