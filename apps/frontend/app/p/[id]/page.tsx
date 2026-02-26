'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import type { Post, Vote } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/Button'
import { RateSlider } from '@/components/vote/RateSlider'
import { PollOption } from '@/components/vote/PollOption'
import { WyrVote } from '@/components/vote/WyrVote'
import { ResultsSkeleton } from '@/components/animations/loadingAnimations'
import { ReportModal } from '@/components/post/ReportModal'

export default function VotePage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({})
  const [ranking, setRanking] = useState<string[]>([])

  useEffect(() => {
    loadPost()
  }, [postId])

  const loadPost = async () => {
    try {
      const response = await api.getPost(postId)
      setPost(response.data)

      if (response.data.has_voted) {
        router.push(`/p/${postId}/results`)
        return
      }

      if ((response.data.type === 'rate' || response.data.type === 'compare') && response.data.attributes) {
        const initialRatings: Record<string, Record<string, number>> = {}
        response.data.items.forEach((item) => {
          initialRatings[item.id] = {}
          response.data.attributes!.forEach((attr) => {
            initialRatings[item.id][attr] = 5
          })
        })
        setRatings(initialRatings)
      }

      if (response.data.type === 'rate') {
        setSelectedItemId(response.data.items[0]?.id ?? null)
      }

      if (response.data.type === 'rank') {
        setRanking(response.data.items.map((i) => i.id))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const handleRatingChange = (itemId: string, attribute: string, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [attribute]: value,
      },
    }))
  }

  const handleRankingChange = (newRanking: string[]) => {
    setRanking(newRanking)
  }

  const handleWyrVote = async (itemId: string) => {
    if (!post || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await api.submitVote(postId, { item_id: itemId })
      router.push(`/p/${postId}/results`)
    } catch (err: any) {
      if (err.code === 'ALREADY_VOTED') {
        router.push(`/p/${postId}/results`)
        return
      }
      setError(err.message || 'Failed to submit vote')
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!post) return
    setSubmitting(true)
    setError(null)

    try {
      let vote: Vote = {}

      switch (post.type) {
        case 'rate':
          if (!selectedItemId) {
            setError('Please select an item to rate')
            setSubmitting(false)
            return
          }
          vote = {
            item_id: selectedItemId,
            ratings: ratings[selectedItemId],
          }
          break

        case 'compare':
          const hasAllRatings = post.items.every(
            item => ratings[item.id] && Object.keys(ratings[item.id]).length > 0
          )
          if (!hasAllRatings) {
            setError('Please rate all items before submitting')
            setSubmitting(false)
            return
          }
          vote = { multi_ratings: ratings }
          break

        case 'poll':
          if (!selectedItemId) {
            setError('Please select an option')
            setSubmitting(false)
            return
          }
          vote = {
            item_id: selectedItemId,
          }
          break

        case 'wyr':
          if (!selectedItemId) {
            setError('Please select an option')
            setSubmitting(false)
            return
          }
          vote = {
            item_id: selectedItemId,
          }
          break

        case 'rank':
          vote = {
            ranking,
          }
          break
      }

      await api.submitVote(postId, vote)
      router.push(`/p/${postId}/results`)
    } catch (err: any) {
      if (err.code === 'ALREADY_VOTED') {
        router.push(`/p/${postId}/results`)
        return
      }
      setError(err.message || 'Failed to submit vote')
    } finally {
      setSubmitting(false)
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

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sidebar />
        <div className="text-center">
          <p className="text-gray-400 mb-4">{error || 'Post not found'}</p>
          <a href="/" className="text-sky-400 hover:text-sky-300">
            Go home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header
        showBack
        rightAction={
          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </button>
        }
      />

      <main className="lg:ml-64 pb-28 sm:pb-32">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {post.caption && <h1 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">{post.caption}</h1>}

            {post.type === 'wyr' && (
              <WyrVote items={post.items} onVote={handleWyrVote} submitting={submitting} />
            )}

            {post.type === 'poll' && (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8"
                initial="initial"
                animate="animate"
                variants={{
                  animate: { transition: { staggerChildren: 0.1 } },
                }}
              >
                {post.items.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={{
                      initial: { opacity: 0, y: 20 },
                      animate: { opacity: 1, y: 0 },
                    }}
                  >
                    <PollOption
                      item={item}
                      selected={selectedItemId === item.id}
                      onClick={() => setSelectedItemId(item.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {post.type === 'rate' && post.attributes && selectedItemId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="glass-card p-6"
              >
                {/* Hero image for rate */}
                {post.items[0]?.image_url && (
                  <div className="relative h-52 rounded-xl overflow-hidden mb-6">
                    <img src={post.items[0].image_url} alt={post.items[0].name}
                      className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14141e] via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="text-xl font-black text-white">{post.items[0]?.name}</h3>
                    </div>
                  </div>
                )}
                {!post.items[0]?.image_url && (
                  <h3 className="font-semibold text-white mb-6">
                    Rate: {post.items[0]?.name}
                  </h3>
                )}
                <div className="space-y-6">
                  {post.attributes.map((attr, index) => (
                    <motion.div
                      key={attr}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <RateSlider
                        attribute={attr}
                        value={ratings[selectedItemId]?.[attr] || 5}
                        onChange={(value) => handleRatingChange(selectedItemId, attr, value)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {post.type === 'compare' && (
              <div className="space-y-6 mb-8">
                <p className="text-sm text-gray-400 font-medium">Rate each item on all attributes:</p>
                {post.items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    className="glass-card p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="flex items-center gap-4 mb-5">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-xl object-cover border border-white/10" />
                      )}
                      <h3 className="font-bold text-white text-lg">{item.name}</h3>
                    </div>
                    <div className="space-y-5">
                      {post.attributes?.map((attr) => (
                        <RateSlider
                          key={attr}
                          attribute={attr}
                          value={ratings[item.id]?.[attr] || 5}
                          onChange={(value) => handleRatingChange(item.id, attr, value)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {post.type === 'rank' && (
              <motion.div
                className="space-y-3 mb-8"
                initial="initial"
                animate="animate"
                variants={{
                  animate: { transition: { staggerChildren: 0.08 } },
                }}
              >
                <p className="text-sm text-gray-400 mb-4">Reorder items (top = best):</p>
                {ranking.map((itemId, index) => {
                  const item = post.items.find((i) => i.id === itemId)
                  if (!item) return null

                  return (
                    <motion.div
                      key={itemId}
                      layout
                      variants={{
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                      }}
                      className="flex items-center gap-4 p-4 glass-card"
                    >
                      <motion.span
                        className="w-8 h-8 flex items-center justify-center bg-sky-500/20 text-sky-400 rounded-full text-sm font-bold"
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' }}
                      >
                        {index + 1}
                      </motion.span>
                      {/* Drag handle icon */}
                      <span className="text-gray-600 text-lg select-none cursor-grab">⠿</span>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-xl object-cover border border-white/10" loading="lazy" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-[#1a1a25] flex items-center justify-center border border-white/10">
                          <span className="text-2xl font-bold text-gray-500">{item.name.charAt(0)}</span>
                        </div>
                      )}
                      <span className="flex-1 font-medium text-white">{item.name}</span>
                      <div className="flex gap-2">
                        {index > 0 && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              const newRanking = [...ranking]
                                ;[newRanking[index - 1], newRanking[index]] = [newRanking[index], newRanking[index - 1]]
                              handleRankingChange(newRanking)
                            }}
                            className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            ↑
                          </motion.button>
                        )}
                        {index < ranking.length - 1 && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              const newRanking = [...ranking]
                                ;[newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]]
                              handleRankingChange(newRanking)
                            }}
                            className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            ↓
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            {error && (
              <motion.div
                className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      {post.type !== 'wyr' && (
        <motion.div
          className="fixed bottom-[60px] lg:bottom-0 left-0 right-0 lg:left-64 p-4 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 z-50"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={handleSubmit}
              loading={submitting}
              className="w-full md:w-auto md:min-w-[200px] md:mx-auto md:block"
            >
              Submit Vote
            </Button>
          </div>
        </motion.div>
      )}

      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} postId={postId} />
    </div>
  )
}
