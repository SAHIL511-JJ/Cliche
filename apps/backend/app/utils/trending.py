from datetime import datetime, timedelta
from typing import Optional


def calculate_trending_score(
    vote_count: int,
    comment_count: int,
    created_at: datetime,
    recent_votes: int = 0,
    decay_factor: float = 1.5,
) -> float:
    now = datetime.now()
    age_hours = (now - created_at).total_seconds() / 3600

    age_decay = 1 / (1 + (age_hours / 24) ** decay_factor)

    recent_boost = recent_votes * 2

    base_score = vote_count + (comment_count * 0.5) + recent_boost

    return base_score * age_decay


def get_trending_order_clause() -> str:
    return """
        (
            vote_count + 
            (comment_count * 0.5) + 
            (
                SELECT COUNT(*) * 2 FROM votes 
                WHERE votes.post_id = posts.id 
                AND votes.created_at > NOW() - INTERVAL '6 hours'
            )
        ) * 
        (
            1.0 / (
                1 + (
                    EXTRACT(EPOCH FROM (NOW() - posts.created_at)) / 86400
                ) ^ 1.5
            )
        ) DESC,
        created_at DESC
    """


def get_hot_order_clause() -> str:
    return """
        LOG(GREATEST(vote_count, 1) + 1) +
        (
            EXTRACT(EPOCH FROM (posts.created_at - TIMESTAMP '2024-01-01')) / 45000
        ) DESC
    """


def parse_time_ago(time_str: str) -> Optional[datetime]:
    now = datetime.now()

    if time_str.endswith("h"):
        hours = int(time_str[:-1])
        return now - timedelta(hours=hours)
    elif time_str.endswith("d"):
        days = int(time_str[:-1])
        return now - timedelta(days=days)
    elif time_str.endswith("w"):
        weeks = int(time_str[:-1])
        return now - timedelta(weeks=weeks)

    return None
