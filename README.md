# Anonymous Rating App

A zero-login anonymous social comparison platform where users upload items and others rate or vote.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (Supabase)
- **Caching**: Redis (optional)

## Features

### Post Types
- **Rate**: Rate items 1-10 on custom attributes (looks, style, vibe)
- **Poll**: Pick one from multiple options
- **Would You Rather**: Choose between two options
- **Rank**: Rank items in order of preference

### Core Features
- Anonymous voting with IP hash + browser fingerprint
- Trending algorithm with age decay
- Pull-to-refresh gesture
- Share to social media
- Report inappropriate content
- PWA support

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Database Setup

Run the SQL migration in `database/migrations/001_initial_schema.sql` on your PostgreSQL database.

## Project Structure

```
├── frontend/           # Next.js app
│   ├── app/           # App router pages
│   ├── components/    # React components
│   │   ├── ui/       # Base UI components
│   │   ├── animations/ # Animation presets
│   │   ├── feed/     # Feed components
│   │   ├── vote/     # Voting components
│   │   └── layout/   # Layout components
│   ├── lib/          # Utilities and API client
│   └── hooks/        # Custom React hooks
│
├── backend/           # FastAPI app
│   ├── app/
│   │   ├── routes/   # API endpoints
│   │   ├── schemas/  # Pydantic models
│   │   └── utils/    # Utilities (cache, trending, security)
│   └── requirements.txt
│
└── database/
    └── migrations/    # SQL migrations
```

## API Endpoints

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /posts | Create a new post |
| GET | /posts | Get feed (trending/recent/random) |
| GET | /posts/:id | Get single post |
| DELETE | /posts/:id | Delete post (requires creator_token) |

### Voting
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /posts/:id/vote | Submit vote |
| GET | /posts/:id/vote-check | Check if voted |
| GET | /posts/:id/results | Get results |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /posts/:id/report | Report post |
| POST | /upload/image | Upload image |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/stats | Get platform statistics |
| GET | /admin/posts/reported | Get reported posts |
| POST | /admin/posts/:id/approve | Approve reported post |
| POST | /admin/posts/:id/remove | Remove post |
| GET | /admin/analytics/daily | Get daily analytics |

## Environment Variables

### Frontend
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Backend
```env
DATABASE_URL=postgresql://user:password@localhost:5432/rateit
HASH_SALT=your-secret-salt
CORS_ORIGINS=["http://localhost:3000"]
REDIS_URL=redis://localhost:6379  # optional
```

## Performance

- Image optimization with Next.js Image (WebP/AVIF)
- Framer Motion animations with GPU acceleration
- Redis caching for trending posts
- Gzip compression on API responses
- Rate limiting to prevent abuse

## License

MIT
