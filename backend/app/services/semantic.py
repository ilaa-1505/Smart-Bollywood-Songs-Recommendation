import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer

from app.services.matcher import SONGS

EMBEDDINGS_PATH = (
    Path(__file__).resolve().parents[2]
    / "app"
    / "data"
    / "embeddings.npy"
)

model = SentenceTransformer("all-MiniLM-L6-v2")

SONG_EMBEDDINGS = np.load(EMBEDDINGS_PATH)
# shape: (121, 384)


def cosine_similarity(
    a: np.ndarray,
    b: np.ndarray
) -> float:

    return float(
        np.dot(a, b)
        / (
            np.linalg.norm(a)
            * np.linalg.norm(b)
        )
    )


def semantic_search_all(
    query_text: str,
    top_n: int | None = None
) -> list[dict]:
    
    

    query_embedding = model.encode(
        query_text,
        convert_to_numpy=True
    )

    scored = []

    for i, song in enumerate(SONGS):

        similarity = cosine_similarity(
            query_embedding,
            SONG_EMBEDDINGS[i]
        )

        scored.append({
            **song,
            "_index": i,
            "semantic_score": round(similarity, 4)
        })

    scored.sort(
        key=lambda x: x["semantic_score"],
        reverse=True
    )

    # return all songs if top_n is None
    if top_n is None:
        return scored

    return scored[:top_n]