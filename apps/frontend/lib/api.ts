import type { 
  Post, 
  Vote, 
  CreatePostRequest, 
  CreatePostResponse, 
  VoteCheckResponse,
  ResultsResponse,
  PaginatedResponse,
  ApiError,
  Comment,
  ReactionType,
  ActivityPost,
} from './types'
import { getOrCreateBrowserId, getVotedPosts, markPostAsVoted } from './fingerprint'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

class ApiErrorClass extends Error {
  code: string
  status: number
  
  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function request<T>(
  path: string, 
  options: RequestInit = {}
): Promise<T> {
  const browserId = getOrCreateBrowserId()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Browser-ID': browserId,
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    const error = data as ApiError
    throw new ApiErrorClass(
      error.message || 'An error occurred',
      error.error || 'UNKNOWN_ERROR',
      response.status
    )
  }

  return data
}

export const api = {
  async getFeed(
    type: 'trending' | 'recent' | 'random' = 'trending',
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Post>> {
    return request<PaginatedResponse<Post>>(
      `/posts?type=${type}&page=${page}&limit=${limit}`
    )
  },

  async getPost(id: string): Promise<{ success: boolean; data: Post }> {
    return request<{ success: boolean; data: Post }>(`/posts/${id}`)
  },

  async createPost(data: CreatePostRequest): Promise<CreatePostResponse> {
    return request<CreatePostResponse>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async checkVoteStatus(postId: string): Promise<VoteCheckResponse> {
    return request<VoteCheckResponse>(`/posts/${postId}/vote-check`)
  },

  async submitVote(postId: string, vote: Vote): Promise<{ success: boolean; data: { redirect_to: string } }> {
    const votedPosts = getVotedPosts()
    if (votedPosts.has(postId)) {
      throw new ApiErrorClass(
        'You have already voted on this post',
        'ALREADY_VOTED',
        409
      )
    }

    const result = await request<{ success: boolean; data: { redirect_to: string } }>(
      `/posts/${postId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify(vote),
      }
    )

    markPostAsVoted(postId)
    return result
  },

  async getResults(postId: string): Promise<ResultsResponse> {
    return request<ResultsResponse>(`/posts/${postId}/results`)
  },

  async getComments(
    postId: string, 
    page = 1,
    limit = 20,
    parentId?: string
  ): Promise<{ success: boolean; data: { comments: Comment[]; pagination: { has_more: boolean; total: number } } }> {
    let url = `/posts/${postId}/comments?page=${page}&limit=${limit}`
    if (parentId) {
      url += `&parent_id=${parentId}`
    }
    return request(url)
  },

  async addComment(postId: string, content: string): Promise<{ success: boolean; data: Comment }> {
    return request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  },

  async replyToComment(postId: string, parentId: string, content: string): Promise<{ success: boolean; data: Comment }> {
    return request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id: parentId }),
    })
  },

  async editComment(commentId: string, content: string): Promise<{ success: boolean; data: Comment }> {
    return request(`/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    })
  },

  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    return request(`/comments/${commentId}`, {
      method: 'DELETE',
    })
  },

  async reactToComment(
    commentId: string, 
    reactionType: ReactionType
  ): Promise<{ success: boolean; data: { reactions: Record<string, number>; user_reaction: ReactionType | null } }> {
    return request(`/comments/${commentId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: reactionType }),
    })
  },

  async removeReaction(commentId: string): Promise<{ success: boolean }> {
    return request(`/comments/${commentId}/react`, {
      method: 'DELETE',
    })
  },

  async reportPost(postId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/posts/${postId}/report`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    )
  },

  async uploadImage(file: File): Promise<{ success: boolean; data: { image_url: string; image_key: string } }> {
    const browserId = getOrCreateBrowserId()
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers: {
        'X-Browser-ID': browserId,
      },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data as ApiError
      throw new ApiErrorClass(
        error.message || 'Upload failed',
        error.error || 'UPLOAD_ERROR',
        response.status
      )
    }

    return data
  },

  async getUserActivity(
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<ActivityPost>> {
    return request<PaginatedResponse<ActivityPost>>(
      `/users/activity?page=${page}&limit=${limit}`
    )
  },

  async adminLogin(secret: string): Promise<{ success: boolean; message: string }> {
    const browserId = getOrCreateBrowserId()

    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Browser-ID': browserId,
      },
      body: JSON.stringify({ secret }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiErrorClass(
        data.message || 'Invalid admin secret',
        'ADMIN_AUTH_FAILED',
        response.status
      )
    }

    // Store admin session in localStorage
    if (data.success) {
      localStorage.setItem('admin_session', 'true')
    }

    return data
  },

  async getAllPosts(page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    return request<PaginatedResponse<Post>>(
      `/admin/posts?page=${page}&limit=${limit}`
    )
  },

  async adminDeletePost(postId: string): Promise<{ success: boolean; message: string }> {
    const browserId = getOrCreateBrowserId()

    return request<{ success: boolean; message: string }>(
      `/admin/posts/${postId}`,
      {
        method: 'DELETE',
        headers: {
          'X-Browser-ID': browserId,
        },
      }
    )
  },

  async getMyPosts(page = 1, limit = 10): Promise<PaginatedResponse<Post>> {
    return request<PaginatedResponse<Post>>(
      `/users/my-posts?page=${page}&limit=${limit}`
    )
  },

  async deletePost(id: string, creatorToken?: string): Promise<{ success: boolean }> {
    const browserId = getOrCreateBrowserId()
    
    const params = new URLSearchParams()
    if (creatorToken) {
      params.append('creator_token', creatorToken)
    }
    
    const url = `/posts/${id}${params.toString() ? '?' + params.toString() : ''}`
    
    return request<{ success: boolean }>(url, {
      method: 'DELETE',
      headers: {
        'X-Browser-ID': browserId,
      },
    })
  },

  isAdmin(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('admin_session') === 'true'
  },

  logoutAdmin(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('admin_session')
  },
}

export { ApiErrorClass as ApiError }
