from datetime import date as _date
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.models.entry import Entry
from app.models.entry_message import EntryMessage, MessageRole
from app.models.user import User
from app.schemas.entry import EntryCreate, EntryUpdate


def create_entry(db: Session, user: User, payload: EntryCreate) -> Entry:
    """Create a new diary entry for the given user."""
    settings = get_settings()
    entry = Entry(
        user_id=user.id,
        entry_date=payload.entry_date or _date.today(),
        city=payload.city.strip(),
        mood=payload.mood.strip(),
        outfit_worn=(payload.outfit_worn.strip() if payload.outfit_worn else None) or None,
        model=settings.llm_model,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_owned_entry_or_404(db: Session, user: User, entry_id: int) -> Entry:
    """Return the entry if it belongs to the user, else raise HTTP 404."""
    from fastapi import HTTPException, status

    entry = db.get(Entry, entry_id)
    if entry is None or entry.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry


def list_entries(
    db: Session, user: User, *, limit: int, offset: int
) -> list[tuple[Entry, str | None]]:
    """Return (entry, ai_preview) pairs for the user, newest first."""
    stmt = (
        select(Entry)
        .where(Entry.user_id == user.id)
        .options(selectinload(Entry.messages))
        .order_by(Entry.entry_date.desc(), Entry.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    entries = db.scalars(stmt).all()

    def _preview(e: Entry) -> str | None:
        for msg in reversed(e.messages):
            if msg.role == MessageRole.assistant:
                return msg.content[:120]
        return None

    return [(e, _preview(e)) for e in entries]


def update_entry(db: Session, entry: Entry, payload: EntryUpdate) -> Entry:
    """Apply PATCH fields to an entry and persist."""
    if payload.outfit_worn is not None:
        entry.outfit_worn = payload.outfit_worn or None
    if payload.reflection is not None:
        entry.reflection = payload.reflection or None
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, entry: Entry) -> None:
    """Delete an entry and its messages (cascade handles messages)."""
    db.delete(entry)
    db.commit()
