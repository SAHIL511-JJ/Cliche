'use client'

import type { Post } from '@/lib/types'
import { motion } from 'framer-motion'

interface FeedCardProps {
  post: Post
}

export function FeedCard({ post }: FeedCardProps) {
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

  const timeLeft = post.expires_at
    ? getTimeLeft(new Date(post.expires_at))
    : null

  return (
    <motion.a
      href={post.has_voted ? `/p/${post.id}/results` : `/p/${post.id}`}
      className="block glass-card group"
      whileHover={{ y: -4 }}
    >
      <div className="relative overflow-hidden" style={{ borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)' }}>
        {post.type === 'wyr' ? (
          <div className="relative flex h-40">
            <div className="flex-1 relative overflow-hidden bg-sky-900/30">
              {post.items[0]?.image_url ? (
                <img src={post.items[0].image_url} alt={post.items[0].name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-purple-500/20">
                  <span className="text-2xl font-black text-sky-400">{post.items[0]?.name?.charAt(0)}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-white text-xs font-bold truncate">{post.items[0]?.name}</p>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-10 h-10 rounded-full glass-strong shadow-xl flex items-center justify-center">
                <span className="text-xs font-black text-white">VS</span>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden bg-amber-900/30">
              {post.items[1]?.image_url ? (
                <img src={post.items[1].image_url} alt={post.items[1].name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-red-500/20">
                  <span className="text-2xl font-black text-amber-400">{post.items[1]?.name?.charAt(0)}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-white text-xs font-bold truncate">{post.items[1]?.name}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 bg-[#1a1a25]/50">
            {post.items.slice(0, 4).map((item, index) => (
              <div key={item.id} className="relative aspect-square overflow-hidden bg-[#1a1a25]/50">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name || `Option ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-500/10 to-purple-500/10">
                    <span className="text-2xl font-bold text-gray-400">{item.name?.charAt(0) || '?'}</span>
                  </div>
                )}
                {item.name && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2">
                    <p className="text-white text-xs font-bold truncate">{item.name}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {post.has_voted && (
          <div className="absolute top-3 right-3">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/30">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Voted
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${postTypeColor[post.type]}`}>
            {postTypeLabel[post.type]}
          </span>
          {timeLeft && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeLeft}
            </span>
          )}
        </div>

        {post.caption && (
          <p className="text-gray-300 font-bold mb-3 line-clamp-2 leading-snug">{post.caption}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-400">
              <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-white">{post.vote_count}</span>
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-semibold text-white">{post.comment_count}</span>
            </span>
          </div>

          {!post.has_voted && (
            <span className="text-gradient text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
              Vote
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </motion.a>
  )
}

function getTimeLeft(expiresAt: Date): string {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d left`
  if (hours > 0) return `${hours}h left`
  return 'Ending soon'
}
