from fastapi import APIRouter, Request, HTTPException, Depends, Query
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.database import get_db
from app.schemas import CommentCreate, CommentEdit, ReactionRequest
from app.utils import get_client_ip, generate_ip_hash, sanitize_text
from app.utils.name_generator import get_or_create_display_name

router = APIRouter(tags=["comments"])

EDIT_WINDOW_MINUTES = 15


@router.get("/posts/{post_id}/comments")
async def get_comments(
    post_id: str,
    request: Request,
    parent_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db=Depends(get_db),
):
    client_ip = get_client_ip(request)
    ip_hash = generate_ip_hash(client_ip, post_id)
    offset = (page - 1) * limit

    post = await db.fetchrow(
        "SELECT id FROM posts WHERE id = $1 AND is_removed = FALSE", post_id
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if parent_id:
        parent = await db.fetchrow(
            "SELECT id FROM comments WHERE id = $1 AND post_id = $2", parent_id, post_id
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comments = await db.fetch(
        """
        SELECT c.id, c.content, c.display_name, c.parent_id, c.is_edited, 
               c.created_at, c.updated_at, c.ip_hash
        FROM comments c
        WHERE c.post_id = $1 
          AND c.is_removed = FALSE
          AND ($2::uuid IS NULL OR c.parent_id = $2)
          AND ($2::uuid IS NOT NULL OR c.parent_id IS NULL)
        ORDER BY c.created_at DESC
        LIMIT $3 OFFSET $4
        """,
        post_id,
        parent_id,
        limit,
        offset,
    )

    total = await db.fetchval(
        """
        SELECT COUNT(*) FROM comments
        WHERE post_id = $1 
          AND is_removed = FALSE
          AND ($2::uuid IS NULL OR parent_id = $2)
          AND ($2::uuid IS NOT NULL OR parent_id IS NULL)
        """,
        post_id,
        parent_id,
    )

    # Batch: get all reactions, reply counts, and user reactions in fewer queries
    comment_ids = [str(c["id"]) for c in comments]

    if comment_ids:
        # Batch reactions
        all_reactions = await db.fetch(
            """
            SELECT comment_id, reaction_type, COUNT(*) as count
            FROM comment_reactions
            WHERE comment_id = ANY($1::uuid[])
            GROUP BY comment_id, reaction_type
            """,
            comment_ids,
        )
        reactions_map: dict = {}
        for r in all_reactions:
            cid = str(r["comment_id"])
            if cid not in reactions_map:
                reactions_map[cid] = {"like": 0, "love": 0, "laugh": 0, "wow": 0, "sad": 0, "fire": 0}
            reactions_map[cid][r["reaction_type"]] = r["count"]

        # Batch reply counts
        reply_counts = await db.fetch(
            """
            SELECT parent_id, COUNT(*) as count
            FROM comments
            WHERE parent_id = ANY($1::uuid[]) AND is_removed = FALSE
            GROUP BY parent_id
            """,
            comment_ids,
        )
        reply_count_map = {str(r["parent_id"]): r["count"] for r in reply_counts}

        # Batch user reactions
        user_reactions = await db.fetch(
            """
            SELECT comment_id, reaction_type
            FROM comment_reactions
            WHERE comment_id = ANY($1::uuid[]) AND ip_hash = $2
            """,
            comment_ids,
            ip_hash,
        )
        user_reaction_map = {str(r["comment_id"]): r["reaction_type"] for r in user_reactions}
    else:
        reactions_map = {}
        reply_count_map = {}
        user_reaction_map = {}

    result_comments = []
    for comment in comments:
        cid = str(comment["id"])
        can_edit = False
        if comment["ip_hash"] == ip_hash:
            edit_deadline = comment["created_at"] + timedelta(minutes=EDIT_WINDOW_MINUTES)
            can_edit = datetime.now(timezone.utc) < edit_deadline

        result_comments.append({
            "id": cid,
            "content": comment["content"],
            "display_name": comment["display_name"],
            "parent_id": str(comment["parent_id"]) if comment["parent_id"] else None,
            "is_edited": comment["is_edited"],
            "replies_count": reply_count_map.get(cid, 0),
            "reactions": reactions_map.get(cid, {"like": 0, "love": 0, "laugh": 0, "wow": 0, "sad": 0, "fire": 0}),
            "user_reaction": user_reaction_map.get(cid, None),
            "can_edit": can_edit,
            "created_at": comment["created_at"].isoformat(),
        })

    return {
        "success": True,
        "data": {
            "comments": result_comments,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "has_more": offset + len(comments) < total,
            },
        },
    }


@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    request: Request,
    db=Depends(get_db),
):
    client_ip = get_client_ip(request)
    ip_hash = generate_ip_hash(client_ip, post_id)
    browser_id = request.headers.get("X-Browser-ID")

    post = await db.fetchrow(
        "SELECT id FROM posts WHERE id = $1 AND is_removed = FALSE", post_id
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if comment_data.parent_id:
        parent = await db.fetchrow(
            "SELECT id FROM comments WHERE id = $1 AND post_id = $2 AND is_removed = FALSE",
            comment_data.parent_id,
            post_id,
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    display_name = await get_or_create_display_name(ip_hash, post_id, db)

    content = sanitize_text(comment_data.content)

    comment_id = await db.fetchval(
        """
        INSERT INTO comments (post_id, parent_id, content, ip_hash, browser_id, display_name)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        """,
        post_id,
        comment_data.parent_id,
        content,
        ip_hash,
        browser_id,
        display_name,
    )

    await db.execute(
        "UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1", post_id
    )

    comment = await db.fetchrow(
        """
        SELECT id, content, display_name, parent_id, is_edited, created_at, updated_at, ip_hash
        FROM comments WHERE id = $1
        """,
        comment_id,
    )

    return {
        "success": True,
        "data": await build_comment_data(comment, ip_hash, db),
    }


@router.patch("/comments/{comment_id}")
async def edit_comment(
    comment_id: str,
    edit_data: CommentEdit,
    request: Request,
    db=Depends(get_db),
):
    client_ip = get_client_ip(request)

    comment = await db.fetchrow(
        """
        SELECT c.id, c.post_id, c.ip_hash, c.content, c.display_name, 
               c.parent_id, c.is_edited, c.created_at, c.updated_at
        FROM comments c
        WHERE c.id = $1 AND c.is_removed = FALSE
        """,
        comment_id,
    )

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    ip_hash = generate_ip_hash(client_ip, str(comment["post_id"]))

    if comment["ip_hash"] != ip_hash:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this comment"
        )

    edit_deadline = comment["created_at"] + timedelta(minutes=EDIT_WINDOW_MINUTES)
    if datetime.now(timezone.utc) > edit_deadline:
        raise HTTPException(
            status_code=400,
            detail=f"Edit window has expired ({EDIT_WINDOW_MINUTES} minutes)",
        )

    content = sanitize_text(edit_data.content)

    await db.execute(
        """
        UPDATE comments SET content = $1, is_edited = TRUE, updated_at = NOW()
        WHERE id = $2
        """,
        content,
        comment_id,
    )

    updated_comment = await db.fetchrow(
        """
        SELECT id, content, display_name, parent_id, is_edited, created_at, updated_at, ip_hash
        FROM comments WHERE id = $1
        """,
        comment_id,
    )

    return {
        "success": True,
        "data": await build_comment_data(updated_comment, ip_hash, db),
    }


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    request: Request,
    db=Depends(get_db),
):
    client_ip = get_client_ip(request)

    comment = await db.fetchrow(
        """
        SELECT c.id, c.post_id, c.ip_hash
        FROM comments c
        WHERE c.id = $1 AND c.is_removed = FALSE
        """,
        comment_id,
    )

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    ip_hash = generate_ip_hash(client_ip, str(comment["post_id"]))

    if comment["ip_hash"] != ip_hash:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this comment"
        )

    await db.execute("UPDATE comments SET is_removed = TRUE WHERE id = $1", comment_id)

    await db.execute(
        "UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1",
        comment["post_id"],
    )

    return {"success": True, "message": "Comment deleted"}


