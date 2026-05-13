from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.llm import extract_mood, judge_candidates, get_judge_prompt
from app.services.matcher import get_bm25_scores
from app.services.semantic import semantic_search_all

router = APIRouter()


class MoodRequest(BaseModel):
    prompt: str


SEMANTIC_THRESHOLD = 0.1


@router.post("/")
async def recommend(payload: MoodRequest):

    if not payload.prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty"
        )

    # =========================
    # EXTRACT MOOD
    # =========================

    mood_data = await extract_mood(payload.prompt)

    query_tags = mood_data["mood_tags"]
    emotional_description = mood_data["emotional_description"]

    print("\n========== QUERY ==========")
    print("Tags:", query_tags)
    print("Emotion:", emotional_description)

    # =========================
    # SEMANTIC SEARCH
    # =========================

    query_text = (
    payload.prompt
    + " "
    + emotional_description
    + " "
    + " ".join(query_tags)
)

    semantic_results = semantic_search_all(
        query_text
    )

    print("\n========== SEMANTIC TOP ==========")

    for s in semantic_results[:20]:
        print(
            f"{s['song']} | "
            f"semantic={s['semantic_score']}"
        )

    # =========================
    # SEMANTIC FILTER
    # =========================

    semantic_results = [
        s for s in semantic_results
        if s["semantic_score"] >= SEMANTIC_THRESHOLD
    ]

    print(
        f"\nAfter semantic threshold: "
        f"{len(semantic_results)} songs"
    )

    # fallback if too strict
    if len(semantic_results) < 5:
        semantic_results = semantic_results[:10]

    # =========================
    # BM25 SCORING
    # =========================

    bm25_scores = get_bm25_scores(
        query_tags
    )

    for song in semantic_results:

        idx = song["_index"]

        song["bm25_score"] = round(
            bm25_scores.get(idx, 0),
            4
        )

    # =========================
    # NORMALIZE BM25
    # =========================

    max_bm25 = max(
        [s["bm25_score"] for s in semantic_results],
        default=1
    )

    for song in semantic_results:

        if max_bm25 > 0:
            song["bm25_norm"] = round(
                song["bm25_score"] / max_bm25,
                4
            )
        else:
            song["bm25_norm"] = 0.0

    # =========================
    # FINAL SCORE
    # =========================

    for song in semantic_results:

        song["final_score"] = round(
            (
                song["semantic_score"] * 0.80
            )
            + (
                song["bm25_norm"] * 0.20
            ),
            4
        )

    # =========================
    # FINAL RANKING
    # =========================

    ranked = sorted(
        semantic_results,
        key=lambda x: x["final_score"],
        reverse=True
    )

    print("\n========== FINAL RANKING ==========")

    for s in ranked[:10]:

        print(
            f"{s['song']} | "
            f"semantic={s['semantic_score']} | "
            f"bm25={s['bm25_norm']} | "
            f"final={s['final_score']}"
        )

    # =========================
    # LLM FINAL JUDGE
    # =========================

    top3 = ranked[:5]

    judge_output = await judge_candidates(
        payload.prompt,
        emotional_description,
        query_tags,
        top3
    )

    indices = judge_output.get("selected_indices")

    if (
        not isinstance(indices, list)
        or len(indices) != 2
    ):
        indices = list(range(min(2, len(top3))))

    final = [
        top3[i]
        for i in indices
        if isinstance(i, int) and i < len(top3)
    ]

    print("\n========== JUDGE OUTPUT ==========")

    print(
        "Song 1 Reason:",
        judge_output.get("song_1_reason", "")
    )

    print(
        "Song 2 Reason:",
        judge_output.get("song_2_reason", "")
    )
    # =========================
# RESPONSE
# =========================

    return {
        "prompt": payload.prompt,
        "mood_tags": query_tags,
        "emotional_description": emotional_description,

        "recommendations": [
            {
                "song": s["song"],

                "mood_tags": s["mood_tags"],

                "emotional_summary": s["emotional_summary"],

                "reason": (
                    judge_output.get("song_1_reason", "")
                    if i == 0
                    else judge_output.get("song_2_reason", "")
                ),

                "spotify_track_id": s.get(
                    "spotify_track_id",
                    ""
                ),

                "spotify_url": s.get(
                    "spotify_url",
                    ""
                ),

                "album_art": s.get(
                    "album_art",
                    ""
                ),

                "semantic_score": s["semantic_score"],

                "bm25_score": s["bm25_score"],

                "bm25_norm": s["bm25_norm"],

                "final_score": s["final_score"]
            }

            for i, s in enumerate(final)
        ]
    }