'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { REACTION_EMOJIS, REACTION_TYPES, ReactionType } from '@/lib/nameGenerator'
import type { CommentReactions } from '@/lib/types'

interface ReactionPickerProps {
  onSelect: (type: ReactionType) => void
  selected?: ReactionType | null
  onClose?: () => void
}

export function ReactionPicker({ onSelect, selected, onClose }: ReactionPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="flex items-center gap-1 bg-[#1a1a25] rounded-full shadow-lg border border-white/10 px-2 py-1"
    >
      {REACTION_TYPES.map((type) => (
        <motion.button
          key={type}
          onClick={() => {
            onSelect(type)
            onClose?.()
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${selected === type ? 'bg-sky-500/20' : 'hover:bg-white/10'
            }`}
        >
          <span className="text-lg">{REACTION_EMOJIS[type]}</span>
        </motion.button>
      ))}
    </motion.div>
  )
}

interface ReactionBadgesProps {
  reactions: CommentReactions | Record<string, number>
  userReaction?: ReactionType | null
  onReact: (type: ReactionType) => void
  compact?: boolean
}

export function ReactionBadges({ reactions, userReaction, onReact, compact }: ReactionBadgesProps) {
  const activeReactions = REACTION_TYPES.filter(
    (type) => reactions[type] > 0
  )

  if (activeReactions.length === 0) {
    return (
      <button
        onClick={() => onReact('like')}
        className="flex items-center gap-1 text-gray-400 hover:text-sky-500 transition-colors text-sm"
      >
        <span>👍</span>
        {!compact && <span>React</span>}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {activeReactions.map((type) => (
        <motion.button
          key={type}
          onClick={() => onReact(type)}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${userReaction === type
              ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30'
              : 'bg-[#252535] text-gray-400 hover:bg-[#2a2a3a]'
            }`}
        >
          <span>{REACTION_EMOJIS[type]}</span>
          <span>{reactions[type]}</span>
        </motion.button>
      ))}
    </div>
  )
}
