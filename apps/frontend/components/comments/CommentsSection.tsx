'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import type { Comment, CommentsResponse } from '@/lib/types'
import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'

interface CommentsSectionProps {
  postId: string
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [sortBy, setSortBy] = useState<'new' | 'top'>('new')
  const [total, setTotal] = useState(0)

  const loadComments = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/posts/${postId}/comments?page=${pageNum}&limit=20`
      )
      const data: CommentsResponse = await response.json()

      if (data.success) {
        if (append) {
          setComments((prev) => [...prev, ...data.data.comments])
        } else {
          setComments(data.data.comments)
        }
        setHasMore(data.data.pagination.has_more)
        setTotal(data.data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [postId])

  useEffect(() => {
    setPage(1)
    loadComments(1)
  }, [loadComments, sortBy])

  const handleAddComment = async (content: string) => {
    await api.addComment(postId, content)
    setPage(1)
    loadComments(1)
  }

  const handleReply = async (parentId: string, content: string) => {
    await api.replyToComment(postId, parentId, content)
    // Don't reload all comments — CommentItem handles its own reply refresh
  }

  const handleEdit = async (commentId: string, content: string) => {
    const result = await api.editComment(commentId, content)
    setComments((prevComments) =>
      prevComments.map((c) => c.id === commentId ? { ...c, ...result.data } : c)
    )
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadComments(nextPage, true)
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Comments {total > 0 && `(${total})`}
          </h3>
          <div className="flex gap-1 bg-[#1a1a25] rounded-lg p-1">
            <button
              onClick={() => setSortBy('new')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${sortBy === 'new' ? 'bg-[#252535] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              New
            </button>
            <button
              onClick={() => setSortBy('top')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${sortBy === 'top' ? 'bg-[#252535] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              Top
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-white/10">
        <CommentInput onSubmit={handleAddComment} placeholder="Add a comment..." />
      </div>

      <div className="divide-y divide-white/5">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-8 h-8 bg-[#252535] rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-[#252535] rounded w-24 mb-2" />
                  <div className="h-4 bg-[#252535] rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="px-4"
                >
                  <CommentItem
                    comment={comment}
                    postId={postId}
                    onReply={handleReply}
                    onEdit={handleEdit}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-sky-500 font-medium text-sm hover:text-sky-600 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more comments'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
