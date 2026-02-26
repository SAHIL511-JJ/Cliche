# 📱 ANONYMOUS RATING APP - DETAILED PROJECT PLAN

## 🎯 PROJECT OVERVIEW

### Vision
A zero-login anonymous social comparison platform where users upload items (people, outfits, food, events, brands, etc.) and others rate or vote - with a focus on **mobile-first UI**, **smooth animations**, and **optimized performance**.

### Core Principles
- **No signup friction** - Anonymous participation
- **Mobile-first design** - Touch-optimized, responsive
- **Smooth animations** - Every interaction feels alive
- **High performance** - Fast loading, optimized assets
- **Highly shareable** - Built for virality

---

## 🛠️ TECH STACK

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 (App Router) | React framework with SSR/SSG |
| **Styling** | Tailwind CSS + Framer Motion | Utility-first CSS + animations |
| **Backend** | FastAPI (Python) | Fast async API server |
| **Database** | PostgreSQL (Supabase) | Relational database |
| **Storage** | Supabase Storage | Image uploads |
| **Auth** | Anonymous (IP hash + fingerprint) | No user accounts |
| **CDN** | Vercel Edge Network | Global distribution |

### Why This Stack?
- **Next.js 14**: Best for SEO, fast initial load, image optimization
- **Framer Motion**: Industry-leading animation library for React
- **FastAPI**: Async Python, auto docs, high performance
- **Supabase**: Managed Postgres + storage + real-time capabilities

---

## 🎨 UI/UX DESIGN PRINCIPLES

### Mobile-First Philosophy
```
┌─────────────────────────────────────────────────────────────┐
│                     DESIGN BREAKPOINTS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Mobile (Primary)    │  320px - 480px  │  Touch-optimized   │
│  Tablet              │  481px - 768px  │  Adapted layout    │
│  Desktop             │  769px+         │  Expanded view     │
│                                                              │
│  Design FOR mobile first, then enhance for larger screens   │
└─────────────────────────────────────────────────────────────┘
```

### Animation Guidelines

| Element | Animation Type | Duration | Easing |
|---------|---------------|----------|--------|
| **Buttons** | Scale + Ripple | 150ms | ease-out |
| **Cards** | Fade + Slide up | 300ms | ease-out |
| **Page Transitions** | Fade + Slide | 400ms | ease-in-out |
| **Modals** | Scale + Backdrop fade | 250ms | ease-out |
| **Loading States** | Pulse / Skeleton | 1.5s loop | ease-in-out |
| **Votes/Ratings** | Bounce + Color change | 200ms | spring |
| **Results Chart** | Grow from 0 | 600ms | ease-out |
| **Pull to Refresh** | Elastic bounce | - | spring |

### Performance Targets

| Metric | Target | Why it matters |
|--------|--------|----------------|
| **First Contentful Paint** | < 1.5s | User sees content quickly |
| **Largest Contentful Paint** | < 2.5s | Main content loaded |
| **Time to Interactive** | < 3s | User can interact |
| **Cumulative Layout Shift** | < 0.1 | No jumping elements |
| **Bundle Size (Initial)** | < 150KB | Fast mobile load |
| **Image Optimization** | WebP/AVIF, lazy load | Reduced bandwidth |

---

## 🗄️ DATABASE SCHEMA

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    POSTS    │       │    ITEMS    │       │    VOTES    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │───┐   │ id          │   ┌───│ id          │
│ type        │   └──▶│ post_id     │◀──┘   │ post_id     │
│ caption     │       │ name        │       │ item_id     │
│ attributes  │       │ image_url   │       │ ip_hash     │
│ vote_count  │       │ order_index │       │ browser_id  │
│ expires_at  │       └─────────────┘       │ ratings     │
│ created_at  │                             │ comment     │
│ report_count│       ┌─────────────┐       │ created_at  │
│ is_removed  │       │   REPORTS   │       └─────────────┘
└─────────────┘       ├─────────────┤
                      │ id          │       ┌─────────────┐
                      │ post_id     │       │  VOTE_LOCKS │
                      │ reason      │       ├─────────────┤
                      │ ip_hash     │       │ ip_hash     │
                      │ created_at  │       │ post_id     │
                      └─────────────┘       │ voted_at    │
                                            └─────────────┘
```

### Table Definitions

#### POSTS Table
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('rate', 'poll', 'wyr', 'rank')),
    caption VARCHAR(120),
    attributes JSONB, -- ["looks", "style", "vibe"]
    vote_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    report_count INTEGER DEFAULT 0,
    is_removed BOOLEAN DEFAULT FALSE,
    creator_token VARCHAR(64) -- For edit/delete by creator
);

-- Indexes for performance
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_expires_at ON posts(expires_at) WHERE is_removed = FALSE;
CREATE INDEX idx_posts_vote_count ON posts(vote_count DESC);
```

#### ITEMS Table
```sql
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    name VARCHAR(50),
    image_url TEXT NOT NULL,
    image_key VARCHAR(255), -- Storage key for deletion
    order_index INTEGER NOT NULL,
    vote_count INTEGER DEFAULT 0,
    total_score DECIMAL(10,2) DEFAULT 0, -- For rate type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_items_post_id ON items(post_id);
```

#### VOTES Table
```sql
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    ip_hash VARCHAR(64) NOT NULL,
    browser_id VARCHAR(64),
    ratings JSONB, -- {"looks": 8, "style": 7, "vibe": 9}
    ranking JSONB, -- [item_id_1, item_id_2, item_id_3]
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate votes
CREATE UNIQUE INDEX idx_votes_unique ON votes(post_id, ip_hash);
CREATE INDEX idx_votes_post_id ON votes(post_id);
CREATE INDEX idx_votes_created_at ON votes(created_at DESC);
```

#### VOTE_LOCKS Table (Fast duplicate check)
```sql
CREATE TABLE vote_locks (
    ip_hash VARCHAR(64) NOT NULL,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_id, ip_hash)
);
```

#### REPORTS Table
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reason VARCHAR(20) NOT NULL CHECK (reason IN ('harassment', 'explicit', 'hate', 'spam', 'other')),
    ip_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_post_id ON reports(post_id);
