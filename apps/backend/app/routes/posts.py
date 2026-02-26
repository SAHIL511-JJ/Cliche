from fastapi import APIRouter, Request, HTTPException, Depends, Query
from datetime import datetime, timedelta, timezone
import json

from app.database import get_db
from app.schemas import PostCreate
from app.utils import (
    get_client_ip,
    generate_ip_hash,
    generate_creator_token,
    sanitize_text,
    invalidate_post_cache,
)
from app.utils.trending import get_trending_order_clause

router = APIRouter(tags=["posts"])

VALID_POST_TYPES = ["poll", "wyr", "rate", "rank", "compare"]


def validate_post_items(post_type: str, items: list) -> None:
    if post_type == "wyr" and len(items) != 2:
        raise HTTPException(
            status_code=400, detail="Would You Rather posts require exactly 2 items"
        )

    if post_type in ["poll", "rank", "compare"]:
        if len(items) < 2 or len(items) > 4:
            raise HTTPException(
                status_code=400,
                detail=f"{post_type.capitalize()} posts require 2-4 items",
            )

    if post_type == "rate":
        if len(items) != 1:
            raise HTTPException(
                status_code=400, detail="Rate posts require exactly 1 item"
            )


@router.post("/posts")
async def create_post(post_data: PostCreate, request: Request, db=Depends(get_db)):
    client_ip = get_client_ip(request)
    creator_token = generate_creator_token()
    browser_id = request.headers.get("X-Browser-ID")

    if post_data.type not in VALID_POST_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid post type. Must be one of: {', '.join(VALID_POST_TYPES)}",
        )

    validate_post_items(post_data.type, post_data.items)

    if post_data.type in ["rate", "compare"]:
        if not post_data.attributes or len(post_data.attributes) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"{post_data.type.capitalize()} posts require at least one attribute",
            )

    expires_at = None
    if post_data.expires_at:
        # Use direct datetime if provided
        expires_at = post_data.expires_at
    elif post_data.expires_in_hours:
        # Fallback to hours calculation
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=post_data.expires_in_hours
        )
    
    # Validate expires_at is in the future
    if expires_at and expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Expiration time must be in the future"
        )

    caption = sanitize_text(post_data.caption) if post_data.caption else None

    async with db.transaction():
        post_id = await db.fetchval(
            """
            INSERT INTO posts (type, caption, attributes, expires_at, creator_token, browser_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            post_data.type,
            caption,
            json.dumps(post_data.attributes) if post_data.attributes else None,
            expires_at,
            creator_token,
            browser_id,
        )

        for idx, item in enumerate(post_data.items):
            name = sanitize_text(item.name)
            if not name:
                raise HTTPException(
                    status_code=400, detail="Each item must have a name"
                )

            image_url = item.image_base64 or item.image_url or None

            await db.execute(
                """
                INSERT INTO items (post_id, name, image_url, order_index)
                VALUES ($1, $2, $3, $4)
                """,
                post_id,
                name,
                image_url,
                idx,
            )

    return {
        "success": True,
        "data": {
            "id": str(post_id),
            "share_url": f"https://rateapp.com/p/{post_id}",
            "creator_token": creator_token,
        },
    }


@router.get("/posts")
async def get_posts(
    request: Request,
    type: str = Query("trending", pattern="^(trending|recent|random)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=20),
    db=Depends(get_db),
):
    client_ip = get_client_ip(request)
    offset = (page - 1) * limit

    if type == "trending":
        order_clause = get_trending_order_clause()
    elif type == "recent":
        order_clause = "created_at DESC"
    else:
        order_clause = "RANDOM()"

    posts = await db.fetch(
        f"""
        SELECT id, type, caption, vote_count, comment_count, expires_at, created_at
        FROM posts
        WHERE is_removed = FALSE
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY {order_clause}
        LIMIT $1 OFFSET $2
        """,
        limit,
        offset,
    )

    total = await db.fetchval(
        """
        SELECT COUNT(*) FROM posts
        WHERE is_removed = FALSE
          AND (expires_at IS NULL OR expires_at > NOW())
        """
    )

    result_posts = []
    for post in posts:
        post_id = post["id"]
        ip_hash = generate_ip_hash(client_ip, str(post_id))

        has_voted = await db.fetchval(
            "SELECT 1 FROM vote_locks WHERE ip_hash = $1 AND post_id = $2",
            ip_hash,
            post_id,
        )

        items = await db.fetch(
            """
            SELECT id, name, image_url, vote_count
            FROM items WHERE post_id = $1 ORDER BY order_index
            """,
            post_id,
        )

        items_data = []
        for item in items:
            avg_scores = None
            if post["type"] in ["rate", "compare"] and item["vote_count"] > 0:
                avg_scores = await calculate_avg_scores(db, item["id"])

            items_data.append(
                {
                    "id": str(item["id"]),
                    "name": item["name"],
                    "image_url": item["image_url"],
                    "vote_count": item["vote_count"],
                    "avg_scores": avg_scores,
                }
            )

        result_posts.append(
            {
                "id": str(post_id),
                "type": post["type"],
                "caption": post["caption"],
                "items": items_data,
                "vote_count": post["vote_count"],
                "comment_count": post["comment_count"],
                "has_voted": has_voted is not None,
                "expires_at": post["expires_at"].isoformat()
                if post["expires_at"]
                else None,
                "created_at": post["created_at"].isoformat(),
            }
        )

    return {
        "success": True,
        "data": {
            "posts": result_posts,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "has_more": offset + len(posts) < total,
            },
        },
    }


@router.get("/posts/{post_id}")
async def get_post(post_id: str, request: Request, db=Depends(get_db)):
    client_ip = get_client_ip(request)
    ip_hash = generate_ip_hash(client_ip, post_id)

    post = await db.fetchrow(
        """
        SELECT id, type, caption, attributes, vote_count, comment_count, expires_at, created_at
        FROM posts WHERE id = $1 AND is_removed = FALSE
        """,
        post_id,
    )

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post["expires_at"] and post["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Post has expired")

    has_voted = await db.fetchval(
        "SELECT 1 FROM vote_locks WHERE ip_hash = $1 AND post_id = $2", ip_hash, post_id
    )

    items = await db.fetch(
        """
        SELECT id, name, image_url, vote_count, total_score
        FROM items WHERE post_id = $1 ORDER BY order_index
        """,
        post_id,
    )

    items_data = []
    for item in items:
        avg_scores = None
        if post["type"] in ["rate", "compare"] and item["vote_count"] > 0:
            avg_scores = await calculate_avg_scores(db, item["id"])

        items_data.append(
            {
                "id": str(item["id"]),
                "name": item["name"],
                "image_url": item["image_url"],
                "vote_count": item["vote_count"],
                "avg_scores": avg_scores,
            }
        )

    return {
        "success": True,
        "data": {
            "id": str(post["id"]),
            "type": post["type"],
            "caption": post["caption"],
            "attributes": json.loads(post["attributes"])
            if post["attributes"]
            else None,
            "items": items_data,
            "vote_count": post["vote_count"],
            "comment_count": post["comment_count"],
            "has_voted": has_voted is not None,
            "expires_at": post["expires_at"].isoformat()
            if post["expires_at"]
            else None,
            "created_at": post["created_at"].isoformat(),
        },
    }


@router.get("/posts/{post_id}")
async def get_post(post_id: str, request: Request, db=Depends(get_db)):
    client_ip = get_client_ip(request)
    ip_hash = generate_ip_hash(client_ip, post_id)

    post = await db.fetchrow(
        """
        SELECT id, type, caption, attributes, vote_count, comment_count, expires_at, created_at
        FROM posts WHERE id = $1 AND is_removed = FALSE
        """,
        post_id,
    )

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post["expires_at"] and post["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Post has expired")

    has_voted = await db.fetchval(
        "SELECT 1 FROM vote_locks WHERE ip_hash = $1 AND post_id = $2", ip_hash, post_id
    )

    items = await db.fetch(
        """
        SELECT id, name, image_url, vote_count, total_score
        FROM items WHERE post_id = $1 ORDER BY order_index
        """,
        post_id,
    )

    items_data = []
    for item in items:
        avg_scores = None
        if post["type"] in ["rate", "compare"] and item["vote_count"] > 0:
            avg_scores = await calculate_avg_scores(db, item["id"])

        items_data.append(
            {
                "id": str(item["id"]),
                "name": item["name"],
                "image_url": item["image_url"],
                "vote_count": item["vote_count"],
                "avg_scores": avg_scores,
            }
        )

    return {
        "success": True,
        "data": {
            "id": str(post["id"]),
            "type": post["type"],
            "caption": post["caption"],
            "attributes": json.loads(post["attributes"])
            if post["attributes"]
            else None,
            "items": items_data,
            "vote_count": post["vote_count"],
            "comment_count": post["comment_count"],
            "has_voted": has_voted is not None,
            "expires_at": post["expires_at"].isoformat()
            if post["expires_at"]
            else None,
            "created_at": post["created_at"].isoformat(),
        },
    }


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str, 
    request: Request, 
    creator_token: str = Query(None), 
    db=Depends(get_db)
):
    """
    Delete a post. Supports two methods:
    1. Using creator_token (legacy method) - via query parameter
    2. Using browser_id (new method) - via header (user can delete their own posts)
    """
    browser_id = request.headers.get("X-Browser-ID")
    
    # Try to delete using browser_id first (if available)
    if browser_id:
        result = await db.execute(
            """
            UPDATE posts SET is_removed = TRUE
            WHERE id = $1 AND browser_id = $2
            """,
            post_id,
            browser_id,
        )
        
        if result != "UPDATE 0":
            invalidate_post_cache(post_id)
            return {"success": True, "message": "Post deleted"}
    
    # Fallback to creator_token method
    if creator_token:
        result = await db.execute(
            """
            UPDATE posts SET is_removed = TRUE
            WHERE id = $1 AND creator_token = $2
            """,
            post_id,
            creator_token,
        )

        if result != "UPDATE 0":
            invalidate_post_cache(post_id)
            return {"success": True, "message": "Post deleted"}

    raise HTTPException(status_code=404, detail="Post not found or unauthorized")


@router.get("/users/activity")
async def get_user_activity(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=20),
    db=Depends(get_db)
):
    """
    Fetch all posts the user has voted on.
    Uses browser_id from header and ip_hash for identification.
    Returns both live and ended posts.
    """
    browser_id = request.headers.get("X-Browser-ID")
    client_ip = get_client_ip(request)
    
    if not browser_id:
        raise HTTPException(
            status_code=400,
            detail="Browser ID is required for activity history"
        )
    
    offset = (page - 1) * limit
    
    # Get user's voted posts
    posts = await db.fetch(
        """
        SELECT DISTINCT p.id, p.type, p.caption, p.vote_count, p.comment_count, 
               p.expires_at, p.created_at, v.created_at as user_voted_at
        FROM posts p
        INNER JOIN votes v ON p.id = v.post_id
        WHERE (v.browser_id = $1 OR v.ip_hash = $2)
          AND p.is_removed = FALSE
        ORDER BY v.created_at DESC
        LIMIT $3 OFFSET $4
        """,
        browser_id,
        generate_ip_hash(client_ip, ""),  # Use empty string for activity tracking
        limit,
        offset,
    )
    
    total = await db.fetchval(
        """
        SELECT COUNT(DISTINCT p.id)
        FROM posts p
        INNER JOIN votes v ON p.id = v.post_id
        WHERE (v.browser_id = $1 OR v.ip_hash = $2)
          AND p.is_removed = FALSE
        """,
        browser_id,
        generate_ip_hash(client_ip, ""),
    )
    
    result_posts = []
    now = datetime.now(timezone.utc)
    for post in posts:
        post_id = post["id"]
        
        items = await db.fetch(
            """
            SELECT id, name, image_url, vote_count
            FROM items WHERE post_id = $1 ORDER BY order_index
            """,
            post_id,
        )
        
        items_data = []
        for item in items:
            items_data.append(
                {
                    "id": str(item["id"]),
                    "name": item["name"],
                    "image_url": item["image_url"],
                    "vote_count": item["vote_count"],
                }
            )
        
        is_expired = post["expires_at"] and post["expires_at"] < now
        
        result_posts.append(
            {
                "id": str(post_id),
                "type": post["type"],
                "caption": post["caption"],
                "items": items_data,
                "vote_count": post["vote_count"],
                "comment_count": post["comment_count"],
                "expires_at": post["expires_at"].isoformat()
                if post["expires_at"]
                else None,
                "created_at": post["created_at"].isoformat(),
                "is_expired": is_expired,
                "user_voted_at": post["user_voted_at"].isoformat(),
            }
        )
    
    return {
        "success": True,
        "data": {
            "posts": result_posts,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "has_more": offset + len(posts) < total,
            },
        },
    }


@router.get("/users/my-posts")
async def get_user_own_posts(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=20),
    db=Depends(get_db)
):
    """
    Fetch all posts created by the user.
    Uses browser_id from header for identification.
    Returns both active and removed posts (user can see their own removed posts).
    """
    browser_id = request.headers.get("X-Browser-ID")
    client_ip = get_client_ip(request)

    if not browser_id:
        raise HTTPException(
            status_code=400,
            detail="Browser ID is required for viewing your posts"
        )

    offset = (page - 1) * limit

    # Get user's created posts
    posts = await db.fetch(
        """
        SELECT p.id, p.type, p.caption, p.vote_count, p.comment_count,
               p.expires_at, p.created_at, p.is_removed
        FROM posts p
        WHERE p.browser_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
        """,
        browser_id,
        limit,
        offset,
    )

    total = await db.fetchval(
        """
        SELECT COUNT(*) FROM posts
        WHERE browser_id = $1
        """,
        browser_id,
    )

    result_posts = []
    now = datetime.now(timezone.utc)
    for post in posts:
        post_id = post["id"]

        items = await db.fetch(
            """
            SELECT id, name, image_url, vote_count
            FROM items WHERE post_id = $1 ORDER BY order_index
            """,
            post_id,
        )

        items_data = []
        for item in items:
            items_data.append(
                {
                    "id": str(item["id"]),
                    "name": item["name"],
                    "image_url": item["image_url"],
                    "vote_count": item["vote_count"],
                }
            )

        is_expired = post["expires_at"] and post["expires_at"] < now

        result_posts.append(
            {
                "id": str(post_id),
                "type": post["type"],
                "caption": post["caption"],
                "items": items_data,
                "vote_count": post["vote_count"],
                "comment_count": post["comment_count"],
                "expires_at": post["expires_at"].isoformat()
                if post["expires_at"]
                else None,
                "created_at": post["created_at"].isoformat(),
                "is_expired": is_expired,
                "is_removed": post["is_removed"],
            }
        )

    return {
        "success": True,
        "data": {
            "posts": result_posts,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "has_more": offset + len(posts) < total,
            },
        },
    }


async def calculate_avg_scores(db, item_id: str) -> dict:
    votes = await db.fetch(
        "SELECT ratings FROM votes WHERE item_id = $1 AND ratings IS NOT NULL", item_id
    )

    if not votes:
        return {}

    score_sums = {}
    score_counts = {}

    for vote in votes:
        ratings = json.loads(vote["ratings"]) if vote["ratings"] else {}
        for attr, score in ratings.items():
            if attr not in score_sums:
                score_sums[attr] = 0
                score_counts[attr] = 0
            score_sums[attr] += score
            score_counts[attr] += 1

    return {
        attr: round(score_sums[attr] / score_counts[attr], 1) for attr in score_sums
    }
