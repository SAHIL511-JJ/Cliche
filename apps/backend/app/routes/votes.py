from fastapi import APIRouter, Request, HTTPException, Depends
from datetime import datetime, timezone
import json

from app.database import get_db
from app.schemas import VoteRequest, VoteCheckResponse
from app.utils import get_client_ip, generate_ip_hash, has_voted_by_ip, sanitize_text

router = APIRouter(tags=["votes"])


@router.post("/posts/{post_id}/vote")
async def submit_vote(
    post_id: str, vote_data: VoteRequest, request: Request, db=Depends(get_db)
):
    client_ip = get_client_ip(request)
    ip_hash = generate_ip_hash(client_ip, post_id) # IP-only hash for fallback
    browser_id = request.headers.get("X-Browser-ID")

    # Check browser_id first (device-unique), then fall back to IP
    if browser_id:
        existing = await db.fetchval(
            "SELECT 1 FROM votes WHERE post_id = $1 AND browser_id = $2",
            post_id,
            browser_id,
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "ALREADY_VOTED",
                    "message": "You have already voted on this post",
                },
            )
    else:
        # No browser_id — fall back to IP-only check
        if await has_voted_by_ip(ip_hash, post_id, db):
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "ALREADY_VOTED",
                    "message": "You have already voted on this post",
                },
            )

    post = await db.fetchrow(
        "SELECT type, expires_at, is_removed FROM posts WHERE id = $1", post_id
    )

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["is_removed"]:
        raise HTTPException(status_code=410, detail="Post has been removed")
    if post["expires_at"] and post["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Post has expired")

    if post["type"] == "rate":
        if not vote_data.item_id or not vote_data.ratings:
            raise HTTPException(
                status_code=400, detail="item_id and ratings required for rate type"
            )
        for attr, score in vote_data.ratings.items():
            if not (1 <= score <= 10):
                raise HTTPException(
                    status_code=400, detail="Ratings must be between 1 and 10"
                )

    elif post["type"] == "compare":
        if vote_data.multi_ratings:
            for item_id, item_ratings in vote_data.multi_ratings.items():
                for attr, score in item_ratings.items():
                    if not (1 <= score <= 10):
                        raise HTTPException(
                            status_code=400, detail="Ratings must be between 1 and 10"
                        )
        elif not vote_data.item_id or not vote_data.ratings:
            raise HTTPException(
                status_code=400,
                detail="multi_ratings or item_id+ratings required for compare type",
            )

    elif post["type"] in ("poll", "wyr"):
        if not vote_data.item_id:
            raise HTTPException(status_code=400, detail="item_id required")

    elif post["type"] == "rank":
        if not vote_data.ranking:
            raise HTTPException(
                status_code=400, detail="ranking required for rank type"
            )

    # Generate the ip_hash for storage, which includes browser_id if available
    storage_ip_hash = generate_ip_hash(client_ip, post_id, browser_id=browser_id)

    async with db.transaction():
        await db.execute(
            "INSERT INTO vote_locks (ip_hash, post_id) VALUES ($1, $2)",
            storage_ip_hash,
            post_id,
        )

        await db.execute(
            "UPDATE posts SET vote_count = vote_count + 1 WHERE id = $1", post_id
        )

        if post["type"] == "compare" and vote_data.multi_ratings:
            for item_id, item_ratings in vote_data.multi_ratings.items():
                valid_item = await db.fetchrow(
                    "SELECT id FROM items WHERE id = $1 AND post_id = $2",
                    item_id,
                    post_id,
                )
                if not valid_item:
                    continue
                await db.fetchval(
                    """
                    INSERT INTO votes (post_id, item_id, ip_hash, browser_id, ratings)
                    VALUES ($1, $2, $3, $4, $5) RETURNING id
                """,
                    post_id,
                    item_id,
                    storage_ip_hash,
                    browser_id,
                    json.dumps(item_ratings),
                )
                await db.execute(
                    "UPDATE items SET vote_count = vote_count + 1 WHERE id = $1",
                    item_id,
                )
                for attr, score in item_ratings.items():
                    await db.execute(
                        "UPDATE items SET total_score = total_score + $1 WHERE id = $2",
                        score,
                        item_id,
                    )
        else:
            vote_id = await db.fetchval(
                """
                INSERT INTO votes (post_id, item_id, ip_hash, browser_id, ratings, ranking)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                post_id,
                vote_data.item_id,
                storage_ip_hash,
                browser_id,
                json.dumps(vote_data.ratings) if vote_data.ratings else None,
                json.dumps(vote_data.ranking) if vote_data.ranking else None,
            )

            if vote_data.item_id:
                await db.execute(
                    "UPDATE items SET vote_count = vote_count + 1 WHERE id = $1",
                    vote_data.item_id,
                )

            if vote_data.ratings:
                for attr, score in vote_data.ratings.items():
                    await db.execute(
                        "UPDATE items SET total_score = total_score + $1 WHERE id = $2",
                        score,
                        vote_data.item_id,
                    )

    return {
        "success": True,
        "message": "Vote recorded",
        "data": {"redirect_to": f"/p/{post_id}/results"},
    }


@router.get("/posts/{post_id}/vote-check")
async def check_vote_status(post_id: str, request: Request, db=Depends(get_db)):
    client_ip = get_client_ip(request)
    ip_hash = generate_ip_hash(client_ip, post_id) # IP-only hash for fallback
    browser_id = request.headers.get("X-Browser-ID")

    # Check browser_id first (device-unique)
    if browser_id:
        existing = await db.fetchrow(
            "SELECT created_at FROM votes WHERE post_id = $1 AND browser_id = $2",
            post_id,
            browser_id,
        )
        if existing:
            return {
                "success": True,
                "data": {
                    "has_voted": True,
                    "voted_at": existing["created_at"].isoformat(),
                },
            }
        # Has browser_id but no vote found — this device hasn't voted
        return {"success": True, "data": {"has_voted": False, "voted_at": None}}

    # No browser_id — fall back to IP-based check
    vote = await db.fetchrow(
        "SELECT created_at FROM vote_locks WHERE ip_hash = $1 AND post_id = $2",
        ip_hash,
        post_id,
    )

    if vote:
        return {
            "success": True,
            "data": {"has_voted": True, "voted_at": vote["created_at"].isoformat()},
        }

    return {"success": True, "data": {"has_voted": False, "voted_at": None}}


@router.get("/posts/{post_id}/results")
async def get_results(post_id: str, db=Depends(get_db)):
    post = await db.fetchrow(
        """
        SELECT id, type, caption, vote_count, comment_count, attributes, expires_at
        FROM posts WHERE id = $1
        """,
        post_id,
    )

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    items = await db.fetch(
        """
        SELECT id, name, image_url, vote_count, total_score
        FROM items WHERE post_id = $1 ORDER BY order_index
        """,
        post_id,
    )

    if post["type"] == "rank":
        all_rankings = await db.fetch(
            "SELECT ranking FROM votes WHERE post_id = $1 AND ranking IS NOT NULL",
            post_id,
        )
        position_sums: dict = {str(item["id"]): 0 for item in items}
        position_counts: dict = {str(item["id"]): 0 for item in items}

        for vote_row in all_rankings:
            ranking_list = (
                json.loads(vote_row["ranking"]) if vote_row["ranking"] else []
            )
            for position, item_id in enumerate(ranking_list):
                if item_id in position_sums:
                    position_sums[item_id] += position + 1
                    position_counts[item_id] += 1

        rank_items_data = []
        for item in items:
            iid = str(item["id"])
            count = position_counts[iid]
            avg_pos = round(position_sums[iid] / count, 2) if count > 0 else 999.0
            rank_items_data.append(
                {
                    "id": iid,
                    "name": item["name"],
                    "image_url": item["image_url"],
                    "vote_count": count,
                    "avg_position": avg_pos,
                    "percentage": 0,
                }
            )

        rank_items_data.sort(key=lambda x: x["avg_position"])
        winner = rank_items_data[0] if rank_items_data else None

        return {
            "success": True,
            "data": {
                "post": {
                    "id": str(post["id"]),
                    "type": post["type"],
                    "caption": post["caption"],
                    "vote_count": post["vote_count"],
                    "comment_count": post["comment_count"],
                    "expires_at": post["expires_at"].isoformat()
                    if post["expires_at"]
                    else None,
                },
                "results": {
                    "winner": {
                        "item_id": winner["id"],
                        "name": winner["name"],
                        "avg_position": winner["avg_position"],
                        "percentage": None,
                    }
                    if winner
                    else None,
                    "items": rank_items_data,
                },
            },
        }

    items_data = []
    for item in items:
        avg_scores = None
        score_distribution = None

        if post["type"] in ["rate", "compare"]:
            votes = await db.fetch(
                "SELECT ratings FROM votes WHERE item_id = $1 AND ratings IS NOT NULL",
                item["id"],
            )

            if votes:
                score_sums = {}
                score_counts = {}
                distribution = {str(i): 0 for i in range(1, 11)}

                for vote in votes:
                    ratings = json.loads(vote["ratings"]) if vote["ratings"] else {}
                    for attr, score in ratings.items():
                        if attr not in score_sums:
                            score_sums[attr] = 0
                            score_counts[attr] = 0
                        score_sums[attr] += score
                        score_counts[attr] += 1
                        distribution[str(score)] = distribution.get(str(score), 0) + 1

                avg_scores = {
                    attr: round(score_sums[attr] / score_counts[attr], 1)
                    for attr in score_sums
                }
                score_distribution = distribution

        percentage = 0
        if post["vote_count"] > 0:
            percentage = round((item["vote_count"] / post["vote_count"]) * 100, 1)

        items_data.append(
            {
                "id": str(item["id"]),
                "name": item["name"],
                "image_url": item["image_url"],
                "vote_count": item["vote_count"],
                "percentage": percentage,
                "avg_scores": avg_scores,
                "score_distribution": score_distribution,
            }
        )

    winner = None
    if items_data:
        if post["type"] in ["rate", "compare"]:
            winner = max(
                items_data,
                key=lambda x: sum(x.get("avg_scores", {}).values())
                if x.get("avg_scores")
                else 0,
            )
        else:
            winner = max(items_data, key=lambda x: x["vote_count"])

    return {
        "success": True,
        "data": {
            "post": {
                "id": str(post["id"]),
                "type": post["type"],
                "caption": post["caption"],
                "vote_count": post["vote_count"],
                "comment_count": post["comment_count"],
                "expires_at": post["expires_at"].isoformat()
                if post["expires_at"]
                else None,
            },
            "results": {
                "winner": {
                    "item_id": winner["id"],
                    "name": winner["name"],
                    "overall_score": sum(winner.get("avg_scores", {}).values())
                    / len(winner.get("avg_scores", {}))
                    if winner.get("avg_scores")
                    else None,
                    "percentage": winner["percentage"],
                }
                if winner
                else None,
                "items": items_data,
            },
        },
    }