```

#### COMMENTS Table
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_removed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);

---

## 🌐 API ENDPOINTS

### Base URL Structure
```
Production: https://api.rateapp.com/v1
Development: http://localhost:8000/api/v1
```

### API Endpoints Overview

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| **POSTS** ||||
| POST | `/posts` | Create new post | Anonymous |
| GET | `/posts` | List posts (feed) | None |
| GET | `/posts/{id}` | Get single post | None |
| DELETE | `/posts/{id}` | Delete post | Creator token |
| **VOTING** ||||
| POST | `/posts/{id}/vote` | Submit vote | Anonymous |
| GET | `/posts/{id}/vote-check` | Check if voted | None |
| GET | `/posts/{id}/results` | Get results | None |
| **COMMENTS** ||||
| GET | `/posts/{id}/comments` | Get comments | None |
| **REPORTS** ||||
| POST | `/posts/{id}/report` | Report post | Anonymous |
| **UPLOAD** ||||
| POST | `/upload/image` | Upload image | Anonymous |

### Detailed API Specifications

#### 1. Create Post
```python
POST /posts

Request Headers:
    X-Forwarded-For: <client_ip>
    X-Browser-ID: <browser_fingerprint>

Request Body:
{
    "type": "rate",           # rate | poll | wyr | rank
    "caption": "Best outfit?",
    "attributes": ["style", "vibe"],  # For rate type only
    "items": [
        {"name": "Option A", "image_base64": "..."},
        {"name": "Option B", "image_base64": "..."}
    ],
    "expires_in_hours": 72    # Optional, default 168 (7 days)
}

Response (201):
{
    "success": true,
    "data": {
        "id": "abc123...",
        "share_url": "https://rateapp.com/p/abc123",
        "creator_token": "xyz789..."  # Save for edit/delete
    }
}
```

#### 2. Get Posts (Feed)
```python
GET /posts?type=trending&page=1&limit=10

Query Parameters:
    type: trending | recent | random
    page: int (default 1)
    limit: int (default 10, max 20)

