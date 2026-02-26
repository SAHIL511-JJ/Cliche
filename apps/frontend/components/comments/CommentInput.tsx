'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
  buttonText?: string
  replyTo?: string
  onCancel?: () => void
}

export function CommentInput({
  onSubmit,
  placeholder = 'Add a comment...',
  buttonText = 'Post',
  replyTo,
  onCancel,
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || loading) return

    setLoading(true)
    try {
      await onSubmit(content.trim())
      setContent('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${replyTo ? 'bg-[#1a1a25]/50 rounded-xl p-3' : ''}`}>
      {replyTo && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            Replying to <span className="font-medium text-gray-300">{replyTo}</span>
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={replyTo ? 2 : 3}
          maxLength={1000}
          className="flex-1 px-4 py-3 bg-[#1a1a25]/50 text-white placeholder-gray-500 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none text-sm"
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {content.length}/1000
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={loading}
            disabled={!content.trim()}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  )
}
