from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
from collections import defaultdict

from app.config import get_settings
from app.database import init_db, close_db
from app.routes import posts, votes, upload, reports, admin, comments

settings = get_settings()

rate_limits = defaultdict(list)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    client_ip = get_client_ip(request)
    now = time.time()

    rate_limits[client_ip] = [
        t for t in rate_limits[client_ip] if now - t < settings.rate_limit_window
    ]

    if request.method == "POST":
        if len(rate_limits[client_ip]) >= 20:
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": "RATE_LIMIT",
                    "message": "Too many requests. Try again later.",
                },
            )

    if len(rate_limits[client_ip]) >= settings.rate_limit_requests:
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "error": "RATE_LIMIT",
                "message": "Rate limit exceeded",
            },
        )

    rate_limits[client_ip].append(now)

    return await call_next(request)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    return request.client.host if request.client else "unknown"


app.include_router(posts.router, prefix="/api/v1")
app.include_router(votes.router, prefix="/api/v1")
app.include_router(comments.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.app_version}