Response (200):
{
    "success": true,
    "data": {
        "posts": [
            {
                "id": "abc123",
                "type": "rate",
                "caption": "Best outfit?",
                "items": [
                    {"id": "item1", "name": "A", "image_url": "...", "avg_score": 7.5},
                    {"id": "item2", "name": "B", "image_url": "...", "avg_score": 6.8}
                ],
                "vote_count": 234,
                "comment_count": 45,
                "has_voted": false,
                "expires_at": "2026-02-28T00:00:00Z",
                "created_at": "2026-02-21T10:30:00Z"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 150,
            "has_more": true
        }
    }
}
```

#### 3. Get Single Post
```python
GET /posts/{id}

Request Headers:
    X-Forwarded-For: <client_ip>
    X-Browser-ID: <browser_fingerprint>

Response (200):
{
    "success": true,
    "data": {
        "id": "abc123",
        "type": "rate",
        "caption": "Best outfit?",
        "attributes": ["style", "vibe"],
        "items": [
            {
                "id": "item1",
                "name": "Option A",
                "image_url": "https://...",
                "vote_count": 120,
                "avg_scores": {"style": 7.2, "vibe": 7.8}
            }
        ],
        "vote_count": 234,
        "comment_count": 45,
        "has_voted": false,
        "expires_at": "...",
        "created_at": "..."
    }
}
```

#### 4. Submit Vote
```python
POST /posts/{id}/vote

Request Headers:
    X-Forwarded-For: <client_ip>
    X-Browser-ID: <browser_fingerprint>

Request Body (Rate Type):
{
    "item_id": "item1",
    "ratings": {
        "style": 8,
        "vibe": 7
    },
    "comment": "Love this one!"
}

Request Body (Poll Type):
{
    "item_id": "item1"
}

Request Body (WYR Type):
{
    "item_id": "item1"
}

Request Body (Rank Type):
{
    "ranking": ["item1", "item3", "item2", "item4"]
}

Response (200):
{
    "success": true,
    "message": "Vote recorded",
    "data": {
        "redirect_to": "/p/abc123/results"
    }
}

Error (409 - Already Voted):
{
    "success": false,
    "error": "ALREADY_VOTED",
    "message": "You have already voted on this post"
}
```

#### 5. Check Vote Status
```python
GET /posts/{id}/vote-check

Request Headers:
    X-Forwarded-For: <client_ip>
    X-Browser-ID: <browser_fingerprint>

Response (200):
{
    "success": true,
    "data": {
        "has_voted": true,
        "voted_at": "2026-02-21T12:00:00Z"
    }
}
```

#### 6. Get Results
```python
GET /posts/{id}/results

Response (200):
{
    "success": true,
    "data": {
        "post": {
            "id": "abc123",
            "type": "rate",
            "caption": "Best outfit?",
            "vote_count": 234
        },
        "results": {
            "winner": {
                "item_id": "item1",
                "name": "Option A",
                "overall_score": 7.5
            },
            "items": [
                {
                    "id": "item1",
                    "name": "Option A",
                    "vote_count": 120,
                    "percentage": 51.3,
                    "avg_scores": {
                        "style": 7.2,
                        "vibe": 7.8
                    },
                    "score_distribution": {
                        "1": 2, "2": 3, "3": 5, "4": 8,
                        "5": 12, "6": 18, "7": 25, "8": 28,
                        "9": 15, "10": 4
                    }
                }
            ]
        },
        "comments": [
            {
                "id": "comment1",
                "content": "Love this!",
                "created_at": "..."
            }
        ]
    }
}
```

#### 7. Upload Image
```python
POST /upload/image

Request Body (multipart/form-data):
    image: <file> (max 5MB)
    
Response (200):
{
    "success": true,
    "data": {
        "image_url": "https://supabase.co/storage/...",
        "image_key": "uploads/abc123.jpg"
    }
}

Error (413 - Too Large):
{
    "success": false,
    "error": "FILE_TOO_LARGE",
    "message": "Image must be under 5MB"
}
```

#### 8. Report Post
```python
POST /posts/{id}/report

Request Headers:
    X-Forwarded-For: <client_ip>

Request Body:
{
    "reason": "harassment"  # harassment | explicit | hate | spam | other
}

Response (200):
{
    "success": true,
    "message": "Report submitted. We'll review it shortly."
}
```

---

## 🎨 FRONTEND ARCHITECTURE

### Next.js Project Structure
```
app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home feed page
├── globals.css             # Global styles + Tailwind
│
├── (auth)/                 # No auth needed - skip
│
├── create/
│   └── page.tsx            # Create post page
│
├── p/
│   └── [id]/
│       ├── page.tsx        # View post / vote
│       └── results/
│           └── page.tsx    # View results
│
├── api/                    # API routes (if using Next.js API)
│   └── ...
│
components/
├── ui/                     # Base UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Slider.tsx
│   ├── Input.tsx
│   ├── Skeleton.tsx
│   └── Toast.tsx
│
├── post/                   # Post-related components
│   ├── PostCard.tsx
│   ├── PostCreator.tsx
│   ├── ItemUploader.tsx
│   ├── AttributeSelector.tsx
│   └── PostTypeSelector.tsx
│
├── vote/                   # Voting components
│   ├── RateSlider.tsx
│   ├── PollOption.tsx
│   ├── WYRCard.tsx
│   ├── RankingDragList.tsx
│   └── VoteSubmitButton.tsx
│
├── results/                # Results components
│   ├── WinnerBadge.tsx
│   ├── ScoreChart.tsx
│   ├── DistributionBar.tsx
│   └── CommentsSection.tsx
│
├── feed/                   # Feed components
│   ├── FeedList.tsx
│   ├── FeedCard.tsx
│   ├── FeedFilters.tsx
│   └── PullToRefresh.tsx
│
├── layout/                 # Layout components
│   ├── MobileNav.tsx
│   ├── Header.tsx
│   └── ShareSheet.tsx
│
└── animations/             # Animation presets
    ├── pageTransitions.ts
    ├── buttonAnimations.ts
    ├── cardAnimations.ts
    └── loadingAnimations.ts

lib/
├── api.ts                  # API client
├── fingerprint.ts          # Browser fingerprinting
├── storage.ts              # LocalStorage helpers
└── utils.ts                # Utility functions

hooks/
├── useVote.ts              # Vote logic
├── usePost.ts              # Post CRUD
├── useFeed.ts              # Feed infinite scroll
├── useAnimation.ts         # Animation helpers
└── usePullToRefresh.ts     # Mobile pull gesture
```

---

### Core UI Components

#### 1. Button Component
```typescript
// components/ui/Button.tsx

interface ButtonProps {
    variant: 'primary' | 'secondary' | 'ghost' | 'danger';
    size: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    children: React.ReactNode;
    onClick?: () => void;
}

// Animations:
// - Press: scale(0.95) + opacity 0.8
// - Release: spring back to scale(1)
// - Hover: brightness(1.1)
// - Ripple effect on click
// - Loading: pulse + spinner
```

#### 2. Card Component
```typescript
// components/ui/Card.tsx

interface CardProps {
    variant: 'default' | 'elevated' | 'interactive';
    padding: 'none' | 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    onClick?: () => void;
}

// Animations:
// - Mount: fade + slideUp (stagger children)
// - Hover: lift + shadow increase
// - Press: scale(0.98)
// - Exit: fade + slideDown
```

#### 3. PostCard Component
```typescript
// components/post/PostCard.tsx

interface PostCardProps {
    post: Post;
    hasVoted: boolean;
    onVote: () => void;
}

// Animations:
// - Image parallax on scroll
// - Vote button bounce on tap
// - Skeleton loading shimmer
// - Pull-to-reveal vote overlay
```

#### 4. RateSlider Component
```typescript
// components/vote/RateSlider.tsx

interface RateSliderProps {
    attribute: string;  // "Looks", "Style", etc.
    value: number;
    onChange: (value: number) => void;
}

// Animations:
// - Drag: smooth follow with spring
// - Release: snap to integer
// - Value display: scale pop
// - Color gradient: red (1) → green (10)
```

---

### Animation Specifications

#### Page Transitions
```typescript
// components/animations/pageTransitions.ts

export const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.98
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1]
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.98,
        transition: {
            duration: 0.2
        }
    }
};
```

---

## 📱 SCREEN WIREFRAMES

### Screen 1: Home Feed (Mobile)

```
┌─────────────────────────────────────┐
│  ☰                    🔔    ➕     │  ← Header (sticky)
│  RateIt                             │
├─────────────────────────────────────┤
│                                      │
│  ┌─────────┬─────────┬─────────┐   │  ← Filter tabs
│  │🔥TRENDING│⏱️RECENT │🎲RANDOM │   │    (animated underline)
│  └─────────┴─────────┴─────────┘   │
│                                      │
│  ┌─────────────────────────────┐   │
│  │ 📷  ┌─────┐  ┌─────┐       │   │  ← Post card 1
│  │     │ IMG │  │ IMG │       │   │    (slide up on scroll)
│  │     └─────┘  └─────┘       │   │
│  │  "Best outfit?"             │   │
│  │  🗳️ 234  💬 45  ⏱️ 2d left │   │
│  │  [VOTE NOW →]               │   │
│  └─────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────┐   │
│  │ 📊  ┌─────┐  ┌─────┐       │   │  ← Post card 2 (voted)
│  │     │ IMG │  │ IMG │       │   │    Shows winner badge
│  │     └─────┘  └─────┘       │   │
│  │  🏆 Winner: Option A (68%)  │   │
│  │  ✅ You voted               │   │
│  │  [VIEW RESULTS →]           │   │
│  └─────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────┐   │
│  │ Poll - "Best weekend plan?" │   │
│  │ ...                          │   │
│  └─────────────────────────────┘   │
│                                      │
│       ↕️ Pull to refresh            │
│                                      │
└─────────────────────────────────────┘
```

### Screen 2: Create Post

```
┌─────────────────────────────────────┐
│  ← Create Post              [POST]  │
├─────────────────────────────────────┤
│                                      │
│  STEP 1: Upload Items                │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌───┐││  ← Item grid
│  │  │ ✓  │ │ ✓  │ │ ✓  │ │ + │││    (drag to reorder)
│  │  │ IMG │ │ IMG │ │ IMG │ │   │││
│  │  └─────┘ └─────┘ └─────┘ └───┘││
│  │   Name    Name    Name         ││
│  │                                 ││
│  │  Add up to 4 items              ││
│  │  (min 2 required)               ││
│  └─────────────────────────────────┘│
│                                      │
│  STEP 2: Choose Type                 │
│  ┌─────────────────────────────────┐│
│  │ ○ Rate (1-10 scale)             ││  ← Animated select
│  │ ○ Poll (pick one)               ││
│  │ ○ Would You Rather (pick 1/2)   ││
│  │ ○ Ranking (order them)          ││
│  └─────────────────────────────────┘│
│                                      │
│  STEP 3: Attributes (Rate only)      │
│  ┌─────────────────────────────────┐│
│  │ [Looks] [Style] [Vibe] [+ Add]  ││  ← Chip selector
│  │                                 ││
│  │ Custom: [____________] [Add]   ││
│  └─────────────────────────────────┘│
│                                      │
│  STEP 4: Caption (Optional)          │
│  ┌─────────────────────────────────┐│
│  │ What do you want to ask?        ││
│  │ 0/120 characters                ││
│  └─────────────────────────────────┘│
│                                      │
│  STEP 5: Duration                    │
│  ┌─────────────────────────────────┐│
│  │ [24h] [3 days] [7 days] [30d]   ││
│  └─────────────────────────────────┘│
│                                      │
└─────────────────────────────────────┘

