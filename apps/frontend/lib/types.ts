export type PostType = 'rate' | 'poll' | 'wyr' | 'rank' | 'compare'

export type ReportReason = 'harassment' | 'explicit' | 'hate' | 'spam' | 'other'

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'fire'

export interface Item {
  id: string
  name: string
  image_url: string | null
  image_key?: string
  order_index: number
  vote_count: number
  total_score?: number
  avg_scores?: Record<string, number>
  score_distribution?: Record<string, number>
  avg_position?: number
  percentage?: number
}

export interface Post {
  id: string
  type: PostType
  caption: string | null
  attributes: string[] | null
  items: Item[]
  vote_count: number
  comment_count: number
  has_voted: boolean
  expires_at: string | null
  created_at: string
  report_count?: number
  is_removed?: boolean
  creator_token?: string
}

export interface Vote {
  item_id?: string
  ratings?: Record<string, number>
  ranking?: string[]
  multi_ratings?: Record<string, Record<string, number>>
}

export interface CommentReactions {
  like: number
  love: number
  laugh: number
  wow: number
  sad: number
  fire: number
}

export interface Comment {
  id: string
  content: string
  display_name: string
  parent_id: string | null
  is_edited: boolean
  replies_count: number
  reactions: CommentReactions
  user_reaction: ReactionType | null
  can_edit: boolean
  created_at: string
  replies?: Comment[]
}

export interface CommentsResponse {
  success: boolean
  data: {
    comments: Comment[]
    pagination: {
      page: number
      limit: number
      total: number
      has_more: boolean
    }
  }
}

export interface PaginatedResponse<T> {
  success: boolean
  data: {
    posts?: T[]
    items?: T[]
    pagination: {
      page: number
      limit: number
      total: number
      has_more: boolean
    }
  }
}

export interface ApiError {
  success: false
  error: string
  message: string
}

export interface VoteCheckResponse {
  success: boolean
  data: {
    has_voted: boolean
    voted_at: string | null
  }
}

export interface ResultsResponse {
  success: boolean
  data: {
    post: {
      id: string
      type: PostType
      caption: string | null
      vote_count: number
      comment_count?: number
      expires_at?: string | null
    }
    results: {
      winner: {
        item_id: string
        name: string
        overall_score?: number
        percentage?: number | null
        avg_position?: number
      } | null
      items: Item[]
    }
  }
}

export interface CreatePostRequest {
  type: PostType
  caption?: string
  attributes?: string[]
  items: {
    name: string
    image_base64?: string
    image_url?: string
  }[]
  expires_in_hours?: number
  expires_at?: string  // NEW: ISO datetime string
}

export interface ActivityPost extends Post {
  is_expired: boolean
  user_voted_at: string
}

export interface CreatePostResponse {
  success: boolean
  data: {
    id: string
    share_url: string
    creator_token: string
  }
}
