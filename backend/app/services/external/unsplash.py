from __future__ import annotations
import asyncio
import logging
import httpx
from cachetools import TTLCache
from app.config import get_settings

log = logging.getLogger(__name__)

_cache: TTLCache[tuple[str, str], str | None] = TTLCache(maxsize=256, ttl=600)
_cache_lock = asyncio.Lock()

async def fetch_outfit_photo(condition: str | None, mood: str | None) -> str | None:
    settings = get_settings()
    if not settings.unsplash_access_key:
        return None
    cond_key = (condition or "").strip().lower()
    mood_key = (mood or "").strip().lower()
    cache_key = (cond_key, mood_key)
    async with _cache_lock:
        if cache_key in _cache:
            return _cache[cache_key]
    query_parts = [p for p in ("outfit", cond_key, mood_key) if p]
    query = " ".join(query_parts) or "outfit"
    url = f"{settings.unsplash_base_url}/search/photos"
    params = {"query": query, "per_page": 1, "orientation": "portrait"}
    headers = {"Authorization": f"Client-ID {settings.unsplash_access_key}"}
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params=params, headers=headers)
        if resp.status_code >= 400:
            log.info("Unsplash returned %s for %r — degrading silently", resp.status_code, query)
            photo_url = None
        else:
            data = resp.json()
            results = data.get("results") or []
            if results:
                urls = (results[0] or {}).get("urls") or {}
                photo_url = urls.get("regular") or urls.get("small")
            else:
                photo_url = None
    except Exception as e:
        log.info("Unsplash fetch failed (%s) — degrading silently", e)
        photo_url = None
    async with _cache_lock:
        _cache[cache_key] = photo_url
    return photo_url

def _reset_cache_for_tests() -> None:
    _cache.clear()