Bottom Sheet (on image upload):
┌─────────────────────────────────────┐
│  📷 Choose Source                    │
│  ─────────────────────────────────  │
│  📁 Gallery                          │
│  📸 Camera                           │
│  ❌ Cancel                           │
└─────────────────────────────────────┘
```

### Screen 3: Vote Screen (Rate Type)

```
┌─────────────────────────────────────┐
│  ← Vote                    ⚠️ Report │
├─────────────────────────────────────┤
│                                      │
│  "Who looks better?"                 │
│                                      │
│  ┌─────────────┐  ┌─────────────┐   │
│  │             │  │             │   │
│  │    IMG A    │  │    IMG B    │   │
│  │             │  │             │   │
│  │   Rahul     │  │   Priya     │   │
│  └─────────────┘  └─────────────┘   │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  Rate Option A: Rahul                │
│                                      │
│  Looks                               │
│  ├────────●──────────────────┤      │
│  1                      10          │
│  Your rating: 7                      │
│                                      │
│  Style                               │
│  ├─────────────────●───────┤        │
│  1                      10          │
│  Your rating: 8                      │
│                                      │
│  Vibe                                │
│  ├────────────●────────────┤        │
│  1                      10          │
│  Your rating: 6                      │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  Rate Option B: Priya                │
│                                      │
│  Looks: ●────────────────────┤ 9     │
│  Style: ●────────────────────┤ 8     │
│  Vibe: ●────────────────────┤ 7      │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  💬 Add comment (optional)           │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  └─────────────────────────────────┘│
│                                      │
│  ┌─────────────────────────────────┐│
│  │         SUBMIT VOTE             ││  ← Large CTA
│  └─────────────────────────────────┘│
│                                      │
└─────────────────────────────────────┘
```

### Screen 4: Vote Screen (Poll Type)

```
┌─────────────────────────────────────┐
│  ← Vote                    ⚠️ Report │
├─────────────────────────────────────┤
│                                      │
│  "Best hangout spot?"                │
│                                      │
│  Tap to vote:                        │
│                                      │
│  ┌─────────────────────────────┐    │
│  │                              │    │
│  │         ┌─────────┐          │    │
│  │         │   IMG   │          │    │
│  │         │  Cafe   │          │    │
│  │         └─────────┘          │    │
│  │                              │    │
│  │         [TAP TO VOTE]        │    │  ← Tap entire card
│  │                              │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │         ┌─────────┐          │    │
│  │         │   IMG   │          │    │
│  │         │ Library │          │    │
│  │         └─────────┘          │    │
│  │         [TAP TO VOTE]        │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │         ┌─────────┐          │    │
│  │         │   IMG   │          │    │
│  │         │ Garden  │          │    │
│  │         └─────────┘          │    │
│  │         [TAP TO VOTE]        │    │
│  └─────────────────────────────┘    │
│                                      │
└─────────────────────────────────────┘
```

### Screen 5: Results

```
┌─────────────────────────────────────┐
│  ← Results                  📤 Share │
├─────────────────────────────────────┤
│                                      │
│  ┌─────────────────────────────┐    │
│  │      🏆 WINNER              │    │  ← Animated badge
│  │    ┌─────────┐              │    │
│  │    │   IMG   │              │    │
│  │    │ Rahul   │              │    │
│  │    └─────────┘              │    │
│  │    Overall: 8.2/10          │    │
│  │    134 votes (57%)          │    │
│  └─────────────────────────────┘    │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  📊 Score Breakdown                  │
│                                      │
│  Looks                               │
│  Rahul    ████████████░░ 8.5        │
│  Priya    ██████████░░░░ 7.2        │
│                                      │
│  Style                               │
│  Rahul    ████████████░░ 8.0        │
│  Priya    ███████████░░░ 7.8        │
│                                      │
│  Vibe                                │
│  Rahul    ████████░░░░░░ 6.5        │
│  Priya    ████████████░░ 8.2        │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  💬 Comments (45)        Top | New   │
│                                      │
│  ┌─────────────────────────────────┐│
│  │ "Rahul's style is 🔥"          ││
│  │ 2h ago                          ││
│  └─────────────────────────────────┘│
│                                      │
│  ┌─────────────────────────────────┐│
│  │ "Priya won vibe for sure"       ││
│  │ 3h ago                          ││
│  └─────────────────────────────────┘│
│                                      │
│  [Create Your Own Post →]           │
│                                      │
└─────────────────────────────────────┘
```

---

## 🔒 ANTI-DUPLICATE VOTING SYSTEM

### Overview

Since we have no user accounts, we need multiple layers to prevent duplicate votes:

```
┌─────────────────────────────────────────────────────────────┐
│                   VOTE VALIDATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User attempts to vote                                       │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────┐                                       │
│  │ Layer 1: DB Check │ ← Fastest, check vote_locks table    │
│  └────────┬─────────┘                                       │
│           │                                                  │
│     Already voted? ─── YES ──▶ Show results only            │
│           │                                                  │
│          NO                                                  │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ Layer 2: IP Hash  │ ← SHA-256(IP + post_id)              │
│  └────────┬─────────┘                                       │
│           │                                                  │
│     Already voted? ─── YES ──▶ Block vote, show error       │
│           │                                                  │
│          NO                                                  │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ Layer 3: Browser  │ ← localStorage fingerprint           │
│  │    ID Check       │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│     Already voted? ─── YES ──▶ Block vote                   │
│           │                                                  │
│          NO                                                  │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ Allow Vote        │                                       │
│  │ Store all markers │                                       │
│  └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### 1. IP Hash Generation (Backend)

