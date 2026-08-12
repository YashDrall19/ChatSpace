import type { AiReview } from '@/lib/services/ai-agent';
import { createAiReview } from '@/lib/services/ai-agent';
import { execute, query } from '@/lib/db';
import { getMessagesForAiReview } from '@/lib/services/messages';

export type AiReviewStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface StoredAiReview {
  exists: boolean;
  status: AiReviewStatus;
  review: AiReview | null;
  error: string | null;
  updatedAt: number | null;
}

declare global {
  // In-process worker coordination for a persistent Node deployment.
  // eslint-disable-next-line no-var
  var __chatReviewWorkers: Set<number> | undefined;
  // eslint-disable-next-line no-var
  var __chatReviewTableReady: Promise<void> | undefined;
}

function workerUsers(): Set<number> {
  if (!globalThis.__chatReviewWorkers) globalThis.__chatReviewWorkers = new Set();
  return globalThis.__chatReviewWorkers;
}

async function ensureTable(): Promise<void> {
  if (!globalThis.__chatReviewTableReady) {
    globalThis.__chatReviewTableReady = execute(`
      CREATE TABLE IF NOT EXISTS ai_chat_reviews (
        user_id INT PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        revision INT NOT NULL DEFAULT 0,
        processed_revision INT NOT NULL DEFAULT 0,
        review JSON DEFAULT NULL,
        last_error TEXT DEFAULT NULL,
        started_at TIMESTAMP NULL DEFAULT NULL,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(() => undefined);
  }
  await globalThis.__chatReviewTableReady;
}

function parseReview(value: unknown): AiReview | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return null;
    const review = parsed as AiReview;
    return typeof review.summary === 'string' && Array.isArray(review.highlights) && Array.isArray(review.reminders) ? review : null;
  } catch { return null; }
}

export async function getStoredAiReview(userId: number): Promise<StoredAiReview> {
  await ensureTable();
  const rows = await query<Array<{ status: AiReviewStatus; review: unknown; last_error: string | null; updated_at: string | null }>>(
    'SELECT status, review, last_error, updated_at FROM ai_chat_reviews WHERE user_id = ? LIMIT 1', [userId],
  );
  if (!rows.length) return { exists: false, status: 'pending', review: null, error: null, updatedAt: null };
  const row = rows[0];
  return { exists: true, status: row.status, review: parseReview(row.review), error: row.last_error, updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null };
}

export async function queueAiReview(userId: number): Promise<void> {
  await ensureTable();
  await execute(
    `INSERT INTO ai_chat_reviews (user_id, status, revision, processed_revision)
     VALUES (?, 'pending', 1, 0)
     ON DUPLICATE KEY UPDATE
       revision = revision + 1,
       status = IF(status = 'processing', 'processing', 'pending'),
       last_error = NULL`,
    [userId],
  );
  startWorker(userId);
}

function startWorker(userId: number): void {
  const workers = workerUsers();
  if (workers.has(userId)) return;
  workers.add(userId);
  void processQueue(userId).finally(() => workers.delete(userId));
}

async function processQueue(userId: number): Promise<void> {
  while (true) {
    const stateRows = await query<Array<{ revision: number; processed_revision: number }>>(
      'SELECT revision, processed_revision FROM ai_chat_reviews WHERE user_id = ? LIMIT 1', [userId],
    );
    const state = stateRows[0];
    if (!state || state.processed_revision >= state.revision) {
      await execute("UPDATE ai_chat_reviews SET status = 'ready', completed_at = CURRENT_TIMESTAMP WHERE user_id = ?", [userId]);
      return;
    }
    const revision = state.revision;
    await execute("UPDATE ai_chat_reviews SET status = 'processing', started_at = CURRENT_TIMESTAMP, last_error = NULL WHERE user_id = ?", [userId]);
    try {
      const review = await createAiReview(userId, await getMessagesForAiReview(userId));
      await execute(
        "UPDATE ai_chat_reviews SET review = ?, processed_revision = ?, completed_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [JSON.stringify(review), revision, userId],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI review failed.';
      await execute("UPDATE ai_chat_reviews SET status = 'failed', last_error = ? WHERE user_id = ?", [message.slice(0, 2000), userId]);
      return;
    }
  }
}
