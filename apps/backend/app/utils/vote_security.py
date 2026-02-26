import hashlib
import os
import secrets
from fastapi import Request


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    return request.client.host if request.client else "unknown"


def generate_ip_hash(ip_address: str, post_id: str, salt: str = None) -> str:
    if salt is None:
        salt = os.getenv("HASH_SALT", "rateit-secret-salt")
    combined = f"{salt}:{ip_address}:{post_id}"
    return hashlib.sha256(combined.encode()).hexdigest()


def generate_creator_token() -> str:
    return secrets.token_urlsafe(32)


async def has_voted_by_ip(ip_hash: str, post_id: str, db) -> bool:
    query = "SELECT 1 FROM vote_locks WHERE ip_hash = $1 AND post_id = $2"
    result = await db.fetchval(query, ip_hash, post_id)
    return result is not None


def filter_profanity(text: str) -> str:
    banned_words = ["spam", "scam"]
    import re

    for word in banned_words:
        text = re.sub(
            rf"\b{re.escape(word)}\b", "*" * len(word), text, flags=re.IGNORECASE
        )
    return text


def sanitize_text(text: str) -> str:
    import re

    if not text:
        return text
    text = re.sub(r"<[^>]+>", "", text)
    text = filter_profanity(text)
    return text.strip()