```python
# backend/utils/vote_security.py

import hashlib
from fastapi import Request

def get_client_ip(request: Request) -> str:
    """Extract real client IP from request"""
    # Check for proxy headers first
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    return request.client.host if request.client else "unknown"

def generate_ip_hash(ip_address: str, post_id: str) -> str:
    """
    Generate one-way hash for IP + post combination
    This prevents storing actual IP addresses
    """
    salt = os.getenv("HASH_SALT", "rateit-secret-salt")
    combined = f"{salt}:{ip_address}:{post_id}"
    return hashlib.sha256(combined.encode()).hexdigest()

async def has_voted_by_ip(ip_hash: str, post_id: str, db) -> bool:
    """Check if this IP has already voted on this post"""
    query = """
        SELECT 1 FROM vote_locks 
        WHERE ip_hash = $1 AND post_id = $2
    """
    result = await db.fetchval(query, ip_hash, post_id)
    return result is not None
```

#### 2. Browser Fingerprint (Frontend)

```typescript
// lib/fingerprint.ts

interface Fingerprint {
    browserId: string;
    createdAt: number;
}

export function generateBrowserId(): string {
    // Simple fingerprint based on browser characteristics
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width.toString(),
        screen.height.toString(),
        new Date().getTimezoneOffset().toString(),
        navigator.hardwareConcurrency?.toString() || 'unknown',
    ];
    
    const fingerprint = components.join('|');
    return hashString(fingerprint);
}

export function getOrCreateBrowserId(): string {
    const stored = localStorage.getItem('rateit_browser_id');
    
    if (stored) {
        const parsed: Fingerprint = JSON.parse(stored);
        // Refresh if older than 30 days
        if (Date.now() - parsed.createdAt < 30 * 24 * 60 * 60 * 1000) {
            return parsed.browserId;
        }
    }
    
    // Create new
    const newId = generateBrowserId();
    const fingerprint: Fingerprint = {
        browserId: newId,
        createdAt: Date.now()
    };
    
    localStorage.setItem('rateit_browser_id', JSON.stringify(fingerprint));
    return newId;
}

export function getVotedPosts(): Set<string> {
    const stored = localStorage.getItem('rateit_voted_posts');
    return stored ? new Set(JSON.parse(stored)) : new Set();
}

export function markPostAsVoted(postId: string): void {
    const voted = getVotedPosts();
    voted.add(postId);
    localStorage.setItem('rateit_voted_posts', JSON.stringify([...voted]));
}
```

#### 3. Vote Submission Flow

```python
# backend/routes/votes.py

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter()

class VoteRequest(BaseModel):
    item_id: str | None = None
    ratings: dict[str, int] | None = None  # {"looks": 8, "style": 7}
    ranking: list[str] | None = None
    comment: str | None = None

@router.post("/posts/{post_id}/vote")
async def submit_vote(
    post_id: str,
    vote_data: VoteRequest,
    request: Request,
    db = Depends(get_db)
):
    # 1. Get client identifiers
    client_ip = get_client_ip(request)
    ip_hash = generate_ip_hash(client_ip, post_id)
    browser_id = request.headers.get("X-Browser-ID")
    
    # 2. Check if already voted (fast DB check)
    if await has_voted_by_ip(ip_hash, post_id, db):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "ALREADY_VOTED",
                "message": "You have already voted on this post"
            }
        )
    
    # 3. Check browser ID if provided
    if browser_id:
        existing = await db.fetchval(
            "SELECT 1 FROM votes WHERE post_id = $1 AND browser_id = $2",
            post_id, browser_id
        )
        if existing:
            raise HTTPException(status_code=409, detail="ALREADY_VOTED")
    
    # 4. Validate post exists and is active
    post = await db.fetchrow(
        "SELECT type, expires_at, is_removed FROM posts WHERE id = $1",
        post_id
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["is_removed"]:
        raise HTTPException(status_code=410, detail="Post has been removed")
    if post["expires_at"] and post["expires_at"] < datetime.now():
        raise HTTPException(status_code=410, detail="Post has expired")
    
    # 5. Validate vote data based on post type
    await validate_vote_data(post["type"], vote_data, post_id, db)
    
    # 6. Record the vote (transaction)
    async with db.transaction():
        # Insert vote
        vote_id = await db.fetchval(
            """
            INSERT INTO votes (post_id, item_id, ip_hash, browser_id, ratings, ranking, comment)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            """,
            post_id,
            vote_data.item_id,
            ip_hash,
            browser_id,
            json.dumps(vote_data.ratings) if vote_data.ratings else None,
            json.dumps(vote_data.ranking) if vote_data.ranking else None,
            vote_data.comment
        )
        
        # Insert lock (for fast duplicate check)
        await db.execute(
            "INSERT INTO vote_locks (ip_hash, post_id) VALUES ($1, $2)",
            ip_hash, post_id
        )
        
        # Update post vote count
        await db.execute(
            "UPDATE posts SET vote_count = vote_count + 1 WHERE id = $1",
            post_id
        )
        
        # Update item vote count and scores
        if vote_data.item_id:
            await db.execute(
                "UPDATE items SET vote_count = vote_count + 1 WHERE id = $1",
                vote_data.item_id
            )
        
        if vote_data.ratings:
            for attr, score in vote_data.ratings.items():
                await db.execute(
                    """
                    UPDATE items 
                    SET total_score = total_score + $1 
                    WHERE id = $2
                    """,
                    score, vote_data.item_id
                )
        
        # Add comment if provided
        if vote_data.comment:
            await db.execute(
                """
                INSERT INTO comments (post_id, vote_id, content)
                VALUES ($1, $2, $3)
                """,
                post_id, vote_id, vote_data.comment
            )
            await db.execute(
                "UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1",
                post_id
            )
    
    return {
        "success": True,
        "message": "Vote recorded",
        "data": {"redirect_to": f"/p/{post_id}/results"}
    }
```

