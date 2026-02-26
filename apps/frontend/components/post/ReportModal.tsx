'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { ReportReason } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
}

const REPORT_REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'harassment', label: 'Harassment', icon: '😡' },
  { value: 'explicit', label: 'Explicit Content', icon: '🔞' },
  { value: 'hate', label: 'Hate Speech', icon: '🚫' },
  { value: 'spam', label: 'Spam', icon: '📧' },
  { value: 'other', label: 'Other', icon: '⚠️' },
]

export function ReportModal({ isOpen, onClose, postId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = async () => {
    if (!selectedReason) return

    setLoading(true)
    try {
      await api.reportPost(postId, selectedReason)
      showToast('Report submitted. Thanks for helping keep our community safe.', 'success')
      onClose()
    } catch (error) {
      showToast('Failed to submit report', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-[#141e1a] border border-white/10 rounded-2xl p-6 max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Report Post</h3>
            <p className="text-sm text-gray-500 mb-4">
              Why are you reporting this post?
            </p>

            <div className="space-y-2 mb-6">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => setSelectedReason(reason.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedReason === reason.value
                      ? 'bg-emerald-500/15 border-2 border-emerald-500'
                      : 'bg-[#1a2420] border-2 border-transparent hover:bg-[#243030]'
                    }`}
                >
                  <span className="text-xl">{reason.icon}</span>
                  <span className="font-medium text-white">{reason.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-[#1a2420] text-gray-300 rounded-xl font-medium hover:bg-[#243030] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || loading}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Report'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
