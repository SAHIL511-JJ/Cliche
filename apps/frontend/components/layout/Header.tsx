'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MobileNav } from './Sidebar'

interface HeaderProps {
  showBack?: boolean
  title?: string
  rightAction?: React.ReactNode
}

export function Header({ showBack, title, rightAction }: HeaderProps) {
  return (
    <>
      <motion.header
        className="sticky top-0 z-30 glass-strong border-b border-white/10 lg:hidden"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
          {showBack ? (
            <Link href="/" className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2">
              <motion.div
                whileHover={{ rotate: 180, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20"
              >
                <span className="text-white font-black text-sm">C</span>
              </motion.div>
              <span className="font-black text-xl text-white tracking-tight">Cliche</span>
            </Link>
          )}

          {title && (
            <span className="font-bold text-white">{title}</span>
          )}

          <div className="flex items-center gap-2">
            {rightAction}
          </div>
        </div>
      </motion.header>

      <MobileNav />
    </>
  )
}
