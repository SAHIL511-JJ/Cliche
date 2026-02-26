# Implementation Plan: User Activity History & Precise End Time

## Overview

This document outlines the implementation plan for two new features:
1. **User Activity History** - Allow users to see all posts they have interacted with (voted on)
2. **Precise End Time Selection** - Allow users to set a specific date and time when their post activity will end

---

## Feature 1: User Activity History

### Current State Analysis

The system already tracks user interactions:
- **Backend**: `votes` table stores all votes with `browser_id` and `ip_hash`
- **Frontend**: `localStorage` stores voted post IDs via `markPostAsVoted()` in [`frontend/lib/fingerprint.ts`](frontend/lib/fingerprint.ts)

### Implementation Plan

#### 1.1 Backend Changes

**New Endpoint: `GET /api/v1/users/activity`**

Location: [`backend/app/routes/posts.py`](backend/app/routes/posts.py) (or new file `users.py`)

```python
@router.get("/users/activity")
async def get_user_activity(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=20),
    db=Depends(get_db)
):
    """
    Fetch all posts the user has voted on.
    Uses browser_id from header and ip_hash for identification.
    Returns both live and ended posts.
    """
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "type": "poll|wyr|rate|rank|compare",
        "caption": "string",
        "items": [...],
        "vote_count": 10,
        "comment_count": 5,
        "expires_at": "2026-02-22T13:45:00Z",
        "created_at": "2026-02-15T13:45:00Z",
        "is_expired": true,
        "user_voted_at": "2026-02-16T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "has_more": true
    }
  }
}
```

**Database Query:**
```sql
SELECT DISTINCT p.id, p.type, p.caption, p.vote_count, p.comment_count, 
       p.expires_at, p.created_at, v.created_at as user_voted_at
FROM posts p
INNER JOIN votes v ON p.id = v.post_id
WHERE (v.browser_id = $1 OR v.ip_hash = $2)
  AND p.is_removed = FALSE
ORDER BY v.created_at DESC
LIMIT $3 OFFSET $4
```

#### 1.2 Frontend Changes

**New Page: [`frontend/app/activity/page.tsx`](frontend/app/activity/page.tsx)**

Features:
- Display list of posts user has voted on
- Show status badge (Live/Ended)
- Click to view results
- Filter by status (All/Live/Ended)
- Pull to refresh support

**API Integration:**

Add to [`frontend/lib/api.ts`](frontend/lib/api.ts):
```typescript
async getUserActivity(
  page = 1,
  limit = 10
): Promise<PaginatedResponse<ActivityPost>> {
  return request<PaginatedResponse<ActivityPost>>(
    `/users/activity?page=${page}&limit=${limit}`
  )
}
```

**Types:**

Add to [`frontend/lib/types.ts`](frontend/lib/types.ts):
```typescript
export interface ActivityPost extends Post {
  is_expired: boolean
  user_voted_at: string
}
```

**Navigation:**

Update [`frontend/components/layout/Sidebar.tsx`](frontend/components/layout/Sidebar.tsx):
```typescript
const navItems = [
  { href: '/', icon: HomeIcon, label: 'Home' },
  { href: '/create', icon: PlusIcon, label: 'Create' },
  { href: '/activity', icon: HistoryIcon, label: 'My Activity' },  // NEW
  { href: '/trending', icon: FireIcon, label: 'Trending' },
]
```

**Mobile Navigation:**

Update [`frontend/components/layout/MobileNav.tsx`](frontend/components/layout/MobileNav.tsx) similarly.

---

## Feature 2: Precise End Time Selection

### Current State Analysis

- **Backend**: Accepts `expires_in_hours` in [`backend/app/schemas/post.py`](backend/app/schemas/post.py)
- **Frontend**: Uses preset duration options in [`frontend/app/create/page.tsx`](frontend/app/create/page.tsx):
  ```typescript
  const DURATION_OPTIONS = [
    { value: 24, label: '24 hours' },
    { value: 72, label: '3 days' },
    { value: 168, label: '7 days' },
    { value: 720, label: '30 days' },
  ]
  ```

### Implementation Plan

#### 2.1 Backend Changes

**Update Schema: [`backend/app/schemas/post.py`](backend/app/schemas/post.py)**

```python
class PostCreate(BaseModel):
    type: str
    caption: Optional[str] = None
    attributes: Optional[List[str]] = None
    items: List[ItemCreate]
    expires_in_hours: Optional[int] = None
    expires_at: Optional[datetime] = None  # NEW: Direct datetime support
```

**Update Endpoint: [`backend/app/routes/posts.py`](backend/app/routes/posts.py)**

```python
@router.post("/posts")
async def create_post(post_data: PostCreate, request: Request, db=Depends(get_db)):
    # ... existing validation ...
    
    expires_at = None
    if post_data.expires_at:
        # Use direct datetime if provided
        expires_at = post_data.expires_at
    elif post_data.expires_in_hours:
        # Fallback to hours calculation
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=post_data.expires_in_hours
        )
    
    # Validate expires_at is in the future
    if expires_at and expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Expiration time must be in the future"
        )
```

