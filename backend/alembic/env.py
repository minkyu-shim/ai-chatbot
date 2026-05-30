"""Alembic environment.

Loads the SQLAlchemy URL from app.config (i.e. .env) instead of alembic.ini,
and points autogenerate at the metadata registered in
`app.db.models_registry`.
"""
from logging.config import fileConfig
import os
import sys

from alembic import context
from sqlalchemy import engine_from_config, pool

# --- Make the `app` package importable when alembic is run from backend/ ---
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.config import get_settings  # noqa: E402
from app.db.base import Base  # noqa: E402
import app.db.models_registry  # noqa: F401, E402  -- side-effect: registers models

# Alembic Config object provides access to alembic.ini values.
config = context.config

# Inject runtime DB URL.
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

# Configure Python logging from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL without a DB connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=url.startswith("sqlite"),  # batch mode = ALTER TABLE on SQLite
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (against a live DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=is_sqlite,  # required for SQLite ALTER TABLE support
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
