'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '@/types';

export function useMessages(userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<number | undefined>(undefined);

  const fetchMessages = useCallback(async (): Promise<Message[]> => {
    const res = await fetch('/api/messages', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to load messages');
    const data = await res.json();
    return data.messages as Message[];
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const msgs = await fetchMessages();
        if (cancelled) return;
        setMessages(msgs);
        if (msgs.length > 0) {
          cursorRef.current = parseInt(msgs[msgs.length - 1].id, 10);
          setHasMore(msgs.length >= 20);
        } else {
          setHasMore(false);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
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
  }, [userId, fetchMessages]);

  const refreshMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const msgs = await fetchMessages();
      setMessages(msgs);
      if (msgs.length > 0) {
        cursorRef.current = parseInt(msgs[msgs.length - 1].id, 10);
        setHasMore(msgs.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch {
      // ignore refresh failures
    }
  }, [userId, fetchMessages]);

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

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)));
  }, []);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refreshMessages,
    updateMessage,
  };
}
