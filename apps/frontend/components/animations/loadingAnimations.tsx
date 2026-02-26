'use client'

import { motion, Variants } from 'framer-motion'

export const skeletonShimmer = {
  background: 'linear-gradient(90deg, #1a2420 25%, #243030 50%, #1a2420 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite'
}

export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity
    }
  }
}

export const bounceVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

export const spinVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

export function LoadingSpinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <motion.div
      className={`rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      variants={spinVariants}
      animate="animate"
    />
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#1a2420] rounded ${className}`} />
  )
}

export function PostCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-2 gap-0.5 bg-[#1a2420]">
        <div className="aspect-square bg-[#243030] animate-pulse" />
        <div className="aspect-square bg-[#243030] animate-pulse" />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-20 bg-[#243030] rounded-full animate-pulse" />
          <div className="h-4 w-16 bg-[#243030] rounded animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-[#243030] rounded mb-4 animate-pulse" />
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex gap-4">
            <div className="h-4 w-12 bg-[#243030] rounded animate-pulse" />
            <div className="h-4 w-12 bg-[#243030] rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-[#243030] rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-48 bg-[#1a2420] rounded-3xl animate-pulse" />
      <div className="glass-card p-6">
        <div className="h-5 w-32 bg-[#243030] rounded mb-6 animate-pulse" />
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex justify-between">
                <div className="h-5 w-24 bg-[#243030] rounded animate-pulse" />
                <div className="h-5 w-20 bg-[#243030] rounded animate-pulse" />
              </div>
              <div className="h-3 bg-[#243030] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-current"
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

export function PullToRefreshIndicator({ isPulling, pullProgress }: { isPulling: boolean; pullProgress: number }) {
  return (
    <motion.div
      className="flex items-center justify-center py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: isPulling ? 1 : 0,
        y: isPulling ? 0 : -20,
        rotate: pullProgress * 360
      }}
    >
      <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </motion.div>
  )
}
