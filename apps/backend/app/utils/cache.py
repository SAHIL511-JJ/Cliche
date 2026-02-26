import json
from typing import Optional, Any
from datetime import datetime, timedelta

from app.config import get_settings

settings = get_settings()

redis_module = None
try:
    import redis as redis_module

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class CacheBackend:
    def __init__(self):
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._redis_client: Any = None

        if REDIS_AVAILABLE and redis_module and settings.redis_url:
            try:
                self._redis_client = redis_module.from_url(settings.redis_url)
            except Exception:
                pass

    def get(self, key: str) -> Optional[Any]:
        if self._redis_client:
            try:
                value = self._redis_client.get(key)
                if value:
                    return json.loads(value)
            except Exception:
                pass

        if key in self._cache:
            value, expires_at = self._cache[key]
            if datetime.now() < expires_at:
                return value
            del self._cache[key]

        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        if self._redis_client:
            try:
                self._redis_client.setex(key, ttl_seconds, json.dumps(value))
                return
            except Exception:
                pass

        expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
        self._cache[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        if self._redis_client:
            try:
                self._redis_client.delete(key)
            except Exception:
                pass

        if key in self._cache:
            del self._cache[key]

    def delete_pattern(self, pattern: str) -> None:
        if self._redis_client:
            try:
                keys = self._redis_client.keys(pattern)
                if keys and len(keys) > 0:
                    self._redis_client.delete(*keys)
            except Exception:
                pass

        pattern_prefix = pattern.replace("*", "")
        keys_to_delete = [k for k in self._cache.keys() if pattern_prefix in k]
        for key in keys_to_delete:
            del self._cache[key]


cache = CacheBackend()


def cache_key_post(post_id: str) -> str:
    return f"post:{post_id}"


def cache_key_feed(feed_type: str) -> str:
    return f"feed:{feed_type}"


def cache_key_results(post_id: str) -> str:
    return f"results:{post_id}"


def invalidate_post_cache(post_id: str) -> None:
    cache.delete(cache_key_post(post_id))
    cache.delete(cache_key_results(post_id))
    cache.delete_pattern("feed:*")


def get_cached_feed(feed_type: str) -> Optional[list[dict]]:
    return cache.get(cache_key_feed(feed_type))


def set_cached_feed(feed_type: str, posts: list[dict], ttl: int = 300) -> None:
    cache.set(cache_key_feed(feed_type), posts, ttl)


def get_cached_post(post_id: str) -> Optional[dict]:
    return cache.get(cache_key_post(post_id))


def set_cached_post(post_id: str, post: dict, ttl: int = 300) -> None:
    cache.set(cache_key_post(post_id), post, ttl)


def get_cached_results(post_id: str) -> Optional[dict]:
    return cache.get(cache_key_results(post_id))


def set_cached_results(post_id: str, results: dict, ttl: int = 300) -> None:
    cache.set(cache_key_results(post_id), results, ttl)
