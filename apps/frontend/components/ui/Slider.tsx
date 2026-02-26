'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  className?: string
}

export function Slider({ 
  value, 
  onChange, 
  min = 1, 
  max = 10, 
  step = 1,
  label,
  className 
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  const getColor = () => {
    if (value <= 3) return 'bg-red-500'
    if (value <= 6) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <motion.span
            key={value}
            className="text-lg font-bold text-primary-500"
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {value}
          </motion.span>
        </div>
      )}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
        <motion.div
          className={cn('h-full rounded-full', getColor())}
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <motion.div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-md',
            'bg-white border-2',
            getColor().replace('bg-', 'border-')
          )}
          initial={false}
          animate={{ left: `calc(${percentage}% - 10px)` }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
