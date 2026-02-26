import { useCallback, useEffect } from 'react'

type EventName = 
  | 'page_view'
  | 'post_view'
  | 'post_create'
  | 'vote_submit'
  | 'share_click'
  | 'report_submit'

interface EventProperties {
  [key: string]: string | number | boolean | undefined
}

export function useAnalytics() {
  const trackEvent = useCallback((eventName: EventName, properties?: EventProperties) => {
    if (typeof window === 'undefined') return

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, properties)
      return
    }

    if (typeof (window as any).gtag !== 'undefined') {
      ;(window as any).gtag('event', eventName, properties)
    }

    if (typeof (window as any).plausible !== 'undefined') {
      ;(window as any).plausible(eventName, { props: properties })
    }
  }, [])

  const trackPageView = useCallback((path: string) => {
    trackEvent('page_view', { path })
  }, [trackEvent])

  const trackPostView = useCallback((postId: string, postType: string) => {
    trackEvent('post_view', { post_id: postId, post_type: postType })
  }, [trackEvent])

  const trackPostCreate = useCallback((postType: string, itemCount: number) => {
    trackEvent('post_create', { post_type: postType, item_count: itemCount })
  }, [trackEvent])

  const trackVoteSubmit = useCallback((postId: string, postType: string, hasComment: boolean) => {
    trackEvent('vote_submit', { 
      post_id: postId, 
      post_type: postType,
      has_comment: hasComment 
    })
  }, [trackEvent])

  const trackShareClick = useCallback((postId: string, platform: string) => {
    trackEvent('share_click', { post_id: postId, platform })
  }, [trackEvent])

  const trackReportSubmit = useCallback((postId: string, reason: string) => {
    trackEvent('report_submit', { post_id: postId, reason })
  }, [trackEvent])

  return {
    trackEvent,
    trackPageView,
    trackPostView,
    trackPostCreate,
    trackVoteSubmit,
    trackShareClick,
    trackReportSubmit,
  }
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const path = window.location.pathname
    if (path !== '/') {
      console.log('[Analytics] Page view:', path)
    }
  }, [])

  return children
}
