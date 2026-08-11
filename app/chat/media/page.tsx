'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import type { MediaItem } from '@/types';
import { Images, Download, Loader2 } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils/format';
import { formatFileSize } from '@/lib/utils/format';

export default function MediaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/media', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        setItems(data.media);
        setLoading(false);
      });
  }, [user]);

  if (!user) return null;

  return (
    <>
      <ChatSidebar />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Images className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Media Gallery</h1>
            <p className="text-xs text-muted-foreground">{items.length} items</p>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Images className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">No media yet</p>
              <p className="text-sm text-muted-foreground">Images, videos, and voice notes will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border/50"
                >
                  {item.type === 'image' && (
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={item.fileUrl}
                        alt={item.fileName || 'Image'}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </a>
                  )}
                  {item.type === 'video' && (
                    <video
                      src={item.fileUrl}
                      poster={item.thumbnailUrl}
                      controls
                      className="h-full w-full object-cover"
                      preload="metadata"
                    />
                  )}
                  {(item.type === 'voice' || item.type === 'audio') && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-2xl">🎙️</span>
                      </div>
                      <p className="text-xs font-medium">
                        {item.duration ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}` : formatFileSize(item.fileSize || 0)}
                      </p>
                      <audio src={item.fileUrl} controls className="w-full" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-[10px] text-white">
                      {formatTimestamp(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
