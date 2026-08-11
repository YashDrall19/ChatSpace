'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import type { MediaItem } from '@/types';
import { Images, Download, Loader as Loader2 } from 'lucide-react';
import { formatTimestamp, formatFileSize } from '@/lib/utils/format';

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
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-xl lg:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-primary/20">
            <Images className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Media Gallery</h1>
            <p className="text-xs text-muted-foreground">{items.length} items</p>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-sm text-muted-foreground">Loading media...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/10 to-cyan-500/10 animate-bounce-in">
                <Images className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">No media yet</p>
                <p className="text-sm text-muted-foreground mt-1">Images, videos, and voice notes will appear here</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:ring-primary/30 animate-slide-up"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  {item.type === 'image' && (
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={item.fileUrl}
                        alt={item.fileName || 'Image'}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
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
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/10 to-cyan-500/10">
                        <span className="text-2xl">🎙️</span>
                      </div>
                      <p className="text-xs font-medium">
                        {item.duration ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}` : formatFileSize(item.fileSize || 0)}
                      </p>
                      <audio src={item.fileUrl} controls className="w-full" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
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
