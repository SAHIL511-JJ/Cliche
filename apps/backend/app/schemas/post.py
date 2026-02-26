from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime


class ItemBase(BaseModel):
    name: str = Field(..., max_length=50)
    image_url: Optional[str] = None
    order_index: int


class ItemCreate(BaseModel):
    name: str = Field(..., max_length=50)
    image_base64: Optional[str] = None
    image_url: Optional[str] = None


class ItemResponse(BaseModel):
    id: str
    name: str
    image_url: Optional[str]
    vote_count: int = 0
    avg_scores: Optional[dict[str, float]] = None

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    type: str = Field(..., pattern="^(rate|poll|wyr|rank|compare)$")
    caption: Optional[str] = Field(None, max_length=120)
    attributes: Optional[list[str]] = Field(None, max_length=5)
    items: list[ItemCreate] = Field(..., min_length=1, max_length=4)
    expires_in_hours: Optional[int] = Field(168, ge=1, le=720)
    expires_at: Optional[datetime] = None  # NEW: Direct datetime support


class PostResponse(BaseModel):
    id: str
    type: str
    caption: Optional[str]
    attributes: Optional[list[str]]
    items: list[ItemResponse]
    vote_count: int
    comment_count: int
    has_voted: bool
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    id: str
    type: str
    caption: Optional[str]
    items: list[dict]
    vote_count: int
    comment_count: int
    has_voted: bool
    expires_at: Optional[datetime]
    created_at: datetime


class VoteRequest(BaseModel):
    item_id: Optional[str] = None
    ratings: Optional[dict[str, int]] = None
    ranking: Optional[list[str]] = None
    multi_ratings: Optional[dict[str, dict[str, int]]] = None
    comment: Optional[str] = Field(None, max_length=500)


class VoteCheckResponse(BaseModel):
    has_voted: bool
    voted_at: Optional[datetime] = None


class WinnerResponse(BaseModel):
    item_id: str
    name: Optional[str]
    overall_score: Optional[float] = None
    percentage: Optional[float] = None


class ResultItemResponse(BaseModel):
    id: str
    name: Optional[str]
    vote_count: int
    percentage: float
    avg_scores: Optional[dict[str, float]] = None
    score_distribution: Optional[dict[str, int]] = None


class ResultsResponse(BaseModel):
    post: dict
    results: dict
    comments: list[dict]


class ReportRequest(BaseModel):
    reason: str = Field(..., pattern="^(harassment|explicit|hate|spam|other)$")


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[str] = None


class CommentEdit(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


class ReactionRequest(BaseModel):
    reaction_type: str = Field(..., pattern="^(like|love|laugh|wow|sad|fire)$")


class CommentReactionResponse(BaseModel):
    like: int = 0
    love: int = 0
    laugh: int = 0
    wow: int = 0
    sad: int = 0
    fire: int = 0


class CommentResponse(BaseModel):
    id: str
    content: str
    display_name: str
    parent_id: Optional[str]
    is_edited: bool
    replies_count: int
    reactions: CommentReactionResponse
    user_reaction: Optional[str]
    can_edit: bool
    created_at: datetime
    replies: Optional[list["CommentResponse"]] = None

    class Config:
        from_attributes = True


class CommentsListResponse(BaseModel):
    comments: list[CommentResponse]
    pagination: dict


class PaginationResponse(BaseModel):
    page: int
    limit: int
    total: int
    has_more: bool


class FeedResponse(BaseModel):
    posts: list[PostListResponse]
    pagination: PaginationResponse


class UploadResponse(BaseModel):
    image_url: str
    image_key: str


class SuccessResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    message: str
