import type { Message, MessageType, Reaction } from '@/types';

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: 'same-origin', ...options });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

export async function apiCreateMessage(
  userId: string,
  data: Partial<Message> & { type: MessageType }
): Promise<string> {
  const result = await apiFetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.id;
}

export async function apiUpdateMessage(
  userId: string,
  messageId: string,
  updates: Partial<Message>
): Promise<void> {
  await apiFetch('/api/messages', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: messageId, ...updates }),
  });
}

export async function apiDeleteMessage(userId: string, messageId: string): Promise<void> {
  await apiFetch(`/api/messages?id=${messageId}`, { method: 'DELETE' });
}

export async function apiSearchMessages(userId: string, term: string): Promise<Message[]> {
  const result = await apiFetch(`/api/messages/search?q=${encodeURIComponent(term)}`);
  return result.results;
}

export async function apiToggleStar(userId: string, messageId: string, current: boolean): Promise<void> {
  await apiUpdateMessage(userId, messageId, { isStarred: !current });
}

export async function apiTogglePin(userId: string, messageId: string, current: boolean): Promise<void> {
  await apiUpdateMessage(userId, messageId, { isPinned: !current });
}

export async function apiToggleReaction(
  userId: string,
  messageId: string,
  reactions: Reaction[],
  emoji: string
): Promise<void> {
  const existing = reactions.find((r) => r.emoji === emoji && r.uid === userId);
  let updated: Reaction[];
  if (existing) {
    updated = reactions.filter((r) => !(r.emoji === emoji && r.uid === userId));
  } else {
    updated = [...reactions, { emoji, uid: userId, createdAt: Date.now() }];
  }
  await apiUpdateMessage(userId, messageId, { reactions: updated });
}

export async function apiUploadFile(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  type: MessageType;
  duration?: number;
  thumbnailUrl?: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error('Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(formData);
  });
}

export async function apiUploadVoiceNote(
  userId: string,
  blob: Blob,
  duration: number
): Promise<{
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  type: MessageType;
  duration: number;
}> {
  const formData = new FormData();
  formData.append('file', blob, `voice-${Date.now()}.webm`);
  formData.append('type', 'voice');
  formData.append('duration', String(duration));
  const result = await apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  return result;
}

export async function apiDeleteMessageWithFile(userId: string, message: Message): Promise<void> {
  await apiDeleteMessage(userId, message.id);
}