@router.post("/comments/{comment_id}/react")
async def add_reaction(
    comment_id: str,
    reaction_data: ReactionRequest,
    request: Request,
    db=Depends(get_db),
):
    client_ip = get_client_ip(request)
    browser_id = request.headers.get("X-Browser-ID")

    comment = await db.fetchrow(
        """
        SELECT c.id, c.post_id FROM comments c
        WHERE c.id = $1 AND c.is_removed = FALSE
        """,
        comment_id,
    )

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    ip_hash = generate_ip_hash(client_ip, str(comment["post_id"]))

    existing = await db.fetchrow(
        """
        SELECT id, reaction_type FROM comment_reactions
        WHERE comment_id = $1 AND ip_hash = $2
        """,
        comment_id,
        ip_hash,
    )

    if existing:
        if existing["reaction_type"] == reaction_data.reaction_type:
            await db.execute(
                "DELETE FROM comment_reactions WHERE id = $1", existing["id"]
            )
        else:
            await db.execute(
                """
                UPDATE comment_reactions 
                SET reaction_type = $1, created_at = NOW()
                WHERE id = $2
                """,
                reaction_data.reaction_type,
                existing["id"],
            )
    else:
        await db.execute(
            """
            INSERT INTO comment_reactions (comment_id, ip_hash, browser_id, reaction_type)
            VALUES ($1, $2, $3, $4)
            """,
            comment_id,
            ip_hash,
            browser_id,
            reaction_data.reaction_type,
        )

    reactions = await get_comment_reactions(comment_id, db)

    user_reaction = await db.fetchval(
        """
        SELECT reaction_type FROM comment_reactions
        WHERE comment_id = $1 AND ip_hash = $2
        """,
        comment_id,
        ip_hash,
    )

    return {
        "success": True,
        "data": {
            "reactions": reactions,
            "user_reaction": user_reaction,
        },
    }