#### 4. Client-Side Pre-Check

```typescript
// hooks/useVote.ts

import { useState } from 'react';
import { getOrCreateBrowserId, getVotedPosts, markPostAsVoted } from '@/lib/fingerprint';
import { checkVoteStatus, submitVote } from '@/lib/api';

export function useVote(postId: string) {
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Quick local check first
    const localCheck = getVotedPosts().has(postId);
    
    // Then server check
    const checkServer = async () => {
        const browserId = getOrCreateBrowserId();
        const result = await checkVoteStatus(postId, browserId);
        setHasVoted(result.has_voted);
        return result.has_voted;
    };

    const vote = async (voteData: VoteData) => {
        setLoading(true);
        
        try {
            const browserId = getOrCreateBrowserId();
            await submitVote(postId, {
                ...voteData,
                browserId
            });
            
            // Mark locally
            markPostAsVoted(postId);
            setHasVoted(true);
            
            return { success: true };
        } catch (error) {
            if (error.code === 'ALREADY_VOTED') {
                markPostAsVoted(postId);
                setHasVoted(true);
            }
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { hasVoted, localCheck, checkServer, vote, loading };
}
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### Frontend Optimizations

#### 1. Image Optimization
```typescript
// next.config.js

const config = {
    images: {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [320, 420, 640, 750, 828, 1080],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            }
        ]
    }
};

// Component usage
<Image
    src={imageUrl}
    alt={name}
    width={300}
    height={300}
    loading="lazy"
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

#### 2. Component Code Splitting
```typescript
// app/page.tsx

import dynamic from 'next/dynamic';

// Heavy components loaded on demand
const PostCreator = dynamic(
    () => import('@/components/post/PostCreator'),
    { 
        loading: () => <CreatePostSkeleton />,
        ssr: false 
    }
);

const ResultsChart = dynamic(
    () => import('@/components/results/ScoreChart'),
    { 
        loading: () => <ChartSkeleton />,
        ssr: false 
    }
);
```

#### 3. Infinite Scroll with Virtualization
```typescript
// hooks/useInfiniteScroll.ts

import { useInView } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
    fetchMore: () => Promise<Post[]>;
    threshold?: number;
}

export function useInfiniteScroll({ fetchMore, threshold = 0.1 }: UseInfiniteScrollOptions) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(1);
    
    const ref = useRef(null);
    const isInView = useInView(ref, { 
        amount: threshold,
        once: false 
    });
    
    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        
        setLoading(true);
        try {
            const newPosts = await fetchMore();
            if (newPosts.length === 0) {
                setHasMore(false);
            } else {
                setPosts(prev => [...prev, ...newPosts]);
                pageRef.current++;
            }
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, fetchMore]);
    
    useEffect(() => {
        if (isInView) {
            loadMore();
        }
    }, [isInView, loadMore]);
    
    return { posts, loading, hasMore, ref, loadMore };
}
```

#### 4. Animation Performance
```typescript
// Use GPU-accelerated properties only
// ✅ Good: transform, opacity
// ❌ Bad: width, height, top, left

// framer-motion best practices
<motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    // Use will-change sparingly
    style={{ willChange: 'transform' }}
    // Use layoutId for smooth transitions
    layoutId={`post-${post.id}`}
>
```

#### 5. State Management
```typescript
// Use React Query for server state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useFeed(type: 'trending' | 'recent') {
    return useQuery({
        queryKey: ['feed', type],
        queryFn: () => fetchFeed(type),
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}

export function useCreatePost() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: createPost,
        onSuccess: () => {
            // Invalidate and refetch feed
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        }
    });
}
```

### Backend Optimizations

#### 1. Database Indexing
```sql
-- Already covered in schema, but critical indexes:
CREATE INDEX CONCURRENTLY idx_posts_feed ON posts(created_at DESC) 
    WHERE is_removed = FALSE AND (expires_at IS NULL OR expires_at > NOW());

CREATE INDEX CONCURRENTLY idx_vote_locks ON vote_locks(post_id, ip_hash);

-- Partial index for active posts
CREATE INDEX CONCURRENTLY idx_posts_active ON posts(vote_count DESC) 
    WHERE is_removed = FALSE AND (expires_at IS NULL OR expires_at > NOW());
```

#### 2. Connection Pooling (Supabase)
```python
# backend/database.py

import asyncpg
from contextlib import asynccontextmanager

# Supabase provides connection pooling automatically
# But for direct connections:

DATABASE_URL = os.getenv("DATABASE_URL")
POOL_SIZE = 10
MAX_OVERFLOW = 20

pool = None

async def init_db():
    global pool
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=POOL_SIZE,
        max_size=POOL_SIZE + MAX_OVERFLOW,
        command_timeout=30
    )

async def get_db():
    async with pool.acquire() as conn:
        yield conn
```

#### 3. Caching Strategy
```python
# backend/cache.py

from functools import lru_cache
import redis

redis_client = redis.from_url(os.getenv("REDIS_URL"))

# Cache trending posts for 5 minutes
async def get_trending_posts(limit: int = 10) -> list[dict]:
    cache_key = f"trending:{limit}"
    
    # Try cache first
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Query database
    posts = await db.fetch("""
        SELECT id, type, caption, vote_count, created_at
        FROM posts
        WHERE is_removed = FALSE
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY (
            (SELECT COUNT(*) FROM votes 
             WHERE votes.post_id = posts.id 
             AND votes.created_at > NOW() - INTERVAL '6 hours') * 2
            + vote_count
        ) DESC
        LIMIT $1
    """, limit)
    
    # Cache for 5 minutes
    redis_client.setex(cache_key, 300, json.dumps(posts))
    return posts

# Clear cache on new vote
async def clear_post_cache(post_id: str):
    redis_client.delete(f"post:{post_id}")
    redis_client.delete("trending:10")
    redis_client.delete("trending:20")
```

