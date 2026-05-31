"""Central import point for all ORM models.

Alembic's env.py imports this module to populate Base.metadata before
autogenerate. Add every new model module here.
"""
from app.db.base import Base  # noqa: F401

from app.models import user          # noqa: F401
from app.models import conversation  # noqa: F401
from app.models import message       # noqa: F401
