import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer

SONGS_PATH = Path("backend/app/data/songs.json")
EMBEDDINGS_PATH = Path("backend/app/data/embeddings.npy")

with open(SONGS_PATH, "r") as f:
    songs = json.load(f)

print(f"Embedding {len(songs)} songs...")

model = SentenceTransformer("all-MiniLM-L6-v2")

# Combine tags + summary for richer embeddings
texts = [
    f"{', '.join(song['mood_tags'])}. {song['emotional_summary']}"
    for song in songs
]

embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)

np.save(EMBEDDINGS_PATH, embeddings)
print(f"Saved embeddings to {EMBEDDINGS_PATH} — shape: {embeddings.shape}")