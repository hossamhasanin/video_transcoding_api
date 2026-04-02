from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.endpoints import jobs, keys, usage

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])
app.include_router(keys.router, prefix=f"{settings.API_V1_STR}/keys", tags=["keys"])
app.include_router(usage.router, prefix=f"{settings.API_V1_STR}/usage", tags=["usage"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
