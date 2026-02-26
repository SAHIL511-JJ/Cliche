import { Metadata } from 'next'

export const defaultMetadata: Metadata = {
  title: {
    default: 'Cliche - Anonymous Rating App',
    template: '%s | Cliche'
  },
  description: 'A zero-login anonymous social comparison platform where users upload items and others rate or vote. Rate outfits, food, events, and more!',
  keywords: ['rating', 'voting', 'poll', 'anonymous', 'social', 'comparison', 'rate'],
  authors: [{ name: 'Cliche' }],
  creator: 'Cliche',
  publisher: 'Cliche',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://rateapp.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Cliche',
    title: 'Cliche - Anonymous Rating App',
    description: 'A zero-login anonymous social comparison platform where users upload items and others rate or vote.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cliche',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cliche - Anonymous Rating App',
    description: 'A zero-login anonymous social comparison platform',
    images: ['/og-image.png'],
    creator: '@cliche',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export function generatePostMetadata(post: {
  id: string
  caption: string | null
  type: string
  items: { name: string | null; image_url: string }[]
}): Metadata {
  const title = post.caption || `Rate this ${post.type}!`
  const description = `Vote on ${post.items.length} options: ${post.items.map(i => i.name || 'Option').join(', ')}`
  const imageUrl = post.items[0]?.image_url || '/og-image.png'

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/p/${post.id}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}
