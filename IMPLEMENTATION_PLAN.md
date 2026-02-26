# Fix All 5 Post Type Flows — Implementation Plan

## Background

This is an **anonymous social polling app** (Next.js 14 frontend + FastAPI backend + PostgreSQL). It has 5 post types: `poll`, `wyr`, `rate`, `compare`, `rank`. Currently all 5 share nearly identical vote UIs and results pages, which is wrong. This plan fixes each type to have the correct, distinct flow.

---

## Codebase Map (read these files first)

| File | Role |
|---|---|
| `frontend/app/page.tsx` | Home feed — renders `FeedCard` per post |
| `frontend/components/feed/FeedCard.tsx` | Preview card shown in feed |
| `frontend/app/p/[id]/page.tsx` | **Vote page** — where users interact and vote |
| `frontend/components/vote/PollOption.tsx` | Card used for poll voting (keep for poll only) |
| `frontend/components/vote/RateSlider.tsx` | 1–10 slider component |
| `frontend/app/p/[id]/results/page.tsx` | Results page shown after voting |
| `frontend/app/create/page.tsx` | 5-step post creation wizard |
| `frontend/lib/types.ts` | TypeScript interfaces (Post, Vote, Item, etc.) |
| `frontend/lib/api.ts` | All API calls |
| `backend/app/routes/votes.py` | `POST /posts/{id}/vote`, `GET /posts/{id}/results` |
| `backend/app/routes/posts.py` | `POST /posts`, `GET /posts`, `GET /posts/{id}` |

---

## Issues & Fixes Per Post Type

---

### 1. 🗳️ Poll — Minor Fixes Only

**Current:** Card grid with Submit button. Works correctly.

**Bugs to fix:**

#### Bug 1a — FeedCard broken image
**File:** `frontend/components/feed/FeedCard.tsx`  
**Problem:** Line 42–47 renders `<img src={item.image_url}>` unconditionally. If `image_url` is `null`, the image breaks.  
**Fix:** Wrap the image in a conditional:
```tsx
// Replace the <div className="relative aspect-square"> block with:
<div key={item.id} className="relative aspect-square overflow-hidden bg-gray-100">
  {item.image_url ? (
    <img src={item.image_url} alt={item.name || `Option ${index + 1}`}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
  ) : (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-2xl font-bold text-gray-300">{item.name?.charAt(0) || '?'}</span>
    </div>
  )}
  {item.name && (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2">
      <p className="text-white text-xs font-medium truncate">{item.name}</p>
    </div>
  )}
</div>
```

---

### 2. ⚡ Would You Rather (WYR) — Full Rework

**Current:** Identical to Poll. Wrong.  
**Correct flow:** Dramatic split screen, instant tap = vote, no submit button, tug-of-war results.

#### Fix 2a — New `WyrVote` Component
**File:** Create `frontend/components/vote/WyrVote.tsx` (new file)

This component receives `items: Item[]` (exactly 2) and `onVote: (itemId: string) => void`.

