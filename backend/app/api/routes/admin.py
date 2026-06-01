"""Admin-only endpoints."""
from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping")
def admin_ping(current_user: User = Depends(require_admin)) -> dict:
    """Health-check endpoint restricted to admin users."""
    return {"pong": True}
