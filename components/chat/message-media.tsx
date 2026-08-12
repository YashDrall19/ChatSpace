'use client';

import { useRef, useState } from 'react';
import { Play, Pause, Download } from 'lucide-react';
import { formatDuration, formatFileSize } from '@/lib/utils/format';
import type { Message } from '@/types';

interface MessageMediaProps {
  message: Message;
}

export function MessageMedia({ message }: MessageMediaProps) {
  if (message.type === 'image' && message.fileUrl) {
    return (
      <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={message.fileUrl}
          alt={message.fileName || 'Image'}
          className="max-h-80 max-w-full rounded-xl object-cover transition-transform hover:scale-[1.02]"
          loading="lazy"
        />
      </a>
    );
  }

  if (message.type === 'video' && message.fileUrl) {
    return (
      <video
        src={message.fileUrl}
        poster={message.thumbnailUrl}
        controls
        className="max-h-80 max-w-full rounded-xl"
        preload="metadata"
      />
    );
  }

  if ((message.type === 'voice' || message.type === 'audio') && message.fileUrl) {
    return <AudioPlayer message={message} />;
  }

  return null;
}

function AudioPlayer({ message }: MessageMediaProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  return (
    <div className="flex min-w-[200px] items-center gap-3 rounded-xl bg-muted/50 p-3">
      <button
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {message.type === 'voice' ? 'Voice note' : message.fileName || 'Audio'}
        </p>
        <p className="text-xs text-muted-foreground">
          {message.duration ? formatDuration(message.duration) : formatFileSize(message.fileSize || 0)}
        </p>
      </div>
      <audio
        ref={audioRef}
        src={message.fileUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
      {/* <a href={message.fileUrl} download className="text-muted-foreground hover:text-foreground">
        <Download className="h-4 w-4" />
      </a> */}
    </div>
  );
}
