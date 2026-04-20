"""FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from backend.core.config import settings
from backend.core.database import init_db
from backend.routes import (
    adler_router,
    analysis_router,
    auth_router,
    clinical_intelligence_router,
    crm_router,
    interview_router,
    notes_router,
    players_router,
    spots_router,
    whatsapp_router,
)

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/", summary="Service health check")
def root() -> RedirectResponse:
    return RedirectResponse(url="/app/")


@app.get("/app", include_in_schema=False)
def app_root() -> RedirectResponse:
    return RedirectResponse(url="/app/")


app.include_router(auth_router)
app.include_router(crm_router)
app.include_router(interview_router)
app.include_router(adler_router)
app.include_router(clinical_intelligence_router)
app.include_router(whatsapp_router)
app.include_router(analysis_router)
app.include_router(players_router)
app.include_router(notes_router)
app.include_router(spots_router)

dashboard_dir = Path(__file__).resolve().parent / "static"
if dashboard_dir.exists():
    app.mount("/app", StaticFiles(directory=dashboard_dir, html=True), name="crm-app")
