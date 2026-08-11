'use client';

import { useState, useRef, useCallback } from 'react';
import { Paperclip, Send, Mic, X, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { apiCreateMessage as createMessage, apiUploadFile as uploadFile, apiUploadVoiceNote as uploadVoiceNote } from '@/lib/client/api';
import { toast } from 'sonner';
import { formatDuration } from '@/lib/utils/format';
import type { Message } from '@/types';

interface MessageInputProps {
  userId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export function MessageInput({ userId, replyTo, onCancelReply }: MessageInputProps) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, duration, start, stop, cancel } = useVoiceRecorder();

  const sendText = useCallback(async () => {
    if (!text.trim()) return;
    try {
      await createMessage(userId, {
        type: 'text',
        text: text.trim(),
        replyTo: replyTo?.id,
        replyToText: replyTo?.text || replyTo?.fileName,
        replyToType: replyTo?.type,
      });
      setText('');
      onCancelReply();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch {
      toast.error('Failed to send message');
    }
  }, [text, userId, replyTo, onCancelReply]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadFile(userId, file, (p) => setUploadProgress(p));
      await createMessage(userId, {
        type: result.type,
        text: text.trim() || undefined,
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        mimeType: result.mimeType,
        fileSize: result.fileSize,
        duration: result.duration,
        replyTo: replyTo?.id,
        replyToText: replyTo?.text || replyTo?.fileName,
        replyToType: replyTo?.type,
      });
      setText('');
      onCancelReply();
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVoiceStop = async () => {
    const { blob, duration: dur } = await stop();
    if (blob.size === 0) return;
    setUploading(true);
    try {
      const result = await uploadVoiceNote(userId, blob, dur);
      await createMessage(userId, {
        type: 'voice',
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        mimeType: result.mimeType,
        fileSize: result.fileSize,
        duration: result.duration,
        replyTo: replyTo?.id,
        replyToText: replyTo?.text || replyTo?.fileName,
        replyToType: replyTo?.type,
      });
      onCancelReply();
    } catch {
      toast.error('Failed to upload voice note');
    } finally {
      setUploading(false);
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="shrink-0 border-t bg-card p-3 lg:p-4">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary">↩</span>
            <span className="truncate">
              Replying to: {replyTo.text || replyTo.fileName || 'Media message'}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancelReply}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {uploading && (
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading... {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : ''}</span>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-3 rounded-xl border bg-background p-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={cancel}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={handleVoiceStop} className="bg-primary">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.zip,.txt"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          {text.trim() ? (
            <Button size="icon" className="shrink-0" onClick={sendText} disabled={uploading}>
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={start}
              disabled={uploading}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
