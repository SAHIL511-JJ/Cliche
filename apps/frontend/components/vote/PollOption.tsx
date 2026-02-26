'use client'

import { motion } from 'framer-motion'
import type { Item } from '@/lib/types'

interface PollOptionProps {
  item: Item
  selected: boolean
  onClick: () => void
}

export function PollOption({ item, selected, onClick }: PollOptionProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full rounded-2xl text-left transition-all overflow-hidden ${selected
          ? 'border-2 border-sky-500 shadow-lg shadow-sky-500/20'
          : 'border-2 border-white/10 hover:border-white/20 hover:shadow-lg'
        }`}
      style={{ background: selected ? 'rgba(14, 165, 233, 0.1)' : 'rgba(20, 20, 30, 0.6)' }}
    >
      <div className="relative h-48">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name || ''}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-sky-900/30 to-indigo-900/30 flex items-center justify-center">
            <span className="text-6xl font-bold text-sky-500/30">{(item.name || '?').charAt(0)}</span>
          </div>
        )}
        <div className={`absolute inset-0 transition-colors ${selected ? 'bg-sky-500/20' : 'bg-transparent'
          }`} />

        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="absolute top-4 right-4 w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/40"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}
      </div>

      <div className="p-4">
        <p className="font-semibold text-white text-lg">
          {item.name || 'Option'}
        </p>
        <p className="text-sm text-gray-400 mt-1">Click to vote</p>
      </div>
    </motion.button>
  )
}
