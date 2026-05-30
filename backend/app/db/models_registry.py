"""Central import point for every ORM model.

Alembic's env.py imports this module to populate `Base.metadata` before
running autogenerate. Whenever you add a new model under `app/models/`,
import it here.
"""
from app.db.base import Base  # re-export for convenience  # noqa: F401

# --- Register models below (one import per model module) ---
# Example (to be added in M2):
# from app.models import user  # noqa: F401
