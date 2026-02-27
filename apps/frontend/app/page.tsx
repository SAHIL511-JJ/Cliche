'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import type { Post } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { FeedCard } from '@/components/feed/FeedCard'
import { PostCardSkeleton } from '@/components/animations/loadingAnimations'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

type FeedType = 'trending' | 'recent' | 'random'

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [feedType, setFeedType] = useState<FeedType>('trending')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<HTMLDivElement>(null)

  const loadPosts = useCallback(async (pageNum: number, type: FeedType, append = false) => {
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const response = await api.getFeed(type, pageNum, 12)
      const newPosts = response.data.posts || []

      if (append) {
        setPosts(prev => [...prev, ...newPosts])
      } else {
        setPosts(newPosts)
      }

      setHasMore(response.data.pagination?.has_more ?? false)
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    loadPosts(1, feedType, false)
  }, [feedType, loadPosts])

  // Realtime: update vote counts live on feed cards
  const realtimeConfigs = useMemo(() => [
    {
      table: 'posts',
      event: '*' as const,
      onUpdate: (payload: any) => {
        setPosts(prev =>
          prev.map(p =>
            p.id === String(payload.new.id)
              ? { ...p, vote_count: payload.new.vote_count, comment_count: payload.new.comment_count }
              : p
          )
        )
      },
      onInsert: () => {
        // New post created — refresh if on page 1
        if (page === 1) {
          loadPosts(1, feedType, false)
        }
      },
    },
  ], [feedType, page])

  useRealtimeSubscription(realtimeConfigs)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          loadPosts(nextPage, feedType, true)
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, page, feedType, loadPosts])

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header />

      <main className="lg:ml-64 pb-28 lg:pb-8">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="text-2xl sm:text-4xl font-black text-white mb-1 sm:mb-2">
              <span className="text-gradient">Discover</span> Posts
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">Vote on trending posts or create your own</p>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 p-1 sm:p-1.5 glass-strong rounded-xl w-fit"
          >
            {(['trending', 'recent', 'random'] as FeedType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFeedType(type)}
                className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all duration-300 ${feedType === type
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <motion.div
              className="text-center py-16 glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 glass-strong rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
              <p className="text-gray-400 mb-6">Be the first to create a post!</p>
              <a
                href="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all hover:-translate-y-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create the first post
              </a>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <FeedCard post={post} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}

          {loadingMore && (
            <div className="flex justify-center py-8">
              <motion.div
                className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}

          <div ref={observerRef} className="h-4" />

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-gray-500 text-sm py-8">
              You&apos;ve reached the end! 🎉
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
