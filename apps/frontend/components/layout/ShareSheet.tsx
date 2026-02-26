'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'

interface ShareSheetProps {
  isOpen: boolean
  onClose: () => void
  url: string
  title?: string
}

export function ShareSheet({ isOpen, onClose, url, title = 'Check this out!' }: ShareSheetProps) {
  const { showToast } = useToast()

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied!', 'success')
      onClose()
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  const handleShare = async (platform: 'twitter' | 'whatsapp' | 'telegram') => {
    const encodedUrl = encodeURIComponent(url)
    const encodedTitle = encodeURIComponent(title)

    const urls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    }

    window.open(urls[platform], '_blank')
    onClose()
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        onClose()
      } catch {
        // User cancelled or error
      }
    }
  }

  const shareOptions = [
    { id: 'copy', label: 'Copy Link', icon: '📋', onClick: handleCopyLink },
    { id: 'twitter', label: 'Twitter', icon: '🐦', onClick: () => handleShare('twitter') },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬', onClick: () => handleShare('whatsapp') },
    { id: 'telegram', label: 'Telegram', icon: '✈️', onClick: () => handleShare('telegram') },
  ]

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#14141e] border-t border-white/10 rounded-t-3xl p-6 pb-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

            <h3 className="text-lg font-semibold text-white mb-4 text-center">Share</h3>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {shareOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={option.onClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-xs text-gray-400">{option.label}</span>
                </button>
              ))}
            </div>

            {!!navigator.share && (
              <button
                onClick={handleNativeShare}
                className="w-full py-3 bg-sky-500 text-white rounded-xl font-medium"
              >
                More Options
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 mt-2 text-gray-500 font-medium"
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
