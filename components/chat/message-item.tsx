'use client';

import { useState, useRef, useEffect } from 'react';
import { Star, Pin, PinOff, Reply, Trash2, MoveVertical as MoreVertical, Download, FileText, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
 DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatTimestamp, formatFileSize, formatDuration } from '@/lib/utils/format';
import {
  apiToggleStar as toggleStar,
  apiTogglePin as togglePin,
  apiToggleReaction as toggleReaction,
} from '@/lib/client/api';
import { apiDeleteMessageWithFile as deleteMessageWithFile } from '@/lib/client/api';
import { MessageMedia } from '@/components/chat/message-media';
import { ReactionPicker } from '@/components/chat/reaction-picker';
import type { Message } from '@/types';
import { toast } from 'sonner';

interface MessageItemProps {
  message: Message;
  userId: string;
  onReply: (message: Message) => void;
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void;
  onRefreshMessages?: () => void;
  showDateSeparator: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export function MessageItem({
  message,
  userId,
  onReply,
  onUpdateMessage = () => {},
  onRefreshMessages = () => {},
  showDateSeparator,
}: MessageItemProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReply = Boolean(message.replyTo);

  useEffect(() => {
    return () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, []);

  async function handleStar() {
    const nextValue = !message.isStarred;
    onUpdateMessage?.(message.id, { isStarred: nextValue });

    try {
      await toggleStar(userId, message.id, nextValue);
      onRefreshMessages?.();
    } catch (error) {
      onUpdateMessage?.(message.id, { isStarred: message.isStarred });
      toast.error((error as Error)?.message || 'Failed to update star');
    }
  }

  async function handlePin() {
    const nextValue = !message.isPinned;
    onUpdateMessage?.(message.id, { isPinned: nextValue });

    try {
      await togglePin(userId, message.id, nextValue);
      onRefreshMessages?.();
    } catch (error) {
      onUpdateMessage?.(message.id, { isPinned: message.isPinned });
      toast.error((error as Error)?.message || 'Failed to update pin');
    }
  }

  async function handleDelete() {
    try {
      await deleteMessageWithFile(userId, message);
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  }

  async function handleReaction(emoji: string) {
    try {
      const updated = message.reactions.find((r) => r.emoji === emoji && r.uid === userId)
        ? message.reactions.filter((r) => !(r.emoji === emoji && r.uid === userId))
        : [...message.reactions, { emoji, uid: userId, createdAt: Date.now() }];

      await toggleReaction(userId, message.id, message.reactions, emoji);
      onUpdateMessage?.(message.id, { reactions: updated });
      onRefreshMessages?.();
      setShowReactions(false);
    } catch {
      toast.error('Failed to add reaction');
    }
  }

  const reactionCounts = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="group animate-fade-in">
      {showDateSeparator && (
        <div className="my-3 flex items-center justify-center">
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}

      <div className={`flex items-start gap-2 py-1.5 -mx-2 rounded-lg px-2 transition-all duration-200 hover:bg-muted/40 ${isReply ? 'justify-start' : 'justify-end'}`}>
        <div className={`flex-1 flex flex-col ${isReply ? 'items-start' : 'items-end'}`}>
          {/* Reply context */}
          {message.replyTo && message.replyToText && (
            <div className="mb-1 ml-2 border-l-2 border-primary/40 pl-2 text-xs text-muted-foreground">
              <p className="truncate">↩ {message.replyToText}</p>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`relative inline-block max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md ${
              isReply
                ? 'bg-card ring-1 ring-border/50'
                : 'bg-gradient-to-br from-sky-500 to-cyan-600 text-white'
            }`}
            onMouseLeave={() => {
              reactionTimer.current = setTimeout(() => setShowReactions(false), 200);
            }}
          >
            {/* Text content */}
            {message.text && (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.text}
              </p>
            )}

            {/* Media content */}
            {message.fileUrl && (
              <div className={message.text ? 'mt-2' : ''}>
                <MessageMedia message={message} />
              </div>
            )}

            {/* File info for non-media files */}
            {(message.type === 'file' || message.type === 'pdf' || message.type === 'document') && message.fileUrl && (
              <a
                href={message.fileUrl}
                // download={message.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg bg-muted/50 p-2 hover:bg-muted transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{message.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(message.fileSize || 0)}
                  </p>
                </div>
                {/* <Download className="h-4 w-4 text-muted-foreground" /> */}
              </a>
            )}

            {/* Timestamp */}
            <span className={`mt-1 block text-[10px] ${isReply ? 'text-muted-foreground/70' : 'text-white/60'}`}>
              {formatTimestamp(message.createdAt)}
            </span>

            {/* Reaction picker */}
            {showReactions && (
              <div
                className="absolute -top-10 left-2 z-10 flex gap-1 rounded-full bg-popover p-1.5 shadow-lg ring-1 ring-border animate-scale-in"
                onMouseEnter={() => {
                  if (reactionTimer.current) clearTimeout(reactionTimer.current);
                }}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reactions */}
          {reactionCounts && Object.keys(reactionCounts).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-muted/70 transition-colors"
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Badges */}
          <div className="mt-1 flex items-center gap-1.5">
            {message.isPinned && (
              <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </Badge>
            )}
            {message.isStarred && (
              <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                <Star className="h-2.5 w-2.5 fill-current" /> Starred
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-start opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowReactions(true)}
          >
            <span className="text-base">😊</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onReply(message)}
          >
            <Reply className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStar}>
                <Star className={`mr-2 h-4 w-4 ${message.isStarred ? 'fill-current' : ''}`} />
                {message.isStarred ? 'Unstar' : 'Star'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePin}>
                {message.isPinned ? (
                  <PinOff className="mr-2 h-4 w-4" />
                ) : (
                  <Pin className="mr-2 h-4 w-4" />
                )}
                {message.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={async () => {
                setIsDeleting(true);
                try {
                  await handleDelete();
                  setConfirmDeleteOpen(false);
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
