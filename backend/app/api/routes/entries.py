"""CRUD endpoints for diary entries."""
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.entry import Entry
from app.models.user import User
from app.schemas.entry import EntryCreate, EntryOut, EntrySummary, EntryUpdate
from app.services import entry_service
from app.services.external.weather import fetch_weather, WeatherServiceError
from app.services.external.unsplash import fetch_outfit_photo
from app.services.suggestion_service import run_suggestion_stream

router = APIRouter(prefix="/entries", tags=["entries"])


@router.post("", response_model=EntryOut, status_code=status.HTTP_201_CREATED)
async def create_entry(
    body: EntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EntryOut:
    """Create a new diary entry, fetching live weather and an optional outfit photo."""
    try:
        weather = await fetch_weather(body.city)
    except WeatherServiceError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    photo_url = await fetch_outfit_photo(condition=weather.get("condition"), mood=body.mood)
    entry = entry_service.create_entry(db, current_user, body)
    entry.weather_json = json.dumps(weather)
    entry.photo_url = photo_url
    db.commit()
    db.refresh(entry)
    entry = db.scalar(
        select(Entry).where(Entry.id == entry.id).options(selectinload(Entry.messages))
    )
    return EntryOut.model_validate(entry)


@router.get("", response_model=list[EntrySummary], status_code=status.HTTP_200_OK)
def list_entries(
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EntrySummary]:
    """List the authenticated user's diary entries, newest first."""
    pairs = entry_service.list_entries(db, current_user, limit=limit, offset=offset)
    result = []
    for entry, preview in pairs:
        summary = EntrySummary.model_validate(entry)
        summary.ai_preview = preview
        result.append(summary)
    return result


@router.get("/{entry_id}", response_model=EntryOut, status_code=status.HTTP_200_OK)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EntryOut:
    """Retrieve a single diary entry with its messages."""
    # Validate ownership first, then reload with messages eager-loaded.
    entry_service.get_owned_entry_or_404(db, current_user, entry_id)
    entry = db.scalar(
        select(Entry)
        .where(Entry.id == entry_id)
        .options(selectinload(Entry.messages))
    )
    return EntryOut.model_validate(entry)


@router.patch("/{entry_id}", response_model=EntryOut, status_code=status.HTTP_200_OK)
def update_entry(
    entry_id: int,
    body: EntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EntryOut:
    """Update mutable fields (outfit_worn, reflection) on an entry."""
    entry = entry_service.get_owned_entry_or_404(db, current_user, entry_id)
    entry = entry_service.update_entry(db, entry, body)
    entry = db.scalar(
        select(Entry)
        .where(Entry.id == entry_id)
        .options(selectinload(Entry.messages))
    )
    return EntryOut.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Delete a diary entry and all its messages."""
    entry = entry_service.get_owned_entry_or_404(db, current_user, entry_id)
    entry_service.delete_entry(db, entry)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{entry_id}/suggest/stream", status_code=status.HTTP_200_OK)
async def suggest_stream(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Stream an LLM outfit suggestion for the given entry via SSE."""
    entry_service.get_owned_entry_or_404(db, current_user, entry_id)
    return StreamingResponse(
        run_suggestion_stream(entry_id, current_user.id),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
