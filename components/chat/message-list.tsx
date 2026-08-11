'use client';

import { useEffect, useRef } from 'react';
import { MessageItem } from '@/components/chat/message-item';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronUp } from 'lucide-react';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  userId: string;
  onReply: (message: Message) => void;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function MessageList({
  messages,
  userId,
  onReply,
  loadingMore,
  hasMore,
  onLoadMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on first load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  return (
    <div ref={containerRef} className="w-full px-2 py-3 lg:px-4">
      {hasMore && (
        <div className="mb-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ChevronUp className="h-4 w-4" />
                Load older messages
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {messages
          .slice()
          .reverse()
          .map((message, idx) => (
            <MessageItem
              key={message.id}
              message={message}
              userId={userId}
              onReply={onReply}
              showDateSeparator={idx === 0 || isDifferentDay(messages[messages.length - 1 - (idx - 1)]?.createdAt, message.createdAt)}
            />
          ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

function isDifferentDay(prevTs: number | undefined, currTs: number): boolean {
  if (!prevTs) return false;
  return new Date(prevTs).toDateString() !== new Date(currTs).toDateString();
}
