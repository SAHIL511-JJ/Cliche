'use client'

import { motion } from 'framer-motion'

interface RateSliderProps {
  attribute: string
  value: number
  onChange: (value: number) => void
}

export function RateSlider({ attribute, value, onChange }: RateSliderProps) {
  const getScoreColor = (score: number) => {
    if (score <= 3) return '#ef4444'
    if (score <= 5) return '#f97316'
    if (score <= 7) return '#eab308'
    return '#22c55e'
  }

  const getScoreTextColor = (score: number) => {
    if (score <= 3) return 'text-red-400'
    if (score <= 5) return 'text-orange-400'
    if (score <= 7) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{attribute}</label>
        <motion.span
          key={value}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className={`text-lg font-bold ${getScoreTextColor(value)}`}
        >
          {value}
        </motion.span>
      </div>

      <div className="relative">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${getScoreColor(value)} ${(value / 10) * 100}%, #1a1a25 ${(value / 10) * 100}%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>
    </div>
  )
}
