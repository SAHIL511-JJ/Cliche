'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Item } from '@/lib/types'

interface WyrVoteProps {
  items: Item[]
  onVote: (itemId: string) => void
  submitting: boolean
}

export function WyrVote({ items, onVote, submitting }: WyrVoteProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [A, B] = items

  return (
    <div className="flex flex-col md:flex-row h-[70vh] rounded-3xl overflow-hidden shadow-2xl relative">
      <motion.button
        className="flex-1 relative flex flex-col items-center justify-end pb-12 cursor-pointer"
        style={{ background: hoveredId === A.id ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'linear-gradient(135deg,#0c2d4d,#1e1b4b)' }}
        onHoverStart={() => setHoveredId(A.id)}
        onHoverEnd={() => setHoveredId(null)}
        onClick={() => !submitting && onVote(A.id)}
        whileTap={{ scale: 0.97 }}
        disabled={submitting}
      >
        {A.image_url ? (
          <img src={A.image_url} alt={A.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: hoveredId === A.id ? 0.5 : 0.65, transition: 'opacity 0.3s' }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 to-indigo-900/50" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <motion.p
          className="relative z-10 text-2xl md:text-4xl font-black text-center px-6 text-white"
        >
          {A.name}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: hoveredId === A.id ? 1 : 0.6 }}
          className="relative z-10 mt-3 text-white/70 font-semibold text-sm"
        >
          Tap to choose
        </motion.p>
      </motion.button>

      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <motion.div
          className="w-16 h-16 rounded-full glass-strong shadow-2xl flex items-center justify-center"
          animate={{ scale: hoveredId ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span className="text-lg font-black text-white">OR</span>
        </motion.div>
      </div>

      <motion.button
        className="flex-1 relative flex flex-col items-center justify-end pb-12 cursor-pointer"
        style={{ background: hoveredId === B.id ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#4d2c0c,#4b1b1b)' }}
        onHoverStart={() => setHoveredId(B.id)}
        onHoverEnd={() => setHoveredId(null)}
        onClick={() => !submitting && onVote(B.id)}
        whileTap={{ scale: 0.97 }}
        disabled={submitting}
      >
        {B.image_url ? (
          <img src={B.image_url} alt={B.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: hoveredId === B.id ? 0.5 : 0.65, transition: 'opacity 0.3s' }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/50 to-red-900/50" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <motion.p
          className="relative z-10 text-2xl md:text-4xl font-black text-center px-6 text-white"
        >
          {B.name}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: hoveredId === B.id ? 1 : 0.6 }}
          className="relative z-10 mt-3 text-white/70 font-semibold text-sm"
        >
          Tap to choose
        </motion.p>
      </motion.button>

      {submitting && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
