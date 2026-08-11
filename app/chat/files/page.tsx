'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import type { MediaItem } from '@/types';
import { FolderOpen, Download, FileText, Loader as Loader2 } from 'lucide-react';
import { formatTimestamp, formatFileSize } from '@/lib/utils/format';

export default function FilesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/files', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        setItems(data.files);
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
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Files</h1>
            <p className="text-xs text-muted-foreground">{items.length} files</p>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-sm text-muted-foreground">Loading files...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/10 to-cyan-500/10 animate-bounce-in">
                <FolderOpen className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">No files yet</p>
                <p className="text-sm text-muted-foreground mt-1">PDFs, documents, and other attachments will appear here</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-2">
              {items.map((item, idx) => (
                <a
                  key={item.id}
                  href={item.fileUrl}
                  download={item.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/80 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:translate-x-0.5 animate-slide-up"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.fileName || 'Untitled'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.fileSize || 0)} · {formatTimestamp(item.createdAt)}
                    </p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground transition-all group-hover:text-primary group-hover:scale-110" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
