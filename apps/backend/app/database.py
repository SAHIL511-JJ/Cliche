import asyncpg
import ssl as ssl_module
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

pool = None


def _get_ssl_context():
    """Create SSL context for external database connections (e.g. Supabase)."""
    if "localhost" in settings.database_url or "127.0.0.1" in settings.database_url:
        return None
    ctx = ssl_module.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl_module.CERT_NONE
    return ctx


async def init_db():
    global pool
    try:
        ssl_ctx = _get_ssl_context()
        pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=2,
            max_size=settings.database_pool_size,
            command_timeout=30,
            ssl=ssl_ctx,
        )
        logger.info("Database pool initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")
        logger.warning("App starting without DB — will retry on first request")
        pool = None


async def close_db():
    global pool
    if pool:
        await pool.close()


async def _ensure_pool():
    """Ensure pool is initialized, retry if it failed at startup."""
    global pool
    if pool is None:
        await init_db()
    if pool is None:
        raise Exception("Database connection unavailable. Check DATABASE_URL and network access.")


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    await _ensure_pool()
    async with pool.acquire() as conn:
        yield conn


@asynccontextmanager
async def get_db_connection():
    await _ensure_pool()
    async with pool.acquire() as conn:
        yield conn

