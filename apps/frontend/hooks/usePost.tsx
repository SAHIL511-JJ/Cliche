'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Post, PaginatedResponse } from '@/lib/types'

export function useFeed(initialType: 'trending' | 'recent' | 'random' = 'trending') {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchPosts = useCallback(async (
    type: 'trending' | 'recent' | 'random',
    pageNum: number = 1,
    append: boolean = false
  ) => {
    if (!append) {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await api.getFeed(type, pageNum, 10)
      const newPosts = response.data.posts || []

      if (append) {
        setPosts(prev => [...prev, ...newPosts])
      } else {
        setPosts(newPosts)
      }

      setHasMore(response.data.pagination?.has_more ?? false)
      setPage(pageNum)
    } catch (err: any) {
      setError(err.message || 'Failed to load posts')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback((type: 'trending' | 'recent' | 'random') => {
    if (!loading && hasMore) {
      fetchPosts(type, page + 1, true)
    }
  }, [loading, hasMore, page, fetchPosts])

  const refresh = useCallback((type: 'trending' | 'recent' | 'random') => {
    setPosts([])
    setHasMore(true)
    fetchPosts(type, 1, false)
  }, [fetchPosts])

  return {
    posts,
    loading,
    error,
    hasMore,
    fetchPosts,
    loadMore,
    refresh,
  }
}

export function usePost(postId: string) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPost = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.getPost(postId)
      setPost(response.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }, [postId])

  const deletePost = useCallback(async (creatorToken: string) => {
    try {
      await api.deletePost(postId, creatorToken)
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to delete post')
      return false
    }
  }, [postId])

  return {
    post,
    loading,
    error,
    fetchPost,
    deletePost,
  }
}