@router.delete("/comments/{comment_id}/react")
async def remove_reaction(
    comment_id: str,
    request: Request,
    db=Depends(get_db),
):
    client_ip = get_client_ip(request)

    comment = await db.fetchrow(
        "SELECT c.id, c.post_id FROM comments c WHERE c.id = $1", comment_id
    )

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    ip_hash = generate_ip_hash(client_ip, str(comment["post_id"]))

    await db.execute(
        "DELETE FROM comment_reactions WHERE comment_id = $1 AND ip_hash = $2",
        comment_id,
        ip_hash,
    )

    return {"success": True, "message": "Reaction removed"}


async def get_comment_reactions(comment_id: str, db) -> dict:
    reactions = await db.fetch(
        """
        SELECT reaction_type, COUNT(*) as count
        FROM comment_reactions
        WHERE comment_id = $1
        GROUP BY reaction_type
        """,
        comment_id,
    )

    return {
        "like": 0,
        "love": 0,
        "laugh": 0,
        "wow": 0,
        "sad": 0,
        "fire": 0,
        **{r["reaction_type"]: r["count"] for r in reactions},
    }


async def get_replies_count(comment_id: str, db) -> int:
    return await db.fetchval(
        """
        SELECT COUNT(*) FROM comments
        WHERE parent_id = $1 AND is_removed = FALSE
        """,
        comment_id,
    )


async def build_comment_data(comment, ip_hash: str, db) -> dict:
    reactions = await get_comment_reactions(comment["id"], db)
    replies_count = await get_replies_count(comment["id"], db)

    user_reaction = await db.fetchval(
        """
        SELECT reaction_type FROM comment_reactions
        WHERE comment_id = $1 AND ip_hash = $2
        """,
        comment["id"],
        ip_hash,
    )

    can_edit = False
    if comment["ip_hash"] == ip_hash:
        edit_deadline = comment["created_at"] + timedelta(minutes=EDIT_WINDOW_MINUTES)
        can_edit = datetime.now(timezone.utc) < edit_deadline

    return {
        "id": str(comment["id"]),
        "content": comment["content"],
        "display_name": comment["display_name"],
        "parent_id": str(comment["parent_id"]) if comment["parent_id"] else None,
        "is_edited": comment["is_edited"],
        "replies_count": replies_count,
        "reactions": reactions,
        "user_reaction": user_reaction,
        "can_edit": can_edit,
        "created_at": comment["created_at"].isoformat(),
    }
