import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from app.config import get_settings

settings = get_settings()

pool = None


async def init_db():
    global pool
    pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=settings.database_pool_size,
        max_size=settings.database_pool_size + settings.database_max_overflow,
        command_timeout=30,
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
