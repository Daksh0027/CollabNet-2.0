import logging
import os
import zipfile
from pathlib import Path
import certifi
from fastapi import APIRouter, FastAPI
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
import stripe as _stripe

from core.config import CORS_ORIGINS, ROOT_DIR
from core.database import close_db
from routers import (
    ai,
    auth,
    calendar,
    campaigns,
    collaborations,
    contracts,
    creators,
    messages,
    notifications,
    overview,
    payments,
)
from seeds.demo_data import run_migrations_and_seed

_stripe.ca_bundle_path = certifi.where()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="CollaboNet API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "CollaboNet API running"}


@api_router.get("/download/source")
async def download_source():
    repo_root = ROOT_DIR.parent
    exclude_dirs = {"node_modules", "build", "dist", "__pycache__", ".git", ".cache", ".vscode"}
    zip_path = Path("/tmp/collabonet-source.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder, dirs, files in os.walk(repo_root):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                if f.endswith((".pyc", ".log")) or f.startswith(".env") or f in ("collabonet-code.zip", "collabonet-source.zip"):
                    continue
                fp = Path(folder) / f
                zf.write(fp, fp.relative_to(repo_root))
    return FileResponse(zip_path, media_type="application/zip", filename="collabonet-code.zip")


api_router.include_router(auth.router)
api_router.include_router(creators.router)
api_router.include_router(collaborations.router)
api_router.include_router(campaigns.router)
api_router.include_router(messages.router)
api_router.include_router(contracts.router)
api_router.include_router(calendar.router)
api_router.include_router(notifications.router)
api_router.include_router(overview.router)
api_router.include_router(payments.router)
api_router.include_router(ai.router)

app.include_router(api_router)

cors_kwargs = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if CORS_ORIGINS == "*":
    cors_kwargs["allow_origin_regex"] = r"https?://.*"
else:
    cors_kwargs["allow_origins"] = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.on_event("startup")
async def startup():
    await run_migrations_and_seed()


@app.on_event("shutdown")
async def shutdown():
    close_db()
