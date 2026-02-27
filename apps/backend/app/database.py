import asyncpg
import ssl as ssl_module
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from app.config import get_settings

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
    ssl_ctx = _get_ssl_context()
    pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=settings.database_pool_size,
        max_size=settings.database_pool_size + settings.database_max_overflow,
        command_timeout=30,
        ssl=ssl_ctx,
    )


async def close_db():
    global pool
    if pool:
        await pool.close()


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    global pool
    if pool is None:
        await init_db()
    async with pool.acquire() as conn:
        yield conn


@asynccontextmanager
async def get_db_connection():
    global pool
    if pool is None:
        await init_db()
    async with pool.acquire() as conn:
        yield conn
