from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.routes import recommend, songs

app = FastAPI(title="Bollywood Mood Recommender")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# API ROUTES
# =========================

app.include_router(
    recommend.router,
    prefix="/api/recommend",
    tags=["recommend"]
)

app.include_router(
    songs.router,
    prefix="/api/songs",
    tags=["songs"]
)

# =========================
# FRONTEND PATHS
# =========================

BASE_DIR = Path(__file__).resolve().parents[2]

FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

# React assets
app.mount(
    "/assets",
    StaticFiles(directory=FRONTEND_DIST / "assets"),
    name="assets"
)

# Public files
@app.get("/favicon.svg")
async def favicon():
    return FileResponse(FRONTEND_DIST / "favicon.svg")

@app.get("/icons.svg")
async def icons():
    return FileResponse(FRONTEND_DIST / "icons.svg")

# React SPA catch-all
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    return FileResponse(FRONTEND_DIST / "index.html")