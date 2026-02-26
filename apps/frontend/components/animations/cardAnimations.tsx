'use client'

import { motion, useInView, Variants } from 'framer-motion'
import { useRef, ReactNode } from 'react'

export const cardVariants: Variants = {
  offscreen: {
    y: 50,
    opacity: 0,
    scale: 0.95
  },
  onscreen: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      bounce: 0.3,
      duration: 0.6
    }
  }
}

export const cardHover = {
  y: -4,
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  transition: { duration: 0.2 }
}

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  onClick?: () => void
}

export function AnimatedCard({ children, className = '', delay = 0, onClick }: AnimatedCardProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={cardVariants}
      initial="offscreen"
      animate={isInView ? 'onscreen' : 'offscreen'}
      transition={{ delay }}
      onClick={onClick}
      whileHover={onClick ? { y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  )
}

export function StaggeredList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        animate: {
          transition: {
            staggerChildren: 0.08
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggeredItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            type: 'spring',
            damping: 25,
            stiffness: 200
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}
