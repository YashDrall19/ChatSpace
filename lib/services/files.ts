import { query } from '@/lib/db';
import { deleteFile } from '@/lib/services/media';
import type { Message, MessageType, MediaItem } from '@/types';

export type { MediaItem } from '@/types';

function mapMediaItem(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    type: row.type as MessageType,
    fileUrl: row.file_url as string,
    thumbnailUrl: (row.thumbnail_url as string) ?? undefined,
    fileName: (row.file_name as string) ?? undefined,
    mimeType: (row.mime_type as string) ?? undefined,
    fileSize: (row.file_size as number) ?? undefined,
    duration: (row.duration as number) ?? undefined,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

export async function getMediaItems(userId: number): Promise<MediaItem[]> {
  const rows = await query<Array<Record<string, unknown>>>(
    "SELECT * FROM messages WHERE user_id = ? AND type IN ('image', 'video', 'voice', 'audio') ORDER BY created_at DESC",
    [userId]
  );
  return rows.map(mapMediaItem);
}

export async function getFileItems(userId: number): Promise<MediaItem[]> {
  const rows = await query<Array<Record<string, unknown>>>(
    "SELECT * FROM messages WHERE user_id = ? AND type IN ('pdf', 'document', 'file') ORDER BY created_at DESC",
    [userId]
  );
  return rows.map(mapMediaItem);
}

export async function deleteMessageWithFile(
  userId: number,
  message: Message
): Promise<void> {
  if (message.fileUrl) {
    await deleteFile(message.fileUrl);
  }
  const messageId = parseInt(message.id, 10);
  const { execute } = await import('@/lib/db');
  await execute('DELETE FROM messages WHERE id = ? AND user_id = ?', [messageId, userId]);
}
