const STORAGE_PREFIX = 'rateit_'

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Ignore errors
  }
}

export function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

export function removeStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // Ignore errors
  }
}