#### 4. Rate Limiting
```python
# backend/middleware/rate_limit.py

from fastapi import Request, HTTPException
from collections import defaultdict
import time

# In-memory rate limiting (use Redis in production)
rate_limits = defaultdict(list)

async def rate_limit_middleware(request: Request, call_next):
    ip = get_client_ip(request)
    now = time.time()
    
    # Clean old entries
    rate_limits[ip] = [t for t in rate_limits[ip] if now - t < 60]
    
    # Check limits
    if request.method == "POST":
        # 20 POST requests per minute
        if len(rate_limits[ip]) >= 20:
            raise HTTPException(429, "Too many requests. Try again later.")
    
    # 100 requests per minute overall
    if len(rate_limits[ip]) >= 100:
        raise HTTPException(429, "Rate limit exceeded")
    
    rate_limits[ip].append(now)
    
    return await call_next(request)

# Specific rate limits
POST_LIMITS = {
    "create_post": {"limit": 5, "window": 3600},      # 5 posts per hour
    "vote": {"limit": 50, "window": 3600},            # 50 votes per hour
    "upload_image": {"limit": 20, "window": 3600},    # 20 uploads per hour
}
```

#### 5. Response Compression
```python
# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

---

## 🔐 SECURITY MEASURES

### 1. Input Validation
```python
# backend/utils/validation.py

from pydantic import BaseModel, Field, validator
import re

class CreatePostRequest(BaseModel):
    type: str = Field(..., pattern="^(rate|poll|wyr|rank)$")
    caption: str | None = Field(None, max_length=120)
    attributes: list[str] | None = Field(None, max_items=5)
    
    @validator('caption')
    def sanitize_caption(cls, v):
        if v:
            # Remove potential XSS
            v = re.sub(r'<[^>]+>', '', v)
            # Basic profanity filter
            v = filter_profanity(v)
        return v
    
    @validator('attributes')
    def validate_attributes(cls, v):
        if v:
            for attr in v:
                if len(attr) > 20:
                    raise ValueError('Attribute too long')
                if not re.match(r'^[a-zA-Z\s]+$', attr):
                    raise ValueError('Invalid attribute')
        return v
```

### 2. Image Security
```python
# backend/utils/image_validation.py

import magic
from PIL import Image
import io

ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
MAX_SIZE = 5 * 1024 * 1024  # 5MB

async def validate_image(file: UploadFile) -> bytes:
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise ValueError("Image must be under 5MB")
    
    # Check MIME type by magic bytes
    mime = magic.from_buffer(contents, mime=True)
    if mime not in ALLOWED_TYPES:
        raise ValueError("Only JPEG, PNG, and WebP allowed")
    
    # Validate image can be opened
    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()
    except:
        raise ValueError("Invalid image file")
    
    return contents
```

### 3. CORS Configuration
```python
# backend/main.py

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://rateapp.com",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
    max_age=3600,
)
```

### 4. Content Moderation
```python
# backend/utils/moderation.py

# Option 1: Simple word filter
BANNED_WORDS = [...]  # List of banned words

def filter_profanity(text: str) -> str:
    for word in BANNED_WORDS:
        text = re.sub(
            rf'\b{re.escape(word)}\b',
            '*' * len(word),
            text,
            flags=re.IGNORECASE
        )
    return text

# Option 2: AI-based moderation (Phase 2)
async def moderate_image(image_url: str) -> bool:
    """Returns True if image is safe"""
    # Use Sightengine, Hive, or similar API
    # Check for: nudity, violence, drugs, etc.
    pass

# Auto-hide posts with many reports
async def check_reports(post_id: str, db):
    count = await db.fetchval(
        "SELECT report_count FROM posts WHERE id = $1",
        post_id
    )
    if count >= 10:
        await db.execute(
            "UPDATE posts SET is_removed = TRUE WHERE id = $1",
            post_id
        )
        # Log for admin review
        await log_auto_removal(post_id, count)
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       PRODUCTION ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         ┌─────────────┐                         │
│                         │   USERS     │                         │
│                         └──────┬──────┘                         │
│                                │                                 │
│                                ▼                                 │
│                    ┌───────────────────┐                        │
│                    │   VERCEL EDGE     │                        │
│                    │   (Next.js SSR)   │                        │
│                    │   - CDN           │                        │
│                    │   - Edge Cache    │                        │
│                    └─────────┬─────────┘                        │
│                              │                                   │
│                              ▼                                   │
│                    ┌───────────────────┐                        │
│                    │   FASTAPI         │                        │
│                    │   (Railway/       │                        │
│                    │    Render/Fly.io) │                        │
│                    └─────────┬─────────┘                        │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│      │  SUPABASE   │ │   SUPABASE  │ │    REDIS    │           │
│      │  PostgreSQL │ │   Storage   │ │   (Cache)   │           │
│      └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables

```bash
# .env.example

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://rateapp.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Database
DATABASE_URL=postgresql://...

# API
FASTAPI_URL=https://api.rateapp.com

# Security
HASH_SALT=random-secret-salt-32chars

# Optional: Redis
REDIS_URL=redis://...

# Optional: Image Moderation
MODERATION_API_KEY=xxx
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint
      
      - name: Build
        run: npm run build

  deploy-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: |
          # Railway auto-deploys on push to main
          echo "Backend deployed via Railway"
```

---

## 📅 MVP BUILD PHASES

