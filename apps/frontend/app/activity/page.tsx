'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import type { ActivityPost } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Skeleton } from '@/components/ui/Skeleton'

type FilterType = 'all' | 'live' | 'ended'

export default function ActivityPage() {
  const [posts, setPosts] = useState<ActivityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const observerRef = useRef<HTMLDivElement>(null)

  const loadActivity = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const response = await api.getUserActivity(pageNum, 12)
      const newPosts = response.data.posts || []

      if (append) {
        setPosts(prev => [...prev, ...newPosts])
      } else {
        setPosts(newPosts)
      }

      setHasMore(response.data.pagination?.has_more ?? false)
    } catch (error) {
      console.error('Failed to load activity:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    loadActivity(1, false)
  }, [filter, loadActivity])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          loadActivity(nextPage, true)
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, page, loadActivity])

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true
    if (filter === 'live') return !post.is_expired
    if (filter === 'ended') return post.is_expired
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const postTypeLabel: Record<string, string> = {
    rate: 'Rate 1-10',
    poll: 'Poll',
    wyr: 'Would You Rather',
    rank: 'Ranking',
    compare: 'Compare',
  }

  const postTypeColor: Record<string, string> = {
    rate: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    poll: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    wyr: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    rank: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    compare: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header />

      <main className="lg:ml-64 pb-28 lg:pb-8">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-xl sm:text-2xl font-bold text-white">My Activity</h1>
            <p className="text-gray-400 text-sm sm:text-base">Posts you&apos;ve voted on</p>
          </motion.div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 p-1 glass-strong rounded-xl w-fit">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all'
                ? 'bg-gradient-to-r from-sky-500 to-purple-600 text-white shadow-lg shadow-sky-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('live')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'live'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Live
            </button>
            <button
              onClick={() => setFilter('ended')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'ended'
                ? 'bg-gradient-to-r from-sky-500 to-purple-600 text-white shadow-lg shadow-sky-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Ended
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <motion.div
              className="text-center py-16 glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-white mb-2">No activity yet</h3>
              <p className="text-gray-400">
                {filter === 'all'
                  ? "You haven't voted on any posts yet"
                  : filter === 'live'
                    ? "No active posts to show"
                    : "No ended posts to show"
                }
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, index) => (
                <motion.a
                  key={post.id}
                  href={`/p/${post.id}/results`}
                  className="block glass-card group overflow-hidden"
                  whileHover={{ y: -4 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Card Preview */}
                  <div className="relative" style={{ borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                    {post.type === 'wyr' ? (
                      <div className="relative flex h-32">
                        <div className="flex-1 relative overflow-hidden bg-sky-900/30">
                          {post.items[0]?.image_url ? (
                            <img src={post.items[0].image_url} alt={post.items[0].name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-purple-500/20">
                              <span className="text-lg font-bold text-sky-400">{post.items[0]?.name?.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                          <div className="w-8 h-8 rounded-full glass-strong shadow-lg flex items-center justify-center">
                            <span className="text-xs font-black text-white">VS</span>
                          </div>
                        </div>
                        <div className="flex-1 relative overflow-hidden bg-amber-900/30">
                          {post.items[1]?.image_url ? (
                            <img src={post.items[1].image_url} alt={post.items[1].name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-red-500/20">
                              <span className="text-lg font-bold text-amber-400">{post.items[1]?.name?.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1 bg-[#1a1a25]/50">
                        {post.items.slice(0, 4).map((item, idx) => (
                          <div key={item.id} className="relative aspect-square overflow-hidden bg-[#1a1a25]/50">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name || `Option ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-500/10 to-purple-500/10">
                                <span className="text-2xl font-bold text-gray-500">{item.name?.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${post.is_expired
                      ? 'bg-[#1a1a25]/80 text-gray-400 border border-white/10'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                      {post.is_expired ? 'Ended' : 'Live'}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${postTypeColor[post.type]}`}>
                        {postTypeLabel[post.type]}
                      </span>
                    </div>

                    {post.caption && (
                      <p className="text-sm font-medium text-gray-300 mb-2 line-clamp-2">
                        {post.caption}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{post.vote_count} votes</span>
                      <span>You voted {formatDate(post.user_voted_at)}</span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          {hasMore && !loading && (
            <div ref={observerRef} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-gray-500">
                  <motion.div
                    className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Loading more...
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
