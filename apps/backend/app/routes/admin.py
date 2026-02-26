from fastapi import APIRouter, Depends, HTTPException, Query, Request
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import json

from app.database import get_db
from app.config import get_settings
from app.utils import get_client_ip, invalidate_post_cache

router = APIRouter(prefix="/admin", tags=["admin"])


async def verify_admin(request: Request, db=Depends(get_db)):
    """Verify admin session using browser_id"""
    browser_id = request.headers.get("X-Browser-ID")
    if not browser_id:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    # Check if this browser_id has admin session
    # For simplicity, we check if admin login was done from same browser
    # In production, you might want to use a more secure session management
    admin_session = await db.fetchval(
        "SELECT 1 FROM admin_sessions WHERE browser_id = $1 AND expires_at > NOW() LIMIT 1",
        browser_id
    )
    if not admin_session:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    return True


class LoginRequest(BaseModel):
    secret: str


@router.post("/login")
async def admin_login(login_data: LoginRequest, request: Request, db=Depends(get_db)):
    settings = get_settings()
    browser_id = request.headers.get("X-Browser-ID")

    if login_data.secret == settings.admin_secret:
        if browser_id:
            # Create admin session
            from datetime import timezone
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            await db.execute(
                """
                INSERT INTO admin_sessions (browser_id, expires_at)
                VALUES ($1, $2)
                ON CONFLICT (browser_id) DO UPDATE SET expires_at = $2
                """,
                browser_id,
                expires_at
            )
        return {"success": True, "message": "Admin authenticated"}
    else:
        raise HTTPException(status_code=401, detail="Invalid admin secret")


@router.get("/stats")
async def get_admin_stats(db=Depends(get_db)):
    total_posts = await db.fetchval("SELECT COUNT(*) FROM posts")

    active_posts = await db.fetchval(
        """
        SELECT COUNT(*) FROM posts
        WHERE is_removed = FALSE
          AND (expires_at IS NULL OR expires_at > NOW())
        """
    )

    total_votes = await db.fetchval("SELECT COUNT(*) FROM votes")

    votes_today = await db.fetchval(
        """
        SELECT COUNT(*) FROM votes
        WHERE created_at > NOW() - INTERVAL '24 hours'
        """
    )

    posts_today = await db.fetchval(
        """
        SELECT COUNT(*) FROM posts
        WHERE created_at > NOW() - INTERVAL '24 hours'
        """
    )

    pending_reports = await db.fetchval(
        """
        SELECT COUNT(*) FROM posts
        WHERE report_count > 0 AND is_removed = FALSE
        """
    )

    post_types = await db.fetch(
        """
        SELECT type, COUNT(*) as count
        FROM posts
        WHERE is_removed = FALSE
        GROUP BY type
        """
    )

    return {
        "success": True,
        "data": {
            "total_posts": total_posts,
            "active_posts": active_posts,
            "total_votes": total_votes,
            "votes_today": votes_today,
            "posts_today": posts_today,
            "pending_reports": pending_reports,
            "post_types": {row["type"]: row["count"] for row in post_types},
        },
    }


@router.get("/posts/reported")
async def get_reported_posts(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db=Depends(get_db),
):
    browser_id = request.headers.get("X-Browser-ID")
    if not browser_id:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    offset = (page - 1) * limit

    posts = await db.fetch(
        """
        SELECT p.id, p.type, p.caption, p.vote_count, p.report_count, p.created_at,
               (SELECT COUNT(*) FROM items WHERE post_id = p.id) as item_count
        FROM posts p
        WHERE p.report_count > 0 AND p.is_removed = FALSE
        ORDER BY p.report_count DESC, p.created_at DESC
        LIMIT $1 OFFSET $2
        """,
        limit,
        offset,
    )

    total = await db.fetchval(
        """
        SELECT COUNT(*) FROM posts
        WHERE report_count > 0 AND is_removed = FALSE
        """
    )

    return {
        "success": True,
        "data": {
            "posts": [
                {
                    "id": str(post["id"]),
                    "type": post["type"],
                    "caption": post["caption"],
                    "vote_count": post["vote_count"],
                    "report_count": post["report_count"],
                    "item_count": post["item_count"],
                    "created_at": post["created_at"].isoformat(),
                }
                for post in posts
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "has_more": offset + len(posts) < total,
            },
        },
    }


