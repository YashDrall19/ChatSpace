'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import type { MediaItem } from '@/types';
import { FolderOpen, Download, FileText, Loader2 } from 'lucide-react';
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
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Files</h1>
            <p className="text-xs text-muted-foreground">{items.length} files</p>
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
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">No files yet</p>
              <p className="text-sm text-muted-foreground">PDFs, documents, and other attachments will appear here</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-2">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={item.fileUrl}
                  download={item.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.fileName || 'Untitled'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.fileSize || 0)} · {formatTimestamp(item.createdAt)}
                    </p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