### Phase 1: Core Features (Week 1-2)

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 1 CHECKLIST                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND (Next.js)                                         │
│  ☐ Project setup with Tailwind + Framer Motion              │
│  ☐ Mobile-first layout & navigation                         │
│  ☐ Feed page with post cards                                │
│  ☐ Create post page (image upload + form)                   │
│  ☐ Vote page (all 4 types)                                  │
│  ☐ Results page with basic charts                           │
│  ☐ Loading states & error handling                          │
│                                                              │
│  BACKEND (FastAPI)                                          │
│  ☐ Project setup with async database                        │
│  ☐ Database schema & migrations                             │
│  ☐ POST /posts - create post                                │
│  ☐ GET /posts - feed with pagination                        │
│  ☐ GET /posts/:id - single post                             │
│  ☐ POST /posts/:id/vote - submit vote                       │
│  ☐ GET /posts/:id/results - results                         │
│  ☐ Image upload to Supabase Storage                         │
│                                                              │
│  CORE FEATURES                                              │
│  ☐ IP-based vote tracking                                   │
│  ☐ Browser fingerprinting                                   │
│  ☐ Basic rate limiting                                      │
│                                                              │
│  DELIVERABLE                                                │
│  → Working MVP deployed to Vercel + Railway                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Polish & Features (Week 3-4)

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 2 CHECKLIST                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ANIMATIONS                                                  │
│  ☐ Page transitions (fade + slide)                          │
│  ☐ Button interactions (ripple, bounce)                     │
│  ☐ Card animations (stagger, hover)                         │
│  ☐ Vote slider smooth interactions                          │
│  ☐ Results chart animations                                 │
│  ☐ Pull-to-refresh gesture                                  │
│  ☐ Skeleton loading states                                  │
│                                                              │
│  FEATURES                                                    │
│  ☐ Comments on posts                                        │
│  ☐ Report system                                            │
│  ☐ Post expiry (auto-disable voting)                        │
│  ☐ Delete post (with creator token)                         │
│  ☐ Share functionality                                      │
│  ☐ Copy link to clipboard                                   │
│                                                              │
│  OPTIMIZATION                                               │
│  ☐ Image optimization (WebP, lazy load)                     │
│  ☐ Infinite scroll                                          │
│  ☐ Caching (Redis or in-memory)                             │
│  ☐ Bundle size optimization                                 │
│                                                              │
│  DELIVERABLE                                                │
│  → Polished, animated, production-ready app                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Scale & Advanced (Week 5-6)

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 3 CHECKLIST                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ADVANCED FEATURES                                          │
│  ☐ Trending algorithm                                       │
│  ☐ Random post discovery                                    │
│  ☐ Admin dashboard for moderation                           │
│  ☐ Analytics (views, vote rate, share rate)                 │
│  ☐ AI image moderation (optional)                           │
│                                                              │
│  PERFORMANCE                                                 │
│  ☐ CDN configuration                                        │
│  ☐ Database query optimization                              │
│  ☐ Redis caching layer                                      │
│  ☐ Performance monitoring (Sentry, Vercel Analytics)        │
│                                                              │
│  SEO & GROWTH                                               │
│  ☐ Meta tags & Open Graph                                   │
│  ☐ Sitemap                                                  │
│  ☐ PWA support (optional)                                   │
│  ☐ Social sharing previews                                  │
│                                                              │
│  DELIVERABLE                                                │
│  → Fully featured, scalable application                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 PROJECT FILE STRUCTURE

```
anonymous-rating-app/
│
├── frontend/                          # Next.js App
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── create/
│   │   │   └── page.tsx
│   │   └── p/
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── results/
│   │               └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── post/
│   │   ├── vote/
│   │   ├── results/
│   │   ├── feed/
│   │   ├── layout/
│   │   └── animations/
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── fingerprint.ts
│   │   ├── storage.ts
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── useVote.ts
│   │   ├── usePost.ts
│   │   └── useFeed.ts
│   │
│   ├── public/
│   │   ├── icons/
│   │   └── images/
│   │
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                           # FastAPI App
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   │
│   │   ├── routes/
│   │   │   ├── posts.py
│   │   │   ├── votes.py
│   │   │   ├── upload.py
│   │   │   └── reports.py
│   │   │
│   │   ├── models/
│   │   │   ├── post.py
│   │   │   ├── vote.py
│   │   │   └── report.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── post.py
│   │   │   ├── vote.py
│   │   │   └── response.py
│   │   │
│   │   └── utils/
│   │       ├── vote_security.py
│   │       ├── validation.py
│   │       ├── image_validation.py
│   │       └── moderation.py
│   │
│   ├── migrations/
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
│
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── .env.example
├── README.md
└── docker-compose.yml
```

---

## ✅ SUCCESS METRICS

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Page Load Time** | < 2 seconds | Lighthouse, Vercel Analytics |
| **Mobile Performance** | > 90 score | Lighthouse mobile |
| **Vote Completion Rate** | > 80% | Analytics events |
| **Share Rate** | > 10% of voters | Share button clicks |
| **Return Users** | > 30% | Browser fingerprint tracking |
| **Error Rate** | < 1% | Sentry error tracking |

---

## 🎯 SUMMARY

This plan outlines a complete anonymous rating application with:

1. **Mobile-first, animated UI** using Next.js + Framer Motion
2. **Fast, scalable backend** using FastAPI + PostgreSQL
3. **Anonymous voting** with IP hash + browser fingerprint
4. **4 post types**: Rate, Poll, Would You Rather, Ranking
5. **Viral mechanics**: Share links, trending algorithm
6. **Security**: Rate limiting, input validation, moderation
7. **Performance**: Image optimization, caching, lazy loading

**Estimated Timeline**: 4-6 weeks for full MVP with polish

---

*End of Document*

#### Button Animations
```typescript
// components/animations/buttonAnimations.ts

export const buttonVariants = {
    initial: { scale: 1 },
    tap: { 
        scale: 0.95,
        transition: { type: "spring", stiffness: 400, damping: 17 }
    },
    hover: { 
        scale: 1.02,
        transition: { type: "spring", stiffness: 400, damping: 17 }
    }
};

export const rippleEffect = {
    // Creates expanding circle from tap point
    // Opacity fades from 0.3 to 0
    // Scale expands from 0 to 2
    // Duration: 600ms
};
```

#### Card Animations
```typescript
// components/animations/cardAnimations.ts

export const cardVariants = {
    offscreen: {
        y: 50,
        opacity: 0
    },
    onscreen: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            bounce: 0.3,
            duration: 0.6
        }
    }
};

export const cardHover = {
    y: -4,
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
    transition: { duration: 0.2 }
};
```

#### Loading Animations
```typescript
// components/animations/loadingAnimations.ts

export const skeletonShimmer = {
    background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite"
};

export const pulseVariants = {
    animate: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.7, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity
        }
    }
};

export const bounceVariants = {
    animate: {
        y: [0, -10, 0],
        transition: {
            duration: 0.6,
            repeat: Infinity
        }
    }
};
```

---

---
```

---
