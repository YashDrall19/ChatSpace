export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'audio' | 'pdf' | 'document' | 'file';

export interface Reaction {
  emoji: string;
  uid: string;
  createdAt: number;
}

export interface Message {
  id: string;
  userId: string;
  type: MessageType;
  text?: string;
  fileName?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileSize?: number;
  duration?: number;
  isPinned: boolean;
  isStarred: boolean;
  replyTo?: string;
  replyToText?: string;
  replyToType?: MessageType;
  reactions: Reaction[];
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  sendOnEnter: boolean;
  showTimestamps: boolean;
  compactView: boolean;
  notifications: boolean;
  chatBackground: string;
}

export interface PaginatedMessages {
  messages: Message[];
  hasMore: boolean;
  cursor?: string;
}

export interface MediaItem {
  id: string;
  type: MessageType;
  fileUrl: string;
  thumbnailUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  duration?: number;
  createdAt: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  accentColor: 'blue',
  sendOnEnter: true,
  showTimestamps: true,
  compactView: false,
  notifications: true,
  chatBackground: 'none',
};
