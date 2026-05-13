from groq import Groq
from app.core.config import settings
import json

client = Groq(api_key=settings.GROQ_API_KEY)

MOOD_TAG_LIST = [
    "heartbreak", "reminiscence", "abandonment", "grief", "regret", "homesickness",
    "waiting", "unspoken feelings", "unrequited love", "romantic love", "passion",
    "togetherness", "warmth", "new love", "infatuation", "butterflies",
    "festive", "carefree", "playfulness", "gratitude", "stillness", "introspection",
    "late night calm", "solitude", "numbness", "hope", "moving on", "healing",
    "determination", "resilience", "anger", "frustration", "betrayal", "restlessness",
    "disillusionment", "existential dread", "lost", "purposelessness", "time passing",
    "live in the moment", "loneliness", "quiet despair", "emptiness", "friendship",
    "bittersweet", "missing someone", "aching for a lover", "missing a friend",
    "rainy day", "companionship"
]

SYSTEM_PROMPT = f"""You are a Bollywood music curator. Your job is to read what someone is feeling and map it to mood tags — accurately and without exaggeration.

Mood tags (use ONLY these, copy exactly):
{", ".join(MOOD_TAG_LIST)}

Rules:
- Pick exactly 3 tags. No more, no less.
- Stay grounded in what the person actually said. Do not infer, dramatize, or project.
- "heartbreak" = only when romantic loss is explicitly mentioned.
- "grief" = only for deep loss (death, major separation). Not everyday sadness.
- "homesickness" = the person themselves is away from home. Not someone else leaving.
- "rainy day" = ONLY when rain, monsoon, or weather is explicitly mentioned. Late night, darkness, silence ≠ rainy day.
- "missing someone" = use when the relationship is unclear.
- "missing a friend" = specifically for friends.
- "aching for a lover" = romantic yearning, distance, or longing.
- "companionship" = emotional comfort from simply being with people.
- "stillness" = quiet emotional pause, not sadness by default.
- "late night calm" = peaceful nighttime solitude, not despair.
- When unsure, pick the most literal tag, not the most dramatic one.

Examples:

"missing my best friend who moved away"
→ ["missing a friend", "friendship", "reminiscence"]

"it's raining and I feel something"
→ ["rainy day", "introspection", "stillness"]

"I just started liking someone"
→ ["new love", "butterflies", "hope"]

"feeling betrayed by a close friend"
→ ["betrayal", "anger", "friendship"]

"nothing feels meaningful lately"
→ ["existential dread", "purposelessness", "introspection"]

"my parents are getting old and I feel something"
→ ["reminiscence", "time passing", "quiet despair"]

"I'm so in love I can't think straight"
→ ["romantic love", "passion", "togetherness"]

"we won after years of hard work"
→ ["determination", "resilience", "togetherness"]

"working late night"
→ ["late night calm", "introspection", "stillness"]

"partying with friends"
→ ["carefree", "festive", "friendship"]

"gym, workout, getting things done"
→ ["determination", "resilience", "hope"]

"I miss home"
→ ["homesickness", "reminiscence", "loneliness"]

"thinking about someone I never confessed to"
→ ["unspoken feelings", "unrequited love", "introspection"]

"sitting alone after everyone slept"
→ ["solitude", "late night calm", "stillness"]

"trying to move on after a breakup"
→ ["moving on", "healing", "heartbreak"]

"feeling emotionally numb lately"
→ ["numbness", "emptiness", "solitude"]

"watching old photos and remembering better days"
→ ["reminiscence", "bittersweet", "time passing"]

"I want to disappear for a while"
→ ["lost", "quiet despair", "solitude"]

"long drive with friends at night"
→ ["carefree", "companionship", "live in the moment"]

"waiting for their text all night"
→ ["waiting", "aching for a lover", "restlessness"]

"angry but too tired to react anymore"
→ ["frustration", "numbness", "disillusionment"]

Return ONLY valid JSON:
{{
  "mood_tags": ["tag1", "tag2", "tag3"],
  "emotional_description": "3 concise sentences.
Expand the user's emotional state ONLY slightly
to help semantic retrieval.
Stay literal and grounded.
Do not dramatize, romanticize, or exaggerate."
}}
"""

async def extract_mood(user_prompt: str) -> dict:
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.4,
        max_tokens=300,
    )

    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    parsed = json.loads(raw)

    parsed["mood_tags"] = [
        tag for tag in parsed.get("mood_tags", [])
        if tag in MOOD_TAG_LIST
    ]

    return parsed

