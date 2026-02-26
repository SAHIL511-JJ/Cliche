'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Comment, ReactionType, CommentReactions } from '@/lib/types'
import { api } from '@/lib/api'
import { CommentInput } from './CommentInput'
import { ReactionBadges } from './ReactionPicker'

interface CommentItemProps {
  comment: Comment
  postId: string
  onReply: (parentId: string, content: string) => Promise<void>
  onEdit?: (commentId: string, content: string) => Promise<void>
  depth?: number
}

export function CommentItem({
  comment,
  postId,
  onReply,
  onEdit,
  depth = 0,
}: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<Comment[]>(comment.replies || [])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [editLoading, setEditLoading] = useState(false)

  // Local reaction state so updates are instant
  const [reactions, setReactions] = useState(comment.reactions)
  const [userReaction, setUserReaction] = useState(comment.user_reaction)

  const timeAgo = getTimeAgo(new Date(comment.created_at))

  const handleReply = async (content: string) => {
    await onReply(comment.id, content)
    setShowReplyInput(false)
    await fetchReplies()
    setShowReplies(true)
  }

  const handleEdit = async () => {
    if (!onEdit || !editContent.trim()) return
    setEditLoading(true)
    try {
      await onEdit(comment.id, editContent.trim())
      setIsEditing(false)
    } finally {
      setEditLoading(false)
    }
  }

  // Handle reaction locally — no parent state dependency
  const handleReact = useCallback(async (type: ReactionType) => {
    try {
      const result = await api.reactToComment(comment.id, type)
      setReactions(result.data.reactions as unknown as CommentReactions)
      setUserReaction(result.data.user_reaction)
    } catch (error) {
      console.error('Failed to react:', error)
    }
  }, [comment.id])

  const fetchReplies = async () => {
    setLoadingReplies(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${apiUrl}/posts/${postId}/comments?parent_id=${comment.id}&page=1&limit=50`)
      const data = await response.json()
      if (data.success) {
        setReplies(data.data.comments)
      }
    } catch (error) {
      console.error('Failed to load replies:', error)
    } finally {
      setLoadingReplies(false)
    }
  }

  const handleShowReplies = async () => {
    if (!showReplies && replies.length === 0) {
      await fetchReplies()
    }
    setShowReplies(true)
  }

  const isNested = depth > 0

  return (
    <div className={`${isNested ? 'ml-4 pl-4 border-l-2 border-white/10' : ''}`}>
      <div className="py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {comment.display_name.charAt(0)}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-white">{comment.display_name}</span>
              <span className="text-xs text-gray-400">{timeAgo}</span>
              {comment.is_edited && <span className="text-xs text-gray-400">(edited)</span>}
            </div>

            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  className="w-full px-3 py-2 bg-[#1a1a25]/50 text-white placeholder-gray-500 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                  <button onClick={handleEdit} disabled={editLoading || !editContent.trim()} className="text-xs text-sky-500 font-medium hover:text-sky-600 disabled:opacity-50">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{comment.content}</p>
            )}

            <div className="flex items-center gap-3 mt-2">
              <ReactionBadges
                reactions={reactions}
                userReaction={userReaction}
                onReact={handleReact}
                compact
              />
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-xs text-gray-500 hover:text-sky-500 font-medium transition-colors"
              >
                Reply
              </button>
              {comment.can_edit && onEdit && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-xs text-gray-500 hover:text-gray-300">Edit</button>
              )}
            </div>

            {comment.replies_count > 0 && !showReplies && (
              <button
                onClick={handleShowReplies}
                disabled={loadingReplies}
                className="text-xs text-sky-500 font-medium mt-2 hover:text-sky-600 disabled:opacity-50 flex items-center gap-1.5"
              >
                {loadingReplies ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
                    Loading...
                  </>
                ) : (
                  `▸ View ${comment.replies_count} ${comment.replies_count === 1 ? 'reply' : 'replies'}`
                )}
              </button>
            )}

            {showReplies && replies.length > 0 && (
              <button onClick={() => setShowReplies(false)} className="text-xs text-gray-500 font-medium mt-2 hover:text-gray-300">
                ▾ Hide replies
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReplyInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-11 mb-3"
          >
            <CommentInput
              onSubmit={handleReply}
              placeholder="Write a reply..."
              buttonText="Reply"
              replyTo={comment.display_name}
              onCancel={() => setShowReplyInput(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showReplies && replies.length > 0 && (
        <div className="mt-1">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onReply={onReply}
              onEdit={onEdit}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}
