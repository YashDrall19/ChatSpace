'use client';

import { Pin } from 'lucide-react';
import type { Message } from '@/types';
import { formatTimestamp } from '@/lib/utils/format';

interface PinnedBarProps {
  messages: Message[];
}

export function PinnedBar({ messages }: PinnedBarProps) {
  if (messages.length === 0) return null;
  const latest = messages[0];

  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-primary/5 px-4 py-2 lg:px-6">
      <Pin className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-primary">
          Pinned ({messages.length})
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {latest.text || latest.fileName || 'Media message'}
          <span className="ml-2 opacity-60">{formatTimestamp(latest.createdAt)}</span>
        </p>
      </div>
    </div>
  );
}
