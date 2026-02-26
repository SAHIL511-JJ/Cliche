'use client'

import { motion, Variants } from 'framer-motion'
import { ReactNode, useState, useCallback } from 'react'

interface RippleProps {
  x: number
  y: number
  id: number
}

export const buttonVariants: Variants = {
  initial: { scale: 1 },
  tap: {
    scale: 0.95,
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  },
  hover: {
    scale: 1.02,
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  }
}

export const rippleVariants: Variants = {
  initial: { scale: 0, opacity: 0.3 },
  animate: {
    scale: 2,
    opacity: 0,
    transition: { duration: 0.6 }
  }
}

export const iconButtonVariants: Variants = {
  initial: { scale: 1, rotate: 0 },
  tap: {
    scale: 0.9,
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  },
  hover: {
    scale: 1.1,
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  }
}

interface RippleButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}

export function RippleButton({ children, onClick, className = '', disabled = false, type = 'button' }: RippleButtonProps) {
  const [ripples, setRipples] = useState<RippleProps[]>([])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    setRipples(prev => [...prev, { x, y, id }])

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 600)

    onClick?.()
  }, [onClick])

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
          }}
          variants={rippleVariants}
          initial="initial"
          animate="animate"
        />
      ))}
    </motion.button>
  )
}

export function AnimatedIconButton({ children, onClick, className = '' }: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <motion.button
      onClick={onClick}
      className={className}
      variants={iconButtonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
    >
      {children}
    </motion.button>
  )
}
