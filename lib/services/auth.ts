import { query, insert } from '@/lib/db';
import { hashPassword, comparePassword, signToken } from '@/lib/auth';
import { ensureUserSettings } from '@/lib/services/users';

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<{ token: string; user: AuthUser }> {
  const existing = await query<Array<{ id: number }>>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (existing.length > 0) {
    throw new Error('An account with this email already exists');
  }

  const hash = await hashPassword(password);
  const userId = await insert(
    'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
    [email, hash, displayName ?? null]
  );

  await ensureUserSettings(userId);

  const token = signToken({ userId, email });
  const user = await getAuthUser(userId);
  return { token, user: user! };
}

export async function signInWithEmail(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const rows = await query<Array<{ id: number; email: string; password_hash: string }>>(
    'SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const row = rows[0];
  const valid = await comparePassword(password, row.password_hash as string);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const token = signToken({ userId: row.id, email: row.email as string });
  const user = await getAuthUser(row.id);
  return { token, user: user! };
}

export async function getAuthUser(userId: number): Promise<AuthUser | null> {
  const rows = await query<Array<{ id: number; email: string; display_name: string | null; photo_url: string | null }>>(
    'SELECT id, email, display_name, photo_url FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    email: row.email as string,
    displayName: row.display_name as string | null,
    photoURL: row.photo_url as string | null,
  };
}

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}