```tsx
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Item } from '@/lib/types'

interface WyrVoteProps {
  items: Item[]           // Always exactly 2
  onVote: (itemId: string) => void
  submitting: boolean
}

export function WyrVote({ items, onVote, submitting }: WyrVoteProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [A, B] = items

  return (
    <div className="flex flex-col md:flex-row h-[70vh] rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Option A — left side */}
      <motion.button
        className="flex-1 relative flex flex-col items-center justify-end pb-12 cursor-pointer"
        style={{ background: hoveredId === A.id ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'linear-gradient(135deg,#e0f2fe,#ede9fe)' }}
        onHoverStart={() => setHoveredId(A.id)}
        onHoverEnd={() => setHoveredId(null)}
        onClick={() => !submitting && onVote(A.id)}
        whileTap={{ scale: 0.97 }}
        disabled={submitting}
      >
        {A.image_url && (
          <img src={A.image_url} alt={A.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: hoveredId === A.id ? 0.4 : 0.15, transition: 'opacity 0.3s' }} />
        )}
        <motion.p
          className="relative z-10 text-2xl md:text-4xl font-black text-center px-6"
          style={{ color: hoveredId === A.id ? '#fff' : '#1e293b' }}
        >
          {A.name}
        </motion.p>
        {hoveredId === A.id && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-3 text-white/80 font-semibold text-sm">
            Tap to choose
          </motion.p>
        )}
      </motion.button>

      {/* OR Badge — center */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <motion.div
          className="w-16 h-16 rounded-full bg-white shadow-2xl flex items-center justify-center"
          animate={{ scale: hoveredId ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span className="text-lg font-black text-gray-700">OR</span>
        </motion.div>
      </div>

      {/* Option B — right side */}
      <motion.button
        className="flex-1 relative flex flex-col items-center justify-end pb-12 cursor-pointer"
        style={{ background: hoveredId === B.id ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#fef3c7,#fee2e2)' }}
        onHoverStart={() => setHoveredId(B.id)}
        onHoverEnd={() => setHoveredId(null)}
        onClick={() => !submitting && onVote(B.id)}
        whileTap={{ scale: 0.97 }}
        disabled={submitting}
      >
        {B.image_url && (
          <img src={B.image_url} alt={B.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: hoveredId === B.id ? 0.4 : 0.15, transition: 'opacity 0.3s' }} />
        )}
        <motion.p
          className="relative z-10 text-2xl md:text-4xl font-black text-center px-6"
          style={{ color: hoveredId === B.id ? '#fff' : '#1e293b' }}
        >
          {B.name}
        </motion.p>
        {hoveredId === B.id && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-3 text-white/80 font-semibold text-sm">
            Tap to choose
          </motion.p>
        )}
      </motion.button>

      {submitting && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
```

#### Fix 2b — Vote Page: Use `WyrVote` for `wyr` type
**File:** `frontend/app/p/[id]/page.tsx`

**Step 1:** Import `WyrVote`:
```tsx
import { WyrVote } from '@/components/vote/WyrVote'
```

**Step 2:** Add a `handleWyrVote` function alongside the existing `handleSubmit`:
```tsx
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
```

**Step 3:** In the JSX, split the shared poll/wyr block (currently line 187: `{(post.type === 'poll' || post.type === 'wyr') && ( ... )}`):
```tsx
{post.type === 'wyr' && (
  <WyrVote items={post.items} onVote={handleWyrVote} submitting={submitting} />
)}

{post.type === 'poll' && (
  <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
    initial="initial" animate="animate"
    variants={{ animate: { transition: { staggerChildren: 0.1 } } }}>
    {post.items.map((item) => (
      <motion.div key={item.id} variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}>
        <PollOption item={item} selected={selectedItemId === item.id} onClick={() => setSelectedItemId(item.id)} />
      </motion.div>
    ))}
  </motion.div>
)}
```

**Step 4:** Hide the Submit button for `wyr` (it already submits on tap):
```tsx
{post.type !== 'wyr' && (
  <motion.div className="fixed bottom-0 left-0 right-0 lg:left-64 p-4 bg-white border-t border-gray-100 z-20" ...>
    <div className="max-w-4xl mx-auto">
      <Button onClick={handleSubmit} loading={submitting} className="w-full md:w-auto md:min-w-[200px] md:mx-auto md:block">
        Submit Vote
      </Button>
    </div>
  </motion.div>
)}
```

#### Fix 2c — FeedCard: WYR shows VS layout
**File:** `frontend/components/feed/FeedCard.tsx`

Replace the opening image grid `<div className="grid grid-cols-2 gap-0.5 bg-gray-100">` block with a type conditional:

```tsx
{post.type === 'wyr' ? (
  // WYR: two items side by side with VS badge
  <div className="relative flex h-40">
    <div className="flex-1 relative overflow-hidden bg-sky-100">
      {post.items[0]?.image_url ? (
        <img src={post.items[0].image_url} alt={post.items[0].name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xl font-bold text-sky-400">{post.items[0]?.name?.charAt(0)}</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-white text-xs font-semibold truncate">{post.items[0]?.name}</p>
      </div>
    </div>
    {/* VS badge */}
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center">
        <span className="text-xs font-black text-gray-700">VS</span>
      </div>
    </div>
    <div className="flex-1 relative overflow-hidden bg-amber-100">
      {post.items[1]?.image_url ? (
        <img src={post.items[1].image_url} alt={post.items[1].name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xl font-bold text-amber-400">{post.items[1]?.name?.charAt(0)}</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-white text-xs font-semibold truncate">{post.items[1]?.name}</p>
      </div>
    </div>
  </div>
) : (
  // Poll/rate/rank/compare: 2x2 grid with null-safe images (Bug 1a fix)
  <div className="grid grid-cols-2 gap-0.5 bg-gray-100">
    {post.items.slice(0, 4).map((item, index) => (
      <div key={item.id} className="relative aspect-square overflow-hidden bg-gray-100">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name || `Option ${index + 1}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-300">{item.name?.charAt(0) || '?'}</span>
          </div>
        )}
        {item.name && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">{item.name}</p>
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

Also fix `postTypeLabel` and `postTypeColor` — add the missing `compare` key (currently crashes when a compare post appears in feed):
```tsx
const postTypeLabel: Record<string, string> = {
  rate: 'Rate 1–10',
  poll: 'Poll',
  wyr: 'Would You Rather',
  rank: 'Ranking',
  compare: 'Compare',      // ← ADD THIS
}
const postTypeColor: Record<string, string> = {
  rate: 'bg-violet-50 text-violet-600',
  poll: 'bg-sky-50 text-sky-600',
  wyr: 'bg-amber-50 text-amber-600',
  rank: 'bg-emerald-50 text-emerald-600',
  compare: 'bg-rose-50 text-rose-600',  // ← ADD THIS
}
```

#### Fix 2d — Results: WYR tug-of-war bar
**File:** `frontend/app/p/[id]/results/page.tsx`

In the "Results Breakdown" `<div className="space-y-6">` section, add a `wyr`-specific layout **before** the existing `results.items.map(...)` block:

```tsx
{post.type === 'wyr' && results.items.length === 2 ? (
  // Tug-of-war: Option A pulls left, Option B pulls right from center
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <div className="w-28 text-right shrink-0">
        {results.items[0]?.image_url && (
          <img src={results.items[0].image_url} className="w-10 h-10 rounded-lg object-cover ml-auto mb-1" />
        )}
        <p className="text-sm font-semibold text-gray-900">{results.items[0]?.name}</p>
        <p className="text-xl font-black text-sky-500">{results.items[0]?.percentage?.toFixed(1)}%</p>
      </div>
      <div className="flex-1 h-10 relative rounded-full overflow-hidden bg-gray-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${results.items[0]?.percentage ?? 0}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-sky-600 to-sky-400"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${results.items[1]?.percentage ?? 0}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute right-0 top-0 h-full bg-gradient-to-l from-amber-600 to-amber-400"
        />
      </div>
      <div className="w-28 shrink-0">
        {results.items[1]?.image_url && (
          <img src={results.items[1].image_url} className="w-10 h-10 rounded-lg object-cover mb-1" />
        )}
        <p className="text-sm font-semibold text-gray-900">{results.items[1]?.name}</p>
        <p className="text-xl font-black text-amber-500">{results.items[1]?.percentage?.toFixed(1)}%</p>
      </div>
    </div>
    <p className="text-center text-sm text-gray-400">{post.vote_count} total votes</p>
  </div>
) : (
  // Existing vertical bar chart — keep as-is for poll/rate/compare/rank
  <div className="space-y-6">
    {results.items.map((item, index) => {
      // ... existing map code unchanged ...
    })}
  </div>
)}
```

---

### 3. ⭐ Rate — Minor Fix

**Current:** Vote page makes user select an item first, but `rate` always has exactly 1 item — so the item-select step is useless overhead.

#### Fix 3a — Auto-select item for `rate` type on load
**File:** `frontend/app/p/[id]/page.tsx`

In the `loadPost()` function, add this after the `setRatings(initialRatings)` block:
```tsx
// Auto-select the only item for 'rate' — no picker needed
if (response.data.type === 'rate') {
  setSelectedItemId(response.data.items[0]?.id ?? null)
}
```

Then in the JSX, separate `rate` and `compare` which currently share one block (`post.type === 'rate' || post.type === 'compare'`). For `rate`, remove the item-picker buttons entirely and go straight to sliders:

```tsx
{post.type === 'rate' && post.attributes && selectedItemId && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
  >
    <h3 className="font-semibold text-gray-900 mb-6">
      Rate: {post.items[0]?.name}
    </h3>
    <div className="space-y-6">
      {post.attributes.map((attr, index) => (
        <motion.div key={attr} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
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
```

#### Fix 3b — Create page: Auto-skip Step 3 for non-rate/compare types
**File:** `frontend/app/create/page.tsx`

Currently step 3 shows a useless "No attributes needed" screen for `poll`, `wyr`, `rank`. Replace the `onClick` on the **Continue** button (and **Back** button) with a `handleNext` / `handleBack` function:

```tsx
const handleNext = () => {
  const needsAttributes = postMode === 'rate' || postMode === 'compare'
  if (step === 2 && !needsAttributes) {
    setStep(4)  // skip step 3
  } else if (step === 4 && !needsAttributes) {
    setStep(5)
  } else {
    setStep(step + 1)
  }
}

const handleBack = () => {
  const needsAttributes = postMode === 'rate' || postMode === 'compare'
  if (step === 4 && !needsAttributes) {
    setStep(2)  // skip back over step 3
  } else {
    setStep(step - 1)
  }
}
```

Replace all `onClick={() => setStep(step + 1)}` with `onClick={handleNext}` and `onClick={() => setStep(step - 1)}` with `onClick={handleBack}`.

Also update the step progress indicator to only show 4 dots (not 5) when mode doesn't need attributes. Map visual step to actual step:

```tsx
const visualSteps = (postMode === 'rate' || postMode === 'compare')
  ? [1, 2, 3, 4, 5]
  : [1, 2, 4, 5]    // step 3 skipped

const visualStep = visualSteps.indexOf(step) + 1  // 1-based visual position

// update step circles to use visualSteps.map(...) instead of [1,2,3,4,5].map(...)
```

---

### 4. ⚖️ Compare — Significant Rework

**Current:** Treats Compare like Rate — user picks ONE item and rates it. This is wrong.  
**Correct:** User rates ALL items on the same attributes in one go; results show a leaderboard.

#### Fix 4a — Vote page: Show all items with sliders for `compare`
**File:** `frontend/app/p/[id]/page.tsx`

Separate `compare` from `rate` into its own JSX block. The `ratings` state structure already supports `{ [itemId]: { [attr]: value } }` — the `loadPost` function already initializes it for all items on `rate`/`compare`. No state changes needed.

```tsx
{post.type === 'compare' && (
  <div className="space-y-6 mb-8">
    <p className="text-sm text-gray-500 font-medium">Rate each item on all attributes:</p>
    {post.items.map((item, idx) => (
      <motion.div
        key={item.id}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
      >
        <div className="flex items-center gap-3 mb-5">
          {item.image_url && (
            <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
          )}
          <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
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
```

#### Fix 4b — Vote submission for `compare` — multi-item ratings
**File:** `frontend/app/p/[id]/page.tsx` — `handleSubmit` switch block

Replace the existing `compare` case:
```tsx
case 'compare':
  // ratings = { [itemId]: { [attr]: score } } — all items populated from loadPost init
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
```

**File:** `frontend/lib/types.ts` — add to `Vote` interface:
```tsx
export interface Vote {
  item_id?: string
  ratings?: Record<string, number>
  ranking?: string[]
  multi_ratings?: Record<string, Record<string, number>>  // ← ADD for compare
}
```

#### Fix 4c — Backend: Accept `multi_ratings` in vote endpoint
**File:** `backend/app/schemas/__init__.py` (find `VoteRequest` class — it uses Pydantic BaseModel)

Add field:
```python
from typing import Optional, Dict, List

class VoteRequest(BaseModel):
    item_id: Optional[str] = None
    ratings: Optional[Dict[str, int]] = None
    ranking: Optional[List[str]] = None
    multi_ratings: Optional[Dict[str, Dict[str, int]]] = None  # ← ADD for compare
```

**File:** `backend/app/routes/votes.py` — inside the `async with db.transaction():` block in `submit_vote()`

Replace the generic item vote logic at the end of the transaction with a type-aware block:

```python
# BEFORE (existing generic logic after the transaction opens):
# vote_id = await db.fetchval(INSERT INTO votes ...)
# await db.execute(INSERT INTO vote_locks ...)
# await db.execute(UPDATE posts SET vote_count ...)
# if vote_data.item_id: await db.execute(UPDATE items ...)

# AFTER — replace with:
async with db.transaction():
    # 1. Always insert vote lock
    await db.execute(
        "INSERT INTO vote_locks (ip_hash, post_id) VALUES ($1, $2)",
        ip_hash, post_id,
    )
    # 2. Increment post vote count
    await db.execute(
        "UPDATE posts SET vote_count = vote_count + 1 WHERE id = $1", post_id
    )

    if post["type"] == "compare" and vote_data.multi_ratings:
        # Insert one votes row per item + update item scores
        for item_id, item_ratings in vote_data.multi_ratings.items():
            valid_item = await db.fetchrow(
                "SELECT id FROM items WHERE id = $1 AND post_id = $2", item_id, post_id
            )
            if not valid_item:
                continue
            await db.fetchval("""
                INSERT INTO votes (post_id, item_id, ip_hash, browser_id, ratings)
                VALUES ($1, $2, $3, $4, $5) RETURNING id
            """, post_id, item_id, ip_hash, browser_id, json.dumps(item_ratings))
            await db.execute(
                "UPDATE items SET vote_count = vote_count + 1 WHERE id = $1", item_id
            )
            for attr, score in item_ratings.items():
                await db.execute(
                    "UPDATE items SET total_score = total_score + $1 WHERE id = $2",
                    score, item_id
                )
    else:
        # Standard single-item vote (poll, wyr, rate, rank)
        vote_id = await db.fetchval("""
            INSERT INTO votes (post_id, item_id, ip_hash, browser_id, ratings, ranking)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        """, post_id, vote_data.item_id, ip_hash, browser_id,
            json.dumps(vote_data.ratings) if vote_data.ratings else None,
            json.dumps(vote_data.ranking) if vote_data.ranking else None,
        )
        if vote_data.item_id:
            await db.execute(
                "UPDATE items SET vote_count = vote_count + 1 WHERE id = $1",
                vote_data.item_id,
            )
        if vote_data.ratings:
            for attr, score in vote_data.ratings.items():
                await db.execute(
                    "UPDATE items SET total_score = total_score + $1 WHERE id = $2",
                    score, vote_data.item_id,
                )
```

#### Fix 4d — Results page: Compare leaderboard
**File:** `frontend/app/p/[id]/results/page.tsx`

In the Results Breakdown section, add a `compare`-specific display. Sort items by their total avg score (descending) to form a leaderboard:

```tsx
{post.type === 'compare' ? (
  <div className="space-y-4">
    {[...results.items]
      .sort((a, b) => {
        const aScore = a.avg_scores ? Object.values(a.avg_scores).reduce((s, v) => s + v, 0) / Object.keys(a.avg_scores).length : 0
        const bScore = b.avg_scores ? Object.values(b.avg_scores).reduce((s, v) => s + v, 0) / Object.keys(b.avg_scores).length : 0
        return bScore - aScore
      })
      .map((item, index) => {
        const overallAvg = item.avg_scores
          ? Object.values(item.avg_scores).reduce((s, v) => s + v, 0) / Object.keys(item.avg_scores).length
          : 0
        return (
          <motion.div
            key={item.id}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                index === 0 ? 'bg-amber-400 text-white' :
                index === 1 ? 'bg-gray-300 text-white' :
                index === 2 ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{index + 1}</span>
              {item.image_url && <img src={item.image_url} className="w-10 h-10 rounded-lg object-cover" />}
              <span className="font-bold text-gray-900 flex-1">{item.name}</span>
              <span className="text-lg font-bold text-sky-600">{overallAvg.toFixed(1)}<span className="text-sm text-gray-400">/10</span></span>
            </div>
            {item.avg_scores && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(item.avg_scores).map(([attr, score]) => (
                  <span key={attr} className="text-xs px-3 py-1 bg-gray-50 rounded-full font-medium">
                    {attr}: <span className="text-sky-600 font-bold">{(score as number).toFixed(1)}</span>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )
      })}
  </div>
) : /* ... rest of existing breakdown ... */}
```

---

### 5. 🏆 Rank — Results Fix

**Current:** Backend never increments `items.vote_count` for rank posts (rank has no `item_id`, only `ranking` JSONB). Results page shows 0% for all items.  
**Correct metric:** Average rank position — item ranked #1 most consistently wins.

#### Fix 5a — Backend: Rank results from JSONB
**File:** `backend/app/routes/votes.py` — `get_results()` function

Add a special early-return branch for `rank` type, **before** the existing `items_data = []` loop:

```python
# Add this block before the "items_data = []" line:
if post["type"] == "rank":
    all_rankings = await db.fetch(
        "SELECT ranking FROM votes WHERE post_id = $1 AND ranking IS NOT NULL",
        post_id
    )
    # Map item_id -> sum of positions, count of votes
    position_sums: dict = {str(item["id"]): 0 for item in items}
    position_counts: dict = {str(item["id"]): 0 for item in items}

    for vote_row in all_rankings:
        ranking_list = json.loads(vote_row["ranking"])  # e.g. ["uuid1", "uuid2", "uuid3"]
        for position, item_id in enumerate(ranking_list):
            if item_id in position_sums:
                position_sums[item_id] += (position + 1)   # position 0 = rank 1
                position_counts[item_id] += 1

    rank_items_data = []
    for item in items:
        iid = str(item["id"])
        count = position_counts[iid]
        avg_pos = round(position_sums[iid] / count, 2) if count > 0 else 999.0
        rank_items_data.append({
            "id": iid,
            "name": item["name"],
            "image_url": item["image_url"],
            "vote_count": count,
            "avg_position": avg_pos,
            "percentage": 0,
        })

    rank_items_data.sort(key=lambda x: x["avg_position"])
    winner = rank_items_data[0] if rank_items_data else None

    return {
        "success": True,
        "data": {
            "post": {
                "id": str(post["id"]),
                "type": post["type"],
                "caption": post["caption"],
                "vote_count": post["vote_count"],
                "comment_count": post["comment_count"],
            },
            "results": {
                "winner": {
                    "item_id": winner["id"],
                    "name": winner["name"],
                    "avg_position": winner["avg_position"],
                    "percentage": None,
                } if winner else None,
                "items": rank_items_data,
            },
        },
    }
# continue with existing code for poll/rate/compare/wyr below...
```

#### Fix 5b — Frontend types: Add `avg_position`
**File:** `frontend/lib/types.ts`

Add to `Item` interface:
```tsx
export interface Item {
  id: string
  name: string
  image_url: string | null
  image_key?: string
  order_index: number
  vote_count: number
  total_score?: number
  avg_scores?: Record<string, number>
  score_distribution?: Record<string, number>
  avg_position?: number    // ← ADD for rank type results
  percentage?: number      // ← make optional (rank returns 0)
}
```

#### Fix 5c — Frontend results: Rank ordered list
**File:** `frontend/app/p/[id]/results/page.tsx`

Add a `rank`-specific display option in the Results Breakdown section:

```tsx
{post.type === 'rank' ? (
  <div className="space-y-3">
    {results.items.map((item, index) => (
      <motion.div
        key={item.id}
        className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.15 }}
      >
        <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${
          index === 0 ? 'bg-amber-400 text-white' :
          index === 1 ? 'bg-gray-300 text-white' :
          index === 2 ? 'bg-orange-600 text-white' :
          'bg-gray-100 text-gray-500'
        }`}>
          {index + 1}
        </span>
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        )}
        <span className="flex-1 font-semibold text-gray-900">{item.name}</span>
        {item.avg_position && (
          <span className="text-sm text-gray-400 shrink-0">avg rank #{item.avg_position.toFixed(1)}</span>
        )}
        {index === 0 && <span className="text-xl shrink-0">🏆</span>}
      </motion.div>
    ))}
  </div>
) : post.type === 'wyr' ? (
  /* tug-of-war layout from Fix 2d */
) : post.type === 'compare' ? (
  /* leaderboard from Fix 4d */
) : (
  /* existing vertical bar chart — unchanged for poll/rate */
  <div className="space-y-6">
    {results.items.map((item, index) => {
      // ... existing code ...
    })}
  </div>
)}
```

---

## Complete File Change Summary

| File | What Changes |
|---|---|
| `frontend/components/feed/FeedCard.tsx` | WYR VS split layout in preview; null-safe images; add `compare` to label/color maps |
| `frontend/components/vote/WyrVote.tsx` | **NEW FILE** — full-screen split component with instant tap-to-vote |
| `frontend/app/p/[id]/page.tsx` | Separate `poll`/`wyr` JSX; add `handleWyrVote`; hide submit for wyr; auto-select for rate; separate `compare` block with all-item sliders; `compare` submit sends `multi_ratings` |
| `frontend/app/p/[id]/results/page.tsx` | Add rank ordered list; wyr tug-of-war bar; compare leaderboard |
| `frontend/app/create/page.tsx` | Skip step 3 for non-rate/compare via `handleNext`/`handleBack`; update progress dots |
| `frontend/lib/types.ts` | Add `multi_ratings` to `Vote`; add `avg_position` and make `percentage` optional on `Item` |
| `backend/app/schemas/__init__.py` | Add `multi_ratings: Optional[Dict[str, Dict[str, int]]]` to `VoteRequest` |
| `backend/app/routes/votes.py` | `submit_vote`: branch on `compare` to insert one vote row per item; `get_results`: early-return rank logic from JSONB |

---

## How to Run Locally (for testing)

```bash
# Terminal 1 — Backend
cd c:\cliche\backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd c:\cliche\frontend
npm run dev
# Opens at http://localhost:3000
```

---

## Manual Verification Test Cases

### Test 1 — Poll (regression — must not break)
1. Create → Poll → 3 named options → caption → duration → Create
2. View Post → 3 `PollOption` cards in 2-col grid
3. Click one → blue border + checkmark
4. Click **Submit Vote** → redirects to results
5. Results: winner banner + animated vertical bar chart + percentages ✅

### Test 2 — Would You Rather
1. Create → WYR → 2 options ("Pizza" / "Tacos") → Create
2. View Post → **full-screen split**: left blue, right amber, "OR" badge center
3. Hover left → it brightens, shows "Tap to choose"
4. Click left → **instant submit**, no button press needed → results page
5. Results: tug-of-war bar with percentages on each side ✅

### Test 3 — Rate
1. Create → Rate This → 1 item ("My Photo") → attrs: Looks, Vibe → Create
2. View Post → sliders appear **immediately** (no item picker shown)
3. Adjust sliders → Submit → results show per-attribute averages ✅

### Test 4 — Compare
1. Create → Compare → 3 items → attrs: Style, Vibe → Create
2. View Post → **all 3 items** shown with their own slider sets stacked vertically
3. Adjust ALL sliders → Submit → results show **leaderboard** (rank 1/2/3 with avg scores) ✅

### Test 5 — Rank
1. Create → Ranking → 4 items → Create
2. View Post → ↑↓ reorder list → Submit
3. Results: items in **average rank order** with gold/silver/bronze medals ✅

### Test 6 — FeedCard regression
1. Go to `/` (home feed) with posts of all 5 types
2. WYR cards: **VS badge** between 2 items (not 2×2 grid)
3. Posts without images: letter placeholder shown (no broken img)
4. Compare cards: show "Compare" badge — no crash ✅

### Test 7 — Create step skip
1. Select Poll → step 2 → Continue → lands on **step 4** (Caption), not step 3
2. Select Rate This → step 2 → Continue → lands on **step 3** (Attributes) ✅