@router.get("/posts")
async def get_all_posts(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db=Depends(get_db),
):
    """Get all posts (for admin). Includes items data."""
    # For simplicity, just check if browser_id exists
    # In production, you should verify admin session
    browser_id = request.headers.get("X-Browser-ID")
    if not browser_id:
        raise HTTPException(status_code=401, detail="Admin authentication required")

    offset = (page - 1) * limit

    posts = await db.fetch(
        """
        SELECT p.id, p.type, p.caption, p.vote_count, p.comment_count,
               p.report_count, p.created_at, p.expires_at, p.is_removed
        FROM posts p
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
        """,
        limit,
        offset,
    )

    total = await db.fetchval("SELECT COUNT(*) FROM posts")

    result_posts = []
    for post in posts:
        post_id = post["id"]

        items = await db.fetch(
            """
            SELECT id, name, image_url, vote_count
            FROM items WHERE post_id = $1 ORDER BY order_index
            """,
            post_id,
        )

        items_data = [
            {
                "id": str(item["id"]),
                "name": item["name"],
                "image_url": item["image_url"],
                "vote_count": item["vote_count"],
            }
            for item in items
        ]

        result_posts.append(
            {
                "id": str(post_id),
                "type": post["type"],
                "caption": post["caption"],
                "items": items_data,
                "vote_count": post["vote_count"],
                "comment_count": post["comment_count"],
                "report_count": post["report_count"],
                "is_removed": post["is_removed"],
                "expires_at": post["expires_at"].isoformat() if post["expires_at"] else None,
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


@router.delete("/posts/{post_id}")
async def admin_delete_post(post_id: str, request: Request, db=Depends(get_db)):
    """Admin delete any post (bypasses creator token check)."""
    browser_id = request.headers.get("X-Browser-ID")
    if not browser_id:
        raise HTTPException(status_code=401, detail="Admin authentication required")

    result = await db.execute(
        """
        UPDATE posts
        SET is_removed = TRUE
        WHERE id = $1
        """,
        post_id,
    )

    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Post not found")

    invalidate_post_cache(post_id)

    return {"success": True, "message": "Post removed by admin"}


@router.post("/posts/{post_id}/approve")
async def approve_post(post_id: str, db=Depends(get_db)):
    result = await db.execute(
        """
        UPDATE posts
        SET report_count = 0
        WHERE id = $1 AND is_removed = FALSE
        """,
        post_id,
    )

    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Post not found")

    return {"success": True, "message": "Post approved"}


@router.post("/posts/{post_id}/remove")
async def remove_post(post_id: str, db=Depends(get_db)):
    result = await db.execute(
        """
        UPDATE posts
        SET is_removed = TRUE
        WHERE id = $1
        """,
        post_id,
    )

    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Post not found")

    return {"success": True, "message": "Post removed"}


@router.get("/analytics/daily")
async def get_daily_analytics(
    days: int = Query(7, ge=1, le=30),
    db=Depends(get_db),
):
    posts_data = await db.fetch(
        """
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM posts
        WHERE created_at > NOW() - INTERVAL '%s days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        """
        % days
    )

    votes_data = await db.fetch(
        """
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM votes
        WHERE created_at > NOW() - INTERVAL '%s days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        """
        % days
    )

    return {
        "success": True,
        "data": {
            "posts": [
                {"date": str(row["date"]), "count": row["count"]} for row in posts_data
            ],
            "votes": [
                {"date": str(row["date"]), "count": row["count"]} for row in votes_data
            ],
        },
    }
