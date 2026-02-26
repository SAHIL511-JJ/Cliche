'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/Button'

interface AdminPost {
  id: string
  type: string
  caption: string | null
  vote_count: number
  comment_count: number
  report_count: number
  created_at: string
  expires_at: string | null
  is_removed: boolean
  items: Array<{
    id: string
    name: string
    image_url: string | null
    vote_count: number
  }>
}

type TabType = 'all' | 'reported'

export default function AdminDashboard() {
  const router = useRouter()
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    // Check if admin
    if (!api.isAdmin()) {
      router.push('/admin/login')
      return
    }
    
    // Ensure browser_id exists
    if (typeof window !== 'undefined' && !localStorage.getItem('browser_id')) {
      // Create browser_id if it doesn't exist
      const browserId = 'admin-' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('browser_id', browserId)
    }
  }, [router])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = activeTab === 'all'
        ? `/admin/posts?page=${page}&limit=${limit}`
        : `/admin/posts/reported?page=${page}&limit=${limit}`

      const browserId = localStorage.getItem('browser_id') || ''
      console.log('Loading posts from:', endpoint, 'with browser_id:', browserId)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}${endpoint}`, {
        headers: {
          'X-Browser-ID': browserId,
        }
      })
      
      const data = await response.json()
      console.log('Response:', data)
      
      if (!response.ok) {
        console.error('API Error:', data)
        if (response.status === 401) {
          // Admin not authenticated
          router.push('/admin/login')
          return
        }
      }
      
      if (data.success && data.data.posts) {
        setPosts(data.data.posts)
        setTotal(data.data.pagination.total)
      } else {
        console.error('Unexpected response format:', data)
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, router])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    setDeleting(postId)
    try {
      await api.adminDeletePost(postId)
      setPosts(posts.filter(p => p.id !== postId))
      setTotal(total - 1)
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete post')
    } finally {
      setDeleting(null)
    }
  }

  const handleLogout = () => {
    api.logoutAdmin()
    router.push('/')
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
    rate: 'bg-violet-100 text-violet-700',
    poll: 'bg-sky-100 text-sky-700',
    wyr: 'bg-amber-100 text-amber-700',
    rank: 'bg-emerald-100 text-emerald-700',
    compare: 'bg-rose-100 text-rose-700',
  }

  const hasMore = posts.length > 0 && posts.length < total

  if (!api.isAdmin()) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="lg:ml-64 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-500">Manage posts and content</p>
            </div>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setActiveTab('all'); setPage(1); }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Posts ({total})
            </button>
            <button
              onClick={() => { setActiveTab('reported'); setPage(1); }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'reported'
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Reported Posts
            </button>
          </div>

          {/* Posts List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {activeTab === 'all' ? 'All Posts' : 'Reported Posts'}
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">✓</div>
                {activeTab === 'all' ? 'No posts yet' : 'No reported posts'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${postTypeColor[post.type] || 'bg-gray-100 text-gray-700'}`}>
                          {post.type.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 line-clamp-1">
                            {post.caption || 'Untitled post'}
                          </p>
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <span>{post.vote_count} votes</span>
                            <span>•</span>
                            <span>{post.comment_count} comments</span>
                            {post.report_count > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-red-500">{post.report_count} reports</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatDate(post.created_at)}</span>
                            {post.is_removed && (
                              <>
                                <span>•</span>
                                <span className="text-red-600 font-medium">Removed</span>
                              </>
                            )}
                          </div>
                          
                          {/* Items preview */}
                          {post.items.length > 0 && (
                            <div className="flex gap-2 mt-2 overflow-x-auto">
                              {post.items.slice(0, 3).map((item, idx) => (
                                <div key={item.id} className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 overflow-hidden">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                      {item.name.slice(0, 2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {post.items.length > 3 && (
                                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500 flex-shrink-0">
                                  +{post.items.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deleting === post.id}
                          onClick={() => handleDelete(post.id)}
                          disabled={post.is_removed}
                        >
                          {post.is_removed ? 'Deleted' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && posts.length > 0 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
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
          </div>
        </div>
      </main>
    </div>
  )
}
