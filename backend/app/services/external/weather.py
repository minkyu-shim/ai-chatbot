from __future__ import annotations
import asyncio
import json
from typing import Any
import httpx
from cachetools import TTLCache
from app.config import get_settings

class WeatherServiceError(Exception):
    """Raised when OpenWeatherMap is unreachable, returns non-200, or rejects the city."""

_cache: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=256, ttl=600)
_cache_lock = asyncio.Lock()

async def fetch_weather(city: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.openweather_api_key:
        raise WeatherServiceError("OpenWeatherMap API key is not configured")
    key = city.strip().lower()
    if not key:
        raise WeatherServiceError("City must not be blank")
    async with _cache_lock:
        cached = _cache.get(key)
    if cached is not None:
        return cached
    url = f"{settings.openweather_base_url}/weather"
    params = {"q": city.strip(), "appid": settings.openweather_api_key, "units": "metric"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
    except httpx.HTTPError as e:
        raise WeatherServiceError(f"Weather service unreachable: {e}") from e
    if resp.status_code == 404:
        raise WeatherServiceError(f"City not found: {city!r}")
    if resp.status_code >= 400:
        raise WeatherServiceError(f"Weather service returned {resp.status_code}: {resp.text[:200]}")
    payload = resp.json()
    snapshot = _snapshot_from_payload(city.strip(), payload)
    async with _cache_lock:
        _cache[key] = snapshot
    return snapshot

def _snapshot_from_payload(city: str, payload: dict[str, Any]) -> dict[str, Any]:
    weather_list = payload.get("weather") or [{}]
    main = payload.get("main") or {}
    wind = payload.get("wind") or {}
    return {
        "city": city,
        "temp": main.get("temp"),
        "feels_like": main.get("feels_like"),
        "humidity": main.get("humidity"),
        "condition": (weather_list[0] or {}).get("main"),
        "description": (weather_list[0] or {}).get("description"),
        "wind_speed": wind.get("speed"),
        "raw": payload,
    }

def _reset_cache_for_tests() -> None:
    _cache.clear()
