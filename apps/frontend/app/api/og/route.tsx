import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const caption = searchParams.get('caption') || 'Rate this!'
  const type = searchParams.get('type') || 'poll'

  const typeEmoji: Record<string, string> = {
    rate: '⭐',
    poll: '📊',
    wyr: '🤔',
    rank: '🏆',
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0ea5e9',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '48px',
            width: '100%',
            maxWidth: '1000px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            <span style={{ fontSize: '64px', marginRight: '16px' }}>
              {typeEmoji[type] || '📊'}
            </span>
            <span
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#0ea5e9',
              }}
            >
              Cliche
            </span>
          </div>

          <p
            style={{
              fontSize: '36px',
              fontWeight: '600',
              color: '#1f2937',
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {caption.length > 60 ? caption.slice(0, 60) + '...' : caption}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '32px',
              color: '#6b7280',
              fontSize: '20px',
            }}
          >
            <span style={{ marginRight: '8px' }}>🗳️</span>
            <span>Vote now - No signup required!</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