async def filter_candidates(user_prompt: str, mood_tags: list[str], candidates: list[dict]) -> list[dict]:
    candidates_text = ""
    for i, song in enumerate(candidates):
        candidates_text += f"{i}. {song['song']} - tags: {song['mood_tags']}\n"

    # Build explicit exclusion rules from user tags
    exclusions = []
    if "friendship" in mood_tags or "companionship" in mood_tags:
        exclusions.append("do NOT pick songs that have 'romantic love' or 'heartbreak' as tags UNLESS they also have 'friendship' or 'companionship'")
    if "festive" in mood_tags or "carefree" in mood_tags:
        exclusions.append("do NOT pick songs with 'grief', 'heartbreak', or 'quiet despair'")
    if "heartbreak" in mood_tags or "grief" in mood_tags:
        exclusions.append("do NOT pick songs with 'festive' or 'carefree'")
    if "family" in mood_tags:
        exclusions.append("do NOT pick songs with 'romantic love' unless 'family' is also in their tags")

    exclusion_text = "\n".join(f"- {e}" for e in exclusions) if exclusions else "- use common sense"

    prompt = f"""User said: "{user_prompt}"

Candidates:
{candidates_text}

HARD RULES (non-negotiable):
{exclusion_text}

Pick exactly 2 indices that best match the user. Return ONLY a JSON array. Example: [0, 2]"""

    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a strict music filter. Follow the hard rules exactly. Return only a JSON array of 2 integers."
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.0,
        max_tokens=20,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    indices = json.loads(raw)
    return [candidates[i] for i in indices if i < len(candidates)]

import json
from pathlib import Path

DATA_PATH = Path(__file__).parent / "../data/songs.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    all_songs = {song["song"]: song for song in json.load(f)}

def get_lyrics_preview(song, max_chars=200):
    raw = song.get("lyrics_snippet", "")
    if not raw:
        return ""
    # clean any stray whitespace/newlines
    cleaned = " ".join(raw.split())
    # take first max_chars, cut cleanly at last "/"
    if len(cleaned) <= max_chars:
        return cleaned
    truncated = cleaned[:max_chars]
    cut = truncated.rfind("/")
    return truncated[:cut].strip() if cut != -1 else truncated.strip()

def get_judge_prompt(
    user_prompt,
    emotional_description,
    query_tags,
    candidates
):

    songs_text = ""

    for i, song in enumerate(candidates, start=1):
        lyrics_preview = get_lyrics_preview(all_songs.get(song["song"], {}))
        songs_text += f"""
    SONG {i}
    Mood Tags: {", ".join(song['mood_tags'])}
    Emotional Summary: {song['emotional_summary']}
    Lyrics Preview: {lyrics_preview}
    """

    return f"""
You are an emotionally intelligent music judge.

The recommendation system has already narrowed the search
to the top candidate songs.

Your task is to select the TWO songs that best match
the user's actual emotional state right now.

HOW TO DECIDE:
- Start with the USER PROMPT. Take it literally and seriously.
  Do not read deeper meaning into it than what is there.
- Use the EMOTIONAL DESCRIPTION to understand nuance and context.
- Use the LYRICS PREVIEW as the strongest signal —
  it tells you the actual emotional texture and tone of the song.
- Use MOOD TAGS and EMOTIONAL SUMMARIES only to confirm fit.
- Pick songs whose emotional world genuinely matches
  where the user is, not where you think they might secretly be.
- Prefer warmth and accuracy over drama and intensity.
- A simple feeling deserves a simple match. Do not over-romanticize.

IMPORTANT RULES:
- Do NOT mention artist names
- Do NOT invent musical details
- Do NOT hallucinate themes not present in the provided data
- Write grounded, emotionally honest explanations
- Maximum 2-3 sentences per song

USER PROMPT:
{user_prompt}

EMOTIONAL DESCRIPTION:
{emotional_description}

MOOD TAGS:
{", ".join(query_tags)}

CANDIDATE SONGS:
{songs_text}

Return ONLY valid JSON:

{{
  "selected_indices": [0, 2],
  "song_1_reason": "...",
  "song_2_reason": "..."
}}
"""
async def judge_candidates(
    user_prompt,
    emotional_description,
    query_tags,
    candidates
):

    prompt = get_judge_prompt(
        user_prompt,
        emotional_description,
        query_tags,
        candidates
    )

    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an emotionally intelligent music guide. "
                    "Return ONLY valid JSON."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.5,
        max_tokens=220,
    )

    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]

        if raw.startswith("json"):
            raw = raw[4:]

    raw = raw.strip()

    try:
        return json.loads(raw)

    except Exception:


        return {
            "selected_indices": list(
                range(min(2, len(candidates)))
            ),

            "song_1_reason": "",
            "song_2_reason": ""
        }