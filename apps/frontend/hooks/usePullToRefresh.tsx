'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const y = useMotionValue(0)
  const pullProgress = useTransform(y, [0, threshold], [0, 1])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return
    
    const currentY = e.touches[0].clientY
    const diff = Math.max(0, currentY - startY.current)
    
    if (diff > 0) {
      y.set(Math.min(diff * 0.5, threshold * 1.5))
    }
  }, [isPulling, isRefreshing, y, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return
    
    const currentY = y.get()
    
    if (currentY >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    y.set(0)
    setIsPulling(false)
  }, [isPulling, isRefreshing, threshold, onRefresh, y])

  const bind = {
    ref: containerRef,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }

  return {
    bind,
    isRefreshing,
    isPulling,
    pullProgress,
    y,
  }
}

export function PullToRefresh({ 
  onRefresh, 
  children 
}: { 
  onRefresh: () => Promise<void>
  children: React.ReactNode 
}) {
  const { bind, isRefreshing, isPulling, pullProgress, y } = usePullToRefresh({ onRefresh })

  return (
    <div {...bind} className="min-h-screen overflow-y-auto">
      <motion.div
        className="flex items-center justify-center py-4 overflow-hidden"
        style={{ height: y }}
      >
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : pullProgress.get() * 360,
          }}
          transition={{
            rotate: isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 },
          }}
        >
          <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </motion.div>
      </motion.div>
      {children}
    </div>
  )
}
