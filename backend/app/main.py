from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.endpoints import auth, jobs, keys, usage, playground

setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Developer-friendly Video Transcoding API handling MP4, HLS, Webhooks, and Subtitles.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    contact={
        "name": "API Support",
        "email": "support@transcodeflow.com",
    },
)

# Parse CORS origins from comma-separated env var
cors_origins = [
    origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Auth routes (no prefix - these are user-facing)
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

# API routes (protected by API key)
app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])
app.include_router(keys.router, prefix=f"{settings.API_V1_STR}/keys", tags=["keys"])
app.include_router(usage.router, prefix=f"{settings.API_V1_STR}/usage", tags=["usage"])

# Playground routes (protected by JWT bearer)
app.include_router(playground.router, prefix=f"{settings.API_V1_STR}/playground", tags=["playground"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
