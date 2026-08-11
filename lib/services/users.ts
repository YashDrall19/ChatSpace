import { query, execute, insert } from '@/lib/db';
import type { UserProfile, UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

export async function ensureUserSettings(userId: number): Promise<void> {
  await insert(
    'INSERT IGNORE INTO user_settings (user_id) VALUES (?)',
    [userId]
  );
}

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const rows = await query<Array<{ id: number; email: string; display_name: string | null; photo_url: string | null; created_at: string }>>(
    'SELECT id, email, display_name, photo_url, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    uid: String(row.id),
    email: row.email as string,
    displayName: row.display_name as string | null,
    photoURL: row.photo_url as string | null,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

export async function updateUserProfile(userId: number, updates: Partial<UserProfile>): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (updates.displayName !== undefined) { fields.push('display_name = ?'); values.push(updates.displayName); }
  if (updates.photoURL !== undefined) { fields.push('photo_url = ?'); values.push(updates.photoURL); }
  if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
  if (fields.length === 0) return;
  values.push(userId);
  await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function getUserSettings(userId: number): Promise<UserSettings> {
  await ensureUserSettings(userId);
  const rows = await query<Array<Record<string, unknown>>>(
    'SELECT theme, accent_color, send_on_enter, show_timestamps, compact_view, notifications, chat_background FROM user_settings WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (rows.length === 0) return { ...DEFAULT_SETTINGS };
  const row = rows[0];
  return {
    theme: (row.theme as string) as 'light' | 'dark' | 'system',
    accentColor: row.accent_color as string,
    sendOnEnter: Boolean(row.send_on_enter),
    showTimestamps: Boolean(row.show_timestamps),
    compactView: Boolean(row.compact_view),
    notifications: Boolean(row.notifications),
    chatBackground: (row.chat_background as string) || 'none',
  };
}

export async function updateUserSettings(userId: number, settings: Partial<UserSettings>): Promise<void> {
  await ensureUserSettings(userId);
  const fields: string[] = [];
  const values: unknown[] = [];
  if (settings.theme !== undefined) { fields.push('theme = ?'); values.push(settings.theme); }
  if (settings.accentColor !== undefined) { fields.push('accent_color = ?'); values.push(settings.accentColor); }
  if (settings.sendOnEnter !== undefined) { fields.push('send_on_enter = ?'); values.push(settings.sendOnEnter); }
  if (settings.showTimestamps !== undefined) { fields.push('show_timestamps = ?'); values.push(settings.showTimestamps); }
  if (settings.compactView !== undefined) { fields.push('compact_view = ?'); values.push(settings.compactView); }
  if (settings.notifications !== undefined) { fields.push('notifications = ?'); values.push(settings.notifications); }
  if (settings.chatBackground !== undefined) { fields.push('chat_background = ?'); values.push(settings.chatBackground); }
  if (fields.length === 0) return;
  values.push(userId);
  await execute(`UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`, values);
}
