from fastapi import APIRouter
from app.services.matcher import SONGS

router = APIRouter()

@router.get("/")
async def get_songs():
    return {
        "songs": [
            {
                "song": s["song"],
                "mood_tags": s["mood_tags"]
            }
            for s in SONGS
        ]
    }