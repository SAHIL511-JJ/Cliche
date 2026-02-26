'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import type { ResultsResponse } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/Button'
import { ResultsSkeleton } from '@/components/animations/loadingAnimations'
import { ShareSheet } from '@/components/layout/ShareSheet'
import { CommentsSection } from '@/components/comments'
import { useToast } from '@/components/ui/Toast'
import { ImageLightbox } from '@/components/ui/ImageLightbox'

const TYPE_LABELS: Record<string, string> = {
  poll: '📊 Poll Results',
  wyr: '🤔 Would You Rather Results',
  rate: '⭐ Rating Results',
  compare: '⚖️ Comparison Results',
  rank: '🏆 Ranking Results',
}

const TYPE_COLORS: Record<string, string> = {
  poll: 'from-sky-500 to-indigo-500',
  wyr: 'from-amber-500 to-orange-500',
  rate: 'from-violet-500 to-purple-500',
  compare: 'from-rose-500 to-pink-500',
  rank: 'from-emerald-500 to-teal-500',
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [data, setData] = useState<ResultsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadResults()
  }, [postId])

  const loadResults = async () => {
    try {
      const response = await api.getResults(postId)
      setData(response.data)

      const myPostsResponse = await api.getMyPosts(1, 20)
      if (myPostsResponse.success && myPostsResponse.data.posts) {
        const isPostOwner = myPostsResponse.data.posts.some(p => p.id === postId)
        setIsOwner(isPostOwner)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deletePost(postId)
      showToast('Post deleted successfully', 'success')
      router.push('/my-posts')
    } catch (err: any) {
      showToast(err.message || 'Failed to delete post', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <Header showBack />
        <main className="lg:ml-64 max-w-4xl mx-auto px-4 py-8">
          <ResultsSkeleton />
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sidebar />
        <div className="text-center">
          <p className="text-gray-400 mb-4">{error || 'Results not found'}</p>
          <a href="/" className="text-sky-400 hover:text-sky-300">Go home</a>
        </div>
      </div>
    )
  }

  const { post, results } = data
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${postId}` : ''
  const isExpired = post.expires_at && new Date(post.expires_at) < new Date()
  const typeColor = TYPE_COLORS[post.type] || TYPE_COLORS.poll

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header
        showBack
        rightAction={
          <div className="flex items-center gap-2">
            {isOwner && (
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-3 py-2 text-red-400 font-medium text-sm hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
            <button onClick={() => setShowShareSheet(true)}
              className="flex items-center gap-2 px-4 py-2 text-sky-400 font-medium text-sm hover:bg-sky-500/10 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        }
      />

      <main className="lg:ml-64 pb-28 lg:pb-8">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* ── Main Results Column ────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Header Banner */}
              <motion.div
                className="glass-card p-4 sm:p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <span className={`text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-lg bg-gradient-to-r ${typeColor} text-white`}>
                    {post.type.toUpperCase()}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isExpired ? 'bg-gray-500/20 text-gray-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {isExpired ? '🔒 Ended' : '🟢 Live'}
                  </span>
                </div>
                {post.caption && (
                  <h1 className="text-lg sm:text-2xl font-bold text-white mt-3">{post.caption}</h1>
                )}
                <div className="flex items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-gray-500 flex-wrap">
                  <span>{post.vote_count} {post.vote_count === 1 ? 'vote' : 'votes'}</span>
                  <span>•</span>
                  <span>{post.comment_count || 0} {(post.comment_count || 0) === 1 ? 'comment' : 'comments'}</span>
                  {post.expires_at && (
                    <>
                      <span>•</span>
                      <span>{isExpired ? 'Ended' : 'Ends'} {new Date(post.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>
              </motion.div>

              {/* ── POLL RESULTS ───────────────────────── */}
              {post.type === 'poll' && (
                <motion.div className="glass-card p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h3 className="text-lg font-semibold text-white mb-6">📊 Vote Breakdown</h3>
                  <div className="space-y-5">
                    {results.items.map((item, index) => {
                      const isWinner = results.winner?.item_id === item.id
                      const pct = item.percentage ?? 0
                      return (
                        <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + index * 0.1 }}>
                          <div className="flex items-center gap-3 sm:gap-4 mb-2">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl object-cover border border-white/10 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxSrc(item.image_url)} loading="lazy" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-[#1a1a25] flex items-center justify-center border border-white/10">
                                <span className="text-xl font-bold text-gray-600">{item.name.charAt(0)}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isWinner && <span className="text-lg">🏆</span>}
                                <span className="font-semibold text-white truncate">{item.name}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-lg sm:text-xl font-black text-white">{pct.toFixed(1)}%</div>
                              <div className="text-xs text-gray-500">{item.vote_count} {item.vote_count === 1 ? 'vote' : 'votes'}</div>
                            </div>
                          </div>
                          <div className="h-3 bg-[#1a1a25] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
                              className={`h-full rounded-full ${isWinner ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-sky-400 to-sky-500'}`}
                            />
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── WYR RESULTS ────────────────────── */}
              {post.type === 'wyr' && results.items.length === 2 && (() => {
                const [a, b] = results.items
                const aPct = a.percentage ?? 0
                const bPct = b.percentage ?? 0
                const aWins = aPct >= bPct
                return (
                  <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {/* Full-width split visual */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {[a, b].map((item, idx) => {
                        const pct = item.percentage ?? 0
                        const isLeading = idx === 0 ? aWins : !aWins
                        const gradient = idx === 0 ? 'from-sky-600 to-indigo-600' : 'from-amber-500 to-orange-500'
                        return (
                          <motion.div
                            key={item.id}
                            className={`relative rounded-2xl overflow-hidden ${isLeading ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/20' : ''}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + idx * 0.15 }}
                          >
                            <div className="h-32 sm:h-48 relative">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxSrc(item.image_url)} loading="lazy" />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-40`} />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                              {isLeading && isExpired && (
                                <div className="absolute top-3 left-3 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-lg shadow-lg">🏆</div>
                              )}
                            </div>
                            <div className="p-3 sm:p-4 bg-[#14141e]">
                              <p className="font-bold text-white text-sm sm:text-lg mb-1 truncate">{item.name}</p>
                              <div className="flex items-end gap-1 sm:gap-2">
                                <span className={`text-2xl sm:text-3xl font-black ${idx === 0 ? 'text-sky-400' : 'text-amber-400'}`}>{pct.toFixed(1)}%</span>
                                <span className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">{item.vote_count} votes</span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* WYR Progress bar */}
                    <motion.div className="glass-card p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs sm:text-sm font-semibold text-sky-400 truncate max-w-[40%]">{a.name}</span>
                        <span className="text-xs sm:text-sm font-semibold text-amber-400 truncate max-w-[40%] text-right">{b.name}</span>
                      </div>
                      <div className="h-6 bg-[#1a1a25] rounded-full overflow-hidden flex">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${aPct}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-sky-600 to-sky-400 flex items-center justify-end pr-2"
                        >
                          {aPct > 15 && <span className="text-xs font-bold text-white">{aPct.toFixed(0)}%</span>}
                        </motion.div>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${bPct}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-l from-amber-500 to-amber-400 flex items-center justify-start pl-2"
                        >
                          {bPct > 15 && <span className="text-xs font-bold text-white">{bPct.toFixed(0)}%</span>}
                        </motion.div>
                      </div>
                      <p className="text-center text-sm text-gray-500 mt-3">{post.vote_count} total votes</p>
                    </motion.div>
                  </motion.div>
                )
              })()}

              {/* ── RATE RESULTS ──────────────────── */}
              {post.type === 'rate' && results.items.length > 0 && (() => {
                const item = results.items[0]
                const scores = item.avg_scores || {}
                const overallAvg = Object.keys(scores).length > 0
                  ? Object.values(scores).reduce((s, v) => s + v, 0) / Object.keys(scores).length
                  : 0
                const getColor = (score: number) => {
                  if (score <= 3) return 'from-red-500 to-red-400'
                  if (score <= 5) return 'from-orange-500 to-orange-400'
                  if (score <= 7) return 'from-yellow-500 to-yellow-400'
                  return 'from-emerald-500 to-emerald-400'
                }
                const getTextColor = (score: number) => {
                  if (score <= 3) return 'text-red-400'
                  if (score <= 5) return 'text-orange-400'
                  if (score <= 7) return 'text-yellow-400'
                  return 'text-emerald-400'
                }
                return (
                  <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {/* Hero card with image + overall score */}
                    <div className="glass-card overflow-hidden">
                      {item.image_url && (
                        <div className="relative h-40 sm:h-56 cursor-pointer" onClick={() => setLightboxSrc(item.image_url)}>
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#14141e] via-transparent to-transparent" />
                        </div>
                      )}
                      <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg sm:text-xl font-bold text-white">{item.name}</h3>
                          <div className="text-right">
                            <div className={`text-3xl sm:text-4xl font-black ${getTextColor(overallAvg)}`}>{overallAvg.toFixed(1)}</div>
                            <div className="text-xs text-gray-500 font-semibold">OUT OF 10</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">{post.vote_count} ratings</p>
                      </div>
                    </div>

                    {/* Attribute breakdown */}
                    <div className="glass-card p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">⭐ Attribute Scores</h3>
                      <div className="space-y-5">
                        {Object.entries(scores).sort(([, a], [, b]) => (b as number) - (a as number)).map(([attr, score], index) => {
                          const s = score as number
                          return (
                            <motion.div key={attr} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.08 }}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-300">{attr}</span>
                                <span className={`text-lg font-black ${getTextColor(s)}`}>{s.toFixed(1)}</span>
                              </div>
                              <div className="h-3 bg-[#1a1a25] rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(s / 10) * 100}%` }}
                                  transition={{ duration: 0.8, delay: 0.3 + index * 0.08, ease: 'easeOut' }}
                                  className={`h-full rounded-full bg-gradient-to-r ${getColor(s)}`}
                                />
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )
              })()}

              {/* ── COMPARE RESULTS ───────────────── */}
              {post.type === 'compare' && (() => {
                const sortedItems = [...results.items].sort((a, b) => {
                  const aScore = a.avg_scores ? Object.values(a.avg_scores).reduce((s, v) => s + v, 0) / Object.keys(a.avg_scores).length : 0
                  const bScore = b.avg_scores ? Object.values(b.avg_scores).reduce((s, v) => s + v, 0) / Object.keys(b.avg_scores).length : 0
                  return bScore - aScore
                })
                const getColor = (score: number) => {
                  if (score <= 3) return 'from-red-500 to-red-400'
                  if (score <= 5) return 'from-orange-500 to-orange-400'
                  if (score <= 7) return 'from-yellow-500 to-yellow-400'
                  return 'from-emerald-500 to-emerald-400'
                }
                const getTextColor = (score: number) => {
                  if (score <= 3) return 'text-red-400'
                  if (score <= 5) return 'text-orange-400'
                  if (score <= 7) return 'text-yellow-400'
                  return 'text-emerald-400'
                }
                return (
                  <motion.div className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <h3 className="text-lg font-semibold text-white">⚖️ Head-to-Head Comparison</h3>
                    {sortedItems.map((item, index) => {
                      const overallAvg = item.avg_scores
                        ? Object.values(item.avg_scores).reduce((s, v) => s + v, 0) / Object.keys(item.avg_scores).length
                        : 0
                      return (
                        <motion.div key={item.id} className="glass-card overflow-hidden"
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.1 }}>
                          {/* Item header */}
                          <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 border-b border-white/5">
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${index === 0 ? 'bg-amber-400 text-white' : index === 1 ? 'bg-gray-400 text-white' : index === 2 ? 'bg-orange-600 text-white' : 'bg-[#252535] text-gray-500'
                              }`}>{index + 1}</span>
                            {item.image_url && (
                              <img src={item.image_url} className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover border border-white/10 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxSrc(item.image_url)} loading="lazy" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {index === 0 && isExpired && <span>🏆</span>}
                                <span className="font-bold text-white text-base sm:text-lg truncate">{item.name}</span>
                              </div>
                              <p className="text-sm text-gray-500">{post.vote_count} ratings</p>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl sm:text-3xl font-black ${getTextColor(overallAvg)}`}>{overallAvg.toFixed(1)}</div>
                              <div className="text-xs text-gray-500 font-semibold">OVERALL</div>
                            </div>
                          </div>
                          {/* Attribute bars */}
                          {item.avg_scores && (
                            <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                              {Object.entries(item.avg_scores).map(([attr, score]) => {
                                const s = score as number
                                return (
                                  <div key={attr}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-sm font-medium text-gray-400">{attr}</span>
                                      <span className={`text-sm font-bold ${getTextColor(s)}`}>{s.toFixed(1)}/10</span>
                                    </div>
                                    <div className="h-2.5 bg-[#1a1a25] rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(s / 10) * 100}%` }}
                                        transition={{ duration: 0.8, delay: 0.4 + index * 0.1, ease: 'easeOut' }}
                                        className={`h-full rounded-full bg-gradient-to-r ${getColor(s)}`}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )
              })()}

              {/* ── RANK RESULTS ──────────────────── */}
              {post.type === 'rank' && (
                <motion.div className="glass-card p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h3 className="text-lg font-semibold text-white mb-6">🏆 Final Rankings</h3>
                  <div className="space-y-3">
                    {results.items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all ${index === 0 ? 'bg-amber-500/10 border-amber-500/20' :
                          index === 1 ? 'bg-gray-500/10 border-gray-500/20' :
                            index === 2 ? 'bg-orange-500/10 border-orange-500/20' :
                              'bg-[#1a1a25]/50 border-white/5'
                          }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.12 }}
                      >
                        <span className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                            index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-[#252535] text-gray-500'
                          }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </span>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-white/10 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxSrc(item.image_url)} loading="lazy" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-[#252535] flex items-center justify-center border border-white/10">
                            <span className="text-2xl font-bold text-gray-500">{item.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-white text-base sm:text-lg block truncate">{item.name}</span>
                          {item.avg_position !== undefined && item.avg_position !== null && (
                            <span className="text-sm text-gray-500">Average rank: <span className="text-white font-semibold">#{item.avg_position.toFixed(1)}</span></span>
                          )}
                        </div>
                        {index === 0 && (
                          <div className="text-2xl shrink-0">🏆</div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-4">{post.vote_count} {post.vote_count === 1 ? 'ranking' : 'rankings'} submitted</p>
                </motion.div>
              )}

              {/* Comments - Mobile */}
              <div className="lg:hidden">
                <CommentsSection postId={postId} />
              </div>
            </div>

            {/* ── Sidebar ────────────────────────────── */}
            <div className="space-y-6">
              {/* Winner Card (only if expired) */}
              {results.winner && isExpired && (
                <motion.div
                  className="glass-card p-4 sm:p-6 text-center relative overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                >
                  <div className="absolute top-2 right-2 text-5xl opacity-10">🏆</div>
                  <motion.div
                    className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl mb-3 shadow-lg shadow-amber-500/30"
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
                  >
                    <span className="text-2xl">🏆</span>
                  </motion.div>
                  <p className="text-sm font-semibold text-gray-400 mb-1">Winner</p>
                  <p className="text-xl font-bold text-white">{results.winner.name}</p>
                  <div className="flex items-center justify-center flex-wrap gap-2 mt-3">
                    {results.winner.overall_score !== undefined && results.winner.overall_score !== null && (
                      <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-gray-300">
                        Score: {results.winner.overall_score.toFixed(1)}/10
                      </span>
                    )}
                    {results.winner.percentage !== undefined && results.winner.percentage !== null && (
                      <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-gray-300">
                        {results.winner.percentage.toFixed(1)}% votes
                      </span>
                    )}
                    {results.winner.avg_position !== undefined && (
                      <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-gray-300">
                        Avg #{results.winner.avg_position.toFixed(1)}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Quick Stats */}
              <motion.div
                className="glass-card p-4 sm:p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#1a1a25]/50 rounded-xl">
                    <span className="text-gray-400 text-sm">Total Votes</span>
                    <span className="text-lg font-bold text-white">{post.vote_count}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#1a1a25]/50 rounded-xl">
                    <span className="text-gray-400 text-sm">Comments</span>
                    <span className="text-lg font-bold text-white">{post.comment_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#1a1a25]/50 rounded-xl">
                    <span className="text-gray-400 text-sm">Status</span>
                    <span className={`text-sm font-semibold ${isExpired ? 'text-gray-400' : 'text-emerald-400'}`}>
                      {isExpired ? 'Ended' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#1a1a25]/50 rounded-xl">
                    <span className="text-gray-400 text-sm">Type</span>
                    <span className="text-sm font-medium text-white">{TYPE_LABELS[post.type]?.split(' ').slice(1).join(' ') || post.type}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button onClick={() => setShowShareSheet(true)} variant="secondary" className="w-full">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Results
                  </Button>
                  <a href="/create" className="block w-full py-3 text-center text-sky-400 font-medium hover:bg-sky-500/10 rounded-xl transition-colors">
                    Create your own post →
                  </a>
                </div>
              </motion.div>

              {/* Comments - Desktop */}
              <div className="hidden lg:block">
                <CommentsSection postId={postId} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <ShareSheet isOpen={showShareSheet} onClose={() => setShowShareSheet(false)} url={shareUrl} title={post.caption || 'Check out this poll!'} />
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
