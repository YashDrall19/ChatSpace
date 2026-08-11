import { query, execute, insert } from '@/lib/db';
import type { Message, MessageType, Reaction } from '@/types';

const PAGE_SIZE = 20;

function mapMessage(row: Record<string, unknown>): Message {
  let reactions: Reaction[] = [];
  if (row.reactions) {
    try {
      reactions = typeof row.reactions === 'string' ? JSON.parse(row.reactions as string) : row.reactions as Reaction[];
    } catch {
      reactions = [];
    }
  }
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as MessageType,
    text: (row.text as string) ?? undefined,
    fileName: (row.file_name as string) ?? undefined,
    fileUrl: (row.file_url as string) ?? undefined,
    thumbnailUrl: (row.thumbnail_url as string) ?? undefined,
    mimeType: (row.mime_type as string) ?? undefined,
    fileSize: (row.file_size as number) ?? undefined,
    duration: (row.duration as number) ?? undefined,
    isPinned: Boolean(row.is_pinned),
    isStarred: Boolean(row.is_starred),
    replyTo: row.reply_to != null ? String(row.reply_to) : undefined,
    replyToText: (row.reply_to_text as string) ?? undefined,
    replyToType: (row.reply_to_type as string) as MessageType ?? undefined,
    reactions,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

export async function createMessage(
  userId: number,
  data: Partial<Message> & { type: MessageType }
): Promise<string> {
  const id = await insert(
    `INSERT INTO messages (user_id, type, text, file_name, file_url, thumbnail_url, mime_type, file_size, duration, reply_to, reply_to_text, reply_to_type, reactions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.type,
      data.text ?? null,
      data.fileName ?? null,
      data.fileUrl ?? null,
      data.thumbnailUrl ?? null,
      data.mimeType ?? null,
      data.fileSize ?? null,
      data.duration ?? null,
      data.replyTo ?? null,
      data.replyToText ?? null,
      data.replyToType ?? null,
      JSON.stringify([]),
    ]
  );
  return String(id);
}

export async function updateMessage(
  userId: number,
  messageId: number,
  updates: Partial<Message>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (updates.text !== undefined) { fields.push('text = ?'); values.push(updates.text); }
  if (updates.fileName !== undefined) { fields.push('file_name = ?'); values.push(updates.fileName); }
  if (updates.fileUrl !== undefined) { fields.push('file_url = ?'); values.push(updates.fileUrl); }
  if (updates.thumbnailUrl !== undefined) { fields.push('thumbnail_url = ?'); values.push(updates.thumbnailUrl); }
  if (updates.mimeType !== undefined) { fields.push('mime_type = ?'); values.push(updates.mimeType); }
  if (updates.fileSize !== undefined) { fields.push('file_size = ?'); values.push(updates.fileSize); }
  if (updates.duration !== undefined) { fields.push('duration = ?'); values.push(updates.duration); }
  if (updates.isPinned !== undefined) { fields.push('is_pinned = ?'); values.push(updates.isPinned); }
  if (updates.isStarred !== undefined) { fields.push('is_starred = ?'); values.push(updates.isStarred); }
  if (updates.reactions !== undefined) { fields.push('reactions = ?'); values.push(JSON.stringify(updates.reactions)); }
  if (fields.length === 0) return;
  values.push(userId, messageId);
  await execute(`UPDATE messages SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
}

export async function deleteMessage(userId: number, messageId: number): Promise<void> {
  await execute('DELETE FROM messages WHERE id = ? AND user_id = ?', [messageId, userId]);
}

export async function getMessages(userId: number, limit = PAGE_SIZE): Promise<Message[]> {
  const rows = await query<Array<Record<string, unknown>>>(
    'SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  );
  return rows.map(mapMessage);
}

export async function loadOlderMessages(
  userId: number,
  cursorId: number,
  limit = PAGE_SIZE
): Promise<{ messages: Message[]; hasMore: boolean; nextCursor?: number }> {
  const rows = await query<Array<Record<string, unknown>>>(
    'SELECT * FROM messages WHERE user_id = ? AND id < ? ORDER BY created_at DESC LIMIT ?',
    [userId, cursorId, limit + 1]
  );
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const messages = page.map(mapMessage);
  const nextCursor = page.length > 0 ? Number(page[page.length - 1].id) : undefined;
  return { messages, hasMore, nextCursor };
}

export async function searchMessages(userId: number, searchTerm: string): Promise<Message[]> {
  const term = `%${searchTerm}%`;
  const rows = await query<Array<Record<string, unknown>>>(
    'SELECT * FROM messages WHERE user_id = ? AND (text LIKE ? OR file_name LIKE ?) ORDER BY created_at DESC LIMIT 200',
    [userId, term, term]
  );
  return rows.map(mapMessage);
}

export async function toggleStar(userId: number, messageId: number, current: boolean): Promise<void> {
  await updateMessage(userId, messageId, { isStarred: !current });
}

export async function togglePin(userId: number, messageId: number, current: boolean): Promise<void> {
  await updateMessage(userId, messageId, { isPinned: !current });
}

export async function toggleReaction(
  userId: number,
  messageId: number,
  reactions: Reaction[],
  emoji: string
): Promise<void> {
  const existing = reactions.find((r) => r.emoji === emoji && r.uid === String(userId));
  let updated: Reaction[];
  if (existing) {
    updated = reactions.filter((r) => !(r.emoji === emoji && r.uid === String(userId)));
  } else {
    updated = [...reactions, { emoji, uid: String(userId), createdAt: Date.now() }];
  }
  await updateMessage(userId, messageId, { reactions: updated });
}

export async function getMessageById(userId: number, messageId: number): Promise<Message | null> {
  const rows = await query<Array<Record<string, unknown>>>(
    'SELECT * FROM messages WHERE id = ? AND user_id = ? LIMIT 1',
    [messageId, userId]
  );
  if (rows.length === 0) return null;
  return mapMessage(rows[0]);
}
