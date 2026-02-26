from fastapi import APIRouter, Request, HTTPException, Depends
from app.database import get_db
from app.schemas import ReportRequest
from app.utils import get_client_ip, generate_ip_hash

router = APIRouter(tags=["reports"])


@router.post("/posts/{post_id}/report")
async def report_post(
    post_id: str, report_data: ReportRequest, request: Request, db=Depends(get_db)
):
    client_ip = get_client_ip(request)
    ip_hash = generate_ip_hash(client_ip, post_id)

    post = await db.fetchval(
        "SELECT id FROM posts WHERE id = $1 AND is_removed = FALSE", post_id
    )

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing_report = await db.fetchval(
        "SELECT 1 FROM reports WHERE post_id = $1 AND ip_hash = $2", post_id, ip_hash
    )

    if existing_report:
        return {"success": True, "message": "Report already submitted"}

    async with db.transaction():
        await db.execute(
            """
            INSERT INTO reports (post_id, reason, ip_hash)
            VALUES ($1, $2, $3)
            """,
            post_id,
            report_data.reason,
            ip_hash,
        )

        await db.execute(
            """
            UPDATE posts SET report_count = report_count + 1
            WHERE id = $1
            """,
            post_id,
        )

    return {"success": True, "message": "Report submitted. We'll review it shortly."}
