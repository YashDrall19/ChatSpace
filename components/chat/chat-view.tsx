'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMessages } from '@/hooks/use-messages';
import { useSettings } from '@/hooks/use-settings';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { PinnedBar } from '@/components/chat/pinned-bar';
import { SearchBar } from '@/components/chat/search-bar';
import { StarredPanel } from '@/components/chat/starred-panel';
import { AiReviewDialog } from '@/components/chat/ai-review-dialog';
import { MessageSquare, Star, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiSearchMessages as searchMessages } from '@/lib/client/api';
import type { Message } from '@/types';

interface ChatViewProps {
  userId: string;
}

const BG_PATTERNS: Record<string, string> = {
  none: '',
  teal: 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900 dark:to-cyan-900',
  beige: 'bg-gradient-to-br from-stone-50 to-amber-50 dark:from-stone-900 dark:to-amber-950',
  sky: 'bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900 dark:to-cyan-950',
  cyan: 'bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900 dark:to-teal-950',
  mint: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900 dark:to-teal-950',
  lemon: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900 dark:to-yellow-950',
  peach: 'bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900 dark:to-rose-950',
  rose: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900 dark:to-pink-950',
  lavender: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900 dark:to-purple-950',
  cloud: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700',
};

export function ChatView({ userId }: ChatViewProps) {
  const { messages, loading, loadingMore, hasMore, loadMore, refreshMessages, updateMessage } = useMessages(userId);
  const { settings } = useSettings();
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

  const bgClass = BG_PATTERNS[settings.chatBackground] || '';
  const isImageBg = settings.chatBackground?.startsWith('/') || settings.chatBackground?.startsWith('http') || settings.chatBackground?.startsWith('/uploads');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-primary/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">My Vault</h1>
            <p className="text-xs text-muted-foreground">
              {messages.length} messages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiReviewDialog />
          <Button
            variant={showSearch ? 'default' : 'ghost'}
            size="icon"
            onClick={() => {
              setShowSearch(!showSearch);
              setShowStarred(false);
              if (showSearch) setSearchResults([]);
            }}
            className="rounded-xl transition-transform hover:scale-105"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant={showStarred ? 'default' : 'ghost'}
            size="icon"
            onClick={() => {setShowStarred(!showStarred); setShowSearch(false);}}
            className="rounded-xl transition-transform hover:scale-105"
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
        <StarredPanel
          userId={userId}
          messages={messages}
          onClose={() => setShowStarred(false)}
          onMessageUpdate={updateMessage}
          onRefreshMessages={refreshMessages}
        />
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className={`relative flex-1 overflow-y-auto scrollbar-thin ${bgClass}`}
        style={isImageBg ? { backgroundImage: `url(${settings.chatBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/10 to-cyan-500/10 animate-bounce-in">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">{showSearch ? 'No results found' : 'No messages yet'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {showSearch ? 'Try a different search term' : 'Send your first message below'}
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={displayMessages}
            userId={userId}
            onReply={setReplyTo}
            onMessageUpdate={updateMessage}
            onRefreshMessages={refreshMessages}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        )}
      </div>

      {/* Input */}
      {!showSearch && (
        <MessageInput userId={userId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSent={refreshMessages} />
      )}
    </div>
  );
}
