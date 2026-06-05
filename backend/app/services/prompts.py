from __future__ import annotations
import json
from typing import Any
from app.llm.base import MessageDict
from app.models.entry import Entry

SYSTEM_PROMPT_TEMPLATE = """You are a personal outfit stylist embedded in a mood + weather diary. Given the user's current city, mood, live weather, and what they already wore (if anything), suggest a complete outfit (top, bottom, outer layer, footwear, optional accessory) calibrated to comfort and practicality. Be specific (e.g. "wool overshirt" not "jacket"). 4–7 short sentences, no bullet points, no markdown headers, no preamble. End with one sentence on how the recommendation suits their stated mood.

Recent diary history (most recent first):
{history_summary}
"""

USER_PROMPT_TEMPLATE = """City: {city}
Date: {entry_date}
Mood: {mood}
Weather: {temp}°C, {condition} — {description}, humidity {humidity}%, wind {wind_speed} m/s
Already wearing: {outfit_worn}

Suggest an outfit for today."""

def build_suggestion_messages(entry: Entry, history_summary: str) -> list[MessageDict]:
    weather = _parse_weather(entry.weather_json)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        city=entry.city,
        entry_date=entry.entry_date.isoformat(),
        mood=entry.mood,
        temp=_fmt(weather.get("temp"), "?"),
        condition=weather.get("condition") or "unknown",
        description=weather.get("description") or "n/a",
        humidity=_fmt(weather.get("humidity"), "?"),
        wind_speed=_fmt(weather.get("wind_speed"), "?"),
        outfit_worn=(entry.outfit_worn or "nothing yet"),
    )
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(history_summary=history_summary)
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

def render_user_prompt(entry: Entry) -> str:
    weather = _parse_weather(entry.weather_json)
    return USER_PROMPT_TEMPLATE.format(
        city=entry.city,
        entry_date=entry.entry_date.isoformat(),
        mood=entry.mood,
        temp=_fmt(weather.get("temp"), "?"),
        condition=weather.get("condition") or "unknown",
        description=weather.get("description") or "n/a",
        humidity=_fmt(weather.get("humidity"), "?"),
        wind_speed=_fmt(weather.get("wind_speed"), "?"),
        outfit_worn=(entry.outfit_worn or "nothing yet"),
    )

def _parse_weather(weather_json: str | None) -> dict[str, Any]:
    if not weather_json:
        return {}
    try:
        return json.loads(weather_json) or {}
    except json.JSONDecodeError:
        return {}

def _fmt(v: Any, default: str) -> str:
    if v is None:
        return default
    if isinstance(v, float):
        return f"{v:g}"
    return str(v)
