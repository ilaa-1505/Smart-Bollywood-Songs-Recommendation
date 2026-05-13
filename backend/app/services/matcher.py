import json
from pathlib import Path
from rank_bm25 import BM25Okapi

DATA_PATH = Path(__file__).resolve().parents[2] / "app" / "data" / "songs.json"

def load_songs():
    with open(DATA_PATH, "r") as f:
        return json.load(f)

def build_bm25_index(songs: list):
    corpus = [song["mood_tags"] for song in songs]
    return BM25Okapi(corpus)

SONGS = load_songs()
BM25_INDEX = build_bm25_index(SONGS)


def get_bm25_scores(mood_tags: list[str]) -> dict[int, float]:
    """
    Returns a dict of {song_index: normalized_bm25_score} for all songs.
    """
    raw_scores = BM25_INDEX.get_scores(mood_tags)
    max_score = max(raw_scores) if max(raw_scores) > 0 else 1
    return {i: round(float(s / max_score), 4) for i, s in enumerate(raw_scores)}


def hard_filter(mood_tags: list[str], candidates: list[dict]) -> list[dict]:
    is_friendship = "friendship" in mood_tags or "companionship" in mood_tags
    is_festive = "festive" in mood_tags or "carefree" in mood_tags
    is_dark = "heartbreak" in mood_tags or "grief" in mood_tags or "quiet despair" in mood_tags
    is_family = "family" in mood_tags

    def is_valid(song):
        tags = song["mood_tags"]
        if is_friendship:
            has_friendship = "friendship" in tags or "companionship" in tags
            has_romantic = "romantic love" in tags or "heartbreak" in tags or "unrequited love" in tags
            if has_romantic and not has_friendship:
                return False
        if is_festive:
            if any(t in tags for t in ["grief", "heartbreak", "quiet despair"]):
                return False
        if is_dark:
            if any(t in tags for t in ["festive", "carefree"]):
                return False
        if is_family:
            if "romantic love" in tags and "family" not in tags:
                return False
        return True

    valid = [s for s in candidates if is_valid(s)]
    invalid = [s for s in candidates if not is_valid(s)]

    if len(valid) >= 2:
        return valid
    elif len(valid) == 1:
        # keep the 1 valid, fill with least offensive invalid
        return valid + invalid[:1]
    else:
        return candidates