#### 2.2 Frontend Changes

**Update Create Page: [`frontend/app/create/page.tsx`](frontend/app/create/page.tsx)**

Replace duration selection with datetime picker:

```typescript
// State
const [endTimeMode, setEndTimeMode] = useState<'preset' | 'custom'>('preset')
const [customEndDate, setCustomEndDate] = useState<string>('')
const [customEndTime, setCustomEndTime] = useState<string>('')

// Calculate expires_at
const getExpiresAt = () => {
  if (endTimeMode === 'preset') {
    return undefined // Use expires_in_hours
  }
  
  if (customEndDate && customEndTime) {
    const dateTime = new Date(`${customEndDate}T${customEndTime}`)
    return dateTime.toISOString()
  }
  
  return undefined
}
```

**UI Component:**

```tsx
{/* Step 5: Duration/End Time */}
{step === 5 && (
  <motion.div>
    <h2>When should it end?</h2>
    
    {/* Mode Toggle */}
    <div className="flex gap-2 mb-4">
      <button onClick={() => setEndTimeMode('preset')} 
        className={endTimeMode === 'preset' ? 'active' : ''}>
        Quick Select
      </button>
      <button onClick={() => setEndTimeMode('custom')}
        className={endTimeMode === 'custom' ? 'active' : ''}>
        Custom Date & Time
      </button>
    </div>
    
    {/* Preset Options */}
    {endTimeMode === 'preset' && (
      <div className="grid grid-cols-2 gap-3">
        {DURATION_OPTIONS.map(opt => (
          <button onClick={() => setDuration(opt.value)}>
            {opt.label}
          </button>
        ))}
      </div>
    )}
    
    {/* Custom DateTime Picker */}
    {endTimeMode === 'custom' && (
      <div className="space-y-4">
        <input 
          type="date" 
          value={customEndDate}
          onChange={e => setCustomEndDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        <input 
          type="time" 
          value={customEndTime}
          onChange={e => setCustomEndTime(e.target.value)}
        />
        <p className="text-sm text-gray-500">
          {customEndDate && customEndTime && (
            <>Ends at: {new Date(`${customEndDate}T${customEndTime}`).toLocaleString()}</>
          )}
        </p>
      </div>
    )}
  </motion.div>
)}
```

**Update API Call:**

```typescript
const handleSubmit = async () => {
  // ... existing code ...
  
  const payload: CreatePostRequest = {
    type: postMode,
    caption: caption || undefined,
    attributes: postMode === 'rate' || postMode === 'compare' ? attributes : undefined,
    items: processedItems,
  }
  
  if (endTimeMode === 'preset') {
    payload.expires_in_hours = duration
  } else if (customEndDate && customEndTime) {
    payload.expires_at = new Date(`${customEndDate}T${customEndTime}`).toISOString()
  }
  
  const response = await api.createPost(payload)
}
```

**Update Types: [`frontend/lib/types.ts`](frontend/lib/types.ts)**

```typescript
export interface CreatePostRequest {
  type: PostType
  caption?: string
  attributes?: string[]
  items: {
    name: string
    image_base64?: string
    image_url?: string
  }[]
  expires_in_hours?: number
  expires_at?: string  // NEW: ISO datetime string
}
```

---

## Implementation Order

### Phase 1: Backend (Both Features)
1. Update `PostCreate` schema to accept `expires_at`
2. Update `create_post` endpoint to handle `expires_at`
3. Create new `/users/activity` endpoint

### Phase 2: Frontend - Precise End Time
1. Update `CreatePostRequest` type
2. Update `api.createPost()` to send `expires_at`
3. Update create page with datetime picker UI

### Phase 3: Frontend - Activity History
1. Add `ActivityPost` type
2. Add `getUserActivity()` to API
3. Create activity page component
4. Update navigation (Sidebar + MobileNav)

---

## Database Considerations

### Existing Tables (No Migration Needed)

The current schema already supports both features:

1. **Activity History**: 
   - `votes` table has `browser_id` and `ip_hash` columns
   - `posts` table has `expires_at` column

2. **Precise End Time**:
   - `posts.expires_at` is already a `TIMESTAMP WITH TIME ZONE`

### Index Recommendations (Optional)

For better activity history performance:
```sql
CREATE INDEX idx_votes_browser_id ON votes(browser_id);
CREATE INDEX idx_votes_created_at ON votes(created_at DESC);
```

---

## Testing Checklist

### Feature 1: Activity History
- [ ] View empty state when no activity
- [ ] View list of voted posts
- [ ] See "Live" badge for active posts
- [ ] See "Ended" badge for expired posts
- [ ] Click post to view results
- [ ] Pagination works correctly
- [ ] Pull to refresh works
- [ ] Works on mobile and desktop

### Feature 2: Precise End Time
- [ ] Preset duration still works
- [ ] Custom date picker shows future dates only
- [ ] Custom time picker works
- [ ] Combined datetime is correctly sent to backend
- [ ] Backend validates future datetime
- [ ] Post shows correct expiration time
- [ ] Error handling for invalid dates
