from __future__ import annotations
import json
import logging
from typing import AsyncIterator
from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.llm.factory import get_provider
from app.models.entry import Entry
from app.models.entry_message import EntryMessage, MessageRole
from app.models.user import User
from app.services import entry_service
from app.services.prompts import build_suggestion_messages, render_user_prompt

log = logging.getLogger(__name__)

def _sse(event: str, data: str) -> bytes:
    lines = data.split("\n")
    payload = "\n".join(f"data: {line}" for line in lines)
    return f"event: {event}\n{payload}\n\n".encode("utf-8")

async def run_suggestion_stream(entry_id: int, user_id: int) -> AsyncIterator[bytes]:
    db: Session = SessionLocal()
    try:
        entry = db.get(Entry, entry_id)
        if entry is None or entry.user_id != user_id:
            yield _sse("error", json.dumps({"detail": "Entry not found"}))
            return

        weather = json.loads(entry.weather_json) if entry.weather_json else None
        meta_payload = json.dumps({"weather": weather, "photo_url": entry.photo_url})
        yield _sse("meta", meta_payload)

        user = db.get(User, entry.user_id)
        history_summary = entry_service.build_history_summary(
            db, user, exclude_entry_id=entry.id, limit=5
        )
        messages = build_suggestion_messages(entry, history_summary)
        user_prompt_text = render_user_prompt(entry)

        user_msg = EntryMessage(
            entry_id=entry.id,
            role=MessageRole.user,
            content=user_prompt_text,
            metadata_json=None,
        )
        db.add(user_msg)
        db.commit()

        provider = get_provider()
        accumulated: list[str] = []
        try:
            async for chunk in provider.stream_chat(messages):
                accumulated.append(chunk)
                yield _sse("token", chunk)
        except Exception as exc:
            log.exception("LLM stream failed mid-way")
            if accumulated:
                _persist_assistant(db, entry, "".join(accumulated))
            yield _sse("error", json.dumps({"detail": f"LLM stream failed: {exc}"}))
            return

        full_content = "".join(accumulated)
        assistant_msg = _persist_assistant(db, entry, full_content)
        yield _sse("done", json.dumps({"message_id": assistant_msg.id}))
    finally:
        db.close()

def _persist_assistant(db: Session, entry: Entry, content: str) -> EntryMessage:
    metadata = {
        "weather": json.loads(entry.weather_json) if entry.weather_json else None,
        "photo_url": entry.photo_url,
    }
    msg = EntryMessage(
        entry_id=entry.id,
        role=MessageRole.assistant,
        content=content,
        metadata_json=json.dumps(metadata),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
