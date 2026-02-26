from .posts import router as posts_router
from .votes import router as votes_router
from .upload import router as upload_router
from .reports import router as reports_router
from .admin import router as admin_router

__all__ = [
    "posts_router",
    "votes_router",
    "upload_router",
    "reports_router",
    "admin_router",
]
