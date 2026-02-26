'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import type { Post } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface MyPost extends Post {
  is_expired: boolean
  is_removed: boolean
}

export default function MyPostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<MyPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getMyPosts(page, limit)
      if (data.success && data.data.posts) {
        setPosts(data.data.posts as MyPost[])
        setTotal(data.data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    setDeleting(postId)
    try {
      await api.deletePost(postId)
      setPosts(posts.filter(p => p.id !== postId))
      setTotal(total - 1)
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete post')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const postTypeColor: Record<string, string> = {
    rate: 'bg-violet-500/20 text-violet-400',
    poll: 'bg-sky-500/20 text-sky-400',
    wyr: 'bg-amber-500/20 text-amber-400',
    rank: 'bg-emerald-500/20 text-emerald-400',
    compare: 'bg-rose-500/20 text-rose-400',
  }

  const hasMore = posts.length > 0 && posts.length < total

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header />

      <main className="lg:ml-64 pb-28 lg:pb-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">My Posts</h1>
              <p className="text-gray-400 text-sm sm:text-base">Manage your created posts</p>
            </div>
            <Link href="/create">
              <Button>Create New</Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-sky-400">{total}</div>
              <div className="text-sm text-gray-400">Total Posts</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-emerald-400">
                {posts.filter(p => !p.is_removed && !p.is_expired).length}
              </div>
              <div className="text-sm text-gray-400">Active</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-amber-400">
                {posts.filter(p => p.is_expired).length}
              </div>
              <div className="text-sm text-gray-400">Expired</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-red-400">
                {posts.filter(p => p.is_removed).length}
              </div>
              <div className="text-sm text-gray-400">Deleted</div>
            </div>
          </motion.div>

          {/* Posts List */}
          <motion.div
            className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Your Posts</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-gray-400 mb-4">You haven&apos;t created any posts yet</p>
                <Link href="/create">
                  <Button>Create Your First Post</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/p/${post.id}`} className="flex items-start gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${postTypeColor[post.type] || 'bg-gray-500/20 text-gray-400'}`}>
                          {post.type.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white line-clamp-1 hover:text-sky-400 transition-colors">
                            {post.caption || 'Untitled post'}
                          </p>
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <span>{post.vote_count} votes</span>
                            <span>•</span>
                            <span>{post.comment_count} comments</span>
                            <span>•</span>
                            <span>{formatDate(post.created_at)}</span>
                            {post.is_removed && (
                              <>
                                <span>•</span>
                                <span className="text-red-400 font-medium">Deleted</span>
                              </>
                            )}
                            {post.is_expired && !post.is_removed && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-medium">Expired</span>
                              </>
                            )}
                          </div>

                          {/* Items preview */}
                          {post.items.length > 0 && (
                            <div className="flex gap-2 mt-2 overflow-x-auto">
                              {post.items.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex-shrink-0 w-16 h-16 rounded-lg bg-[#1a1a25] overflow-hidden border border-white/10">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                      {item.name.slice(0, 2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {post.items.length > 3 && (
                                <div className="w-16 h-16 rounded-lg bg-[#1a1a25] flex items-center justify-center text-sm text-gray-500 flex-shrink-0 border border-white/10">
                                  +{post.items.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!post.is_removed && (
                          <Button
                            variant="danger"
                            size="sm"
                            loading={deleting === post.id}
                            onClick={(e) => {
                              e.preventDefault()
                              handleDelete(post.id)
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && posts.length > 0 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
