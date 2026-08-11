import type { MessageType } from '@/types';

export function getStoragePath(userId: string, type: MessageType, fileId: string): string {
  switch (type) {
    case 'image':
      return `users/${userId}/images/${fileId}`;
    case 'video':
      return `users/${userId}/videos/${fileId}`;
    case 'voice':
      return `users/${userId}/voice-notes/${fileId}`;
    case 'audio':
      return `users/${userId}/audio/${fileId}`;
    case 'pdf':
      return `users/${userId}/documents/${fileId}`;
    case 'document':
      return `users/${userId}/documents/${fileId}`;
    default:
      return `users/${userId}/files/${fileId}`;
  }
}

export function inferMessageType(mimeType: string): MessageType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) {
    return mimeType.includes('webm') || mimeType.includes('ogg') ? 'voice' : 'audio';
  }
  if (mimeType === 'application/pdf') return 'pdf';
  return 'file';
}


