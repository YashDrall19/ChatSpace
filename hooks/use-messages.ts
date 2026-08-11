'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '@/types';

export function useMessages(userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/messages', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const msgs: Message[] = data.messages;
        setMessages(msgs);
        if (msgs.length > 0) {
          cursorRef.current = parseInt(msgs[msgs.length - 1].id, 10);
          setHasMore(msgs.length >= 20);
        } else {
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/messages?cursor=${cursorRef.current}`, { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      const older: Message[] = data.messages;
      setMessages((prev) => [...prev, ...older]);
      if (older.length > 0) {
        cursorRef.current = parseInt(older[older.length - 1].id, 10);
      }
      setHasMore(data.hasMore ?? false);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, loadingMore, hasMore]);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
