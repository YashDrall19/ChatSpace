'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMessages } from '@/hooks/use-messages';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { PinnedBar } from '@/components/chat/pinned-bar';
import { SearchBar } from '@/components/chat/search-bar';
import { StarredPanel } from '@/components/chat/starred-panel';
import { MessageSquare, Star, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiSearchMessages as searchMessages } from '@/lib/client/api';
import type { Message } from '@/types';

interface ChatViewProps {
  userId: string;
}

export function ChatView({ userId }: ChatViewProps) {
  const { messages, loading, loadingMore, hasMore, loadMore } = useMessages(userId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showStarred, setShowStarred] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pinnedMessages = messages.filter((m) => m.isPinned);

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchMessages(userId, term);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, [userId]);

  const displayMessages = showSearch ? searchResults : messages;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">My Vault</h1>
            <p className="text-xs text-muted-foreground">
              {messages.length} messages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showSearch ? 'default' : 'ghost'}
            size="icon"
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchResults([]);
            }}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant={showStarred ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setShowStarred(!showStarred)}
          >
            <Star className={`h-4 w-4 ${showStarred ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Pinned bar */}
      {pinnedMessages.length > 0 && !showSearch && (
        <PinnedBar messages={pinnedMessages} />
      )}

      {/* Search bar */}
      {showSearch && (
        <SearchBar onSearch={handleSearch} searching={searching} />
      )}

      {/* Starred panel */}
      {showStarred && !showSearch && (
        <StarredPanel userId={userId} messages={messages} onClose={() => setShowStarred(false)} />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{showSearch ? 'No results found' : 'No messages yet'}</p>
              <p className="text-sm text-muted-foreground">
                {showSearch ? 'Try a different search term' : 'Send your first message below'}
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={displayMessages}
            userId={userId}
            onReply={setReplyTo}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        )}
      </div>

      {/* Input */}
      {!showSearch && (
        <MessageInput userId={userId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      )}
    </div>
  );
}
