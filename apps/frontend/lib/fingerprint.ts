interface Fingerprint {
  browserId: string
  createdAt: number
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export function generateBrowserId(): string {
  if (typeof window === 'undefined') return ''
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown',
    navigator.platform || 'unknown',
    screen.colorDepth?.toString() || 'unknown',
  ]

  const fingerprint = components.join('|')
  return hashString(fingerprint)
}

export function getOrCreateBrowserId(): string {
  if (typeof window === 'undefined') return ''
  
  try {
    const stored = localStorage.getItem('rateit_browser_id')
    
    if (stored) {
      const parsed: Fingerprint = JSON.parse(stored)
      if (Date.now() - parsed.createdAt < 30 * 24 * 60 * 60 * 1000) {
        return parsed.browserId
      }
    }

    const newId = generateBrowserId()
    const fingerprint: Fingerprint = {
      browserId: newId,
      createdAt: Date.now(),
    }

    localStorage.setItem('rateit_browser_id', JSON.stringify(fingerprint))
    return newId
  } catch {
    return generateBrowserId()
  }
}

export function getVotedPosts(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  
  try {
    const stored = localStorage.getItem('rateit_voted_posts')
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

export function markPostAsVoted(postId: string): void {
  if (typeof window === 'undefined') return

  try {
    const voted = getVotedPosts()
    voted.add(postId)
    localStorage.setItem('rateit_voted_posts', JSON.stringify(Array.from(voted)))
  } catch {
    // Ignore storage errors
  }
}

export function getCreatorToken(postId: string): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('rateit_creator_tokens')
    if (stored) {
      const tokens: Record<string, string> = JSON.parse(stored)
      return tokens[postId] || null
    }
    return null
  } catch {
    return null
  }
}

export function saveCreatorToken(postId: string, token: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem('rateit_creator_tokens')
    const tokens: Record<string, string> = stored ? JSON.parse(stored) : {}
    tokens[postId] = token
    localStorage.setItem('rateit_creator_tokens', JSON.stringify(tokens))
  } catch {
    // Ignore storage errors
  }
}
