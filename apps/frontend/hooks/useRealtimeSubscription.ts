'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type PostgresAction = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface SubscriptionConfig {
    table: string
    event?: PostgresAction
    filter?: string
    schema?: string
    onInsert?: (payload: any) => void
    onUpdate?: (payload: any) => void
    onDelete?: (payload: any) => void
    onChange?: (payload: any) => void
}

export function useRealtimeSubscription(
    configs: SubscriptionConfig[],
    enabled: boolean = true
) {
    const channelRef = useRef<RealtimeChannel | null>(null)

    useEffect(() => {
        if (!supabase || !enabled || configs.length === 0) return

        const channelName = `realtime-${configs.map(c => c.table).join('-')}-${Date.now()}`
        let channel = supabase.channel(channelName)

        for (const config of configs) {
            const {
                table,
                event = '*',
                filter,
                schema = 'public',
                onInsert,
                onUpdate,
                onDelete,
                onChange,
            } = config

            const pgConfig: any = {
                event,
                schema,
                table,
            }
            if (filter) {
                pgConfig.filter = filter
            }

            channel = channel.on(
                'postgres_changes' as any,
                pgConfig,
                (payload: any) => {
                    onChange?.(payload)
                    if (payload.eventType === 'INSERT') onInsert?.(payload)
                    if (payload.eventType === 'UPDATE') onUpdate?.(payload)
                    if (payload.eventType === 'DELETE') onDelete?.(payload)
                }
            )
        }

        channel.subscribe()
        channelRef.current = channel

        return () => {
            if (channelRef.current && supabase) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [configs.map(c => `${c.table}:${c.filter}`).join(','), enabled])
}
