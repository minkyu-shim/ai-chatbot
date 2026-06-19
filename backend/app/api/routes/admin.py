"""Admin-only endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin, get_db
from app.models.entry import Entry
from app.models.user import User, User as UserModel
from app.schemas.entry import AdminEntrySummary

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping")
def admin_ping(current_user: User = Depends(require_admin)) -> dict:
    """Health-check endpoint restricted to admin users."""
    return {"pong": True}


@router.get("/entries", response_model=list[AdminEntrySummary])
def list_all_entries(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminEntrySummary]:
    """Return all entries across all users, ordered by created_at DESC."""
    stmt = (
        select(Entry, UserModel.email)
        .join(UserModel, Entry.user_id == UserModel.id)
        .order_by(Entry.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = db.execute(stmt).all()

    summaries = []
    for entry, user_email in rows:
        # Build a dict combining ORM fields with the joined email so Pydantic
        # has all required fields in one shot.
        entry_dict = {
            "id": entry.id,
            "user_email": user_email,
            "entry_date": entry.entry_date,
            "city": entry.city,
            "mood": entry.mood,
            "weather_json": entry.weather_json,
            "created_at": entry.created_at,
        }
        summaries.append(AdminEntrySummary.model_validate(entry_dict))
    return summaries
