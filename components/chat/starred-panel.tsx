'use client';

import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from '@/components/chat/message-item';
import type { Message } from '@/types';

interface StarredPanelProps {
  userId: string;
  messages: Message[];
  onClose: () => void;
}

export function StarredPanel({ userId, messages, onClose }: StarredPanelProps) {
  const starred = messages.filter((m) => m.isStarred);

  return (
    <div className="flex shrink-0 flex-col border-b bg-card" style={{ maxHeight: '40%' }}>
      <div className="flex items-center justify-between px-4 py-2 lg:px-6">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-current text-yellow-500" />
          <span className="text-sm font-medium">Starred Messages ({starred.length})</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="max-h-[300px]">
        <div className="px-4 pb-2 lg:px-6">
          {starred.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No starred messages yet
            </p>
          ) : (
            starred.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                userId={userId}
                onReply={() => {}}
                showDateSeparator={false}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
