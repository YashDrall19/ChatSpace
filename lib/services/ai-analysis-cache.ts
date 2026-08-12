import { execute, query } from '@/lib/db';

export interface CachedAiMessageAnalysis {
  sourceContent: string;
  reminders: Array<{ task: string; due: string | null; source: string; evidence: string }>;
}

declare global {
  // eslint-disable-next-line no-var
  var __aiAnalysisTableReady: Promise<void> | undefined;
}

async function ensureTable(): Promise<void> {
  if (!globalThis.__aiAnalysisTableReady) {
    globalThis.__aiAnalysisTableReady = execute(`
      CREATE TABLE IF NOT EXISTS ai_message_analysis (
        user_id INT NOT NULL,
        message_id INT NOT NULL,
        message_updated_at BIGINT NOT NULL,
        pipeline_version VARCHAR(100) NOT NULL,
        source_content MEDIUMTEXT NOT NULL,
        reminders JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, message_id),
        INDEX idx_analysis_version (user_id, pipeline_version),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(() => undefined);
  }
  await globalThis.__aiAnalysisTableReady;
}

export async function getCachedAiMessageAnalysis(
  userId: number,
  messageId: number,
  messageUpdatedAt: number,
  pipelineVersion: string,
): Promise<CachedAiMessageAnalysis | null> {
  await ensureTable();
  const rows = await query<Array<{ source_content: string; reminders: unknown }>>(
    `SELECT source_content, reminders
     FROM ai_message_analysis
     WHERE user_id = ? AND message_id = ? AND message_updated_at = ? AND pipeline_version = ?
     LIMIT 1`,
    [userId, messageId, messageUpdatedAt, pipelineVersion],
  );
  if (!rows.length) return null;
  try {
    const reminders = typeof rows[0].reminders === 'string' ? JSON.parse(rows[0].reminders) : rows[0].reminders;
    if (!Array.isArray(reminders)) return null;
    return { sourceContent: rows[0].source_content, reminders: reminders as CachedAiMessageAnalysis['reminders'] };
  } catch {
    return null;
  }
}

export async function saveCachedAiMessageAnalysis(
  userId: number,
  messageId: number,
  messageUpdatedAt: number,
  pipelineVersion: string,
  analysis: CachedAiMessageAnalysis,
): Promise<void> {
  await ensureTable();
  await execute(
    `INSERT INTO ai_message_analysis (user_id, message_id, message_updated_at, pipeline_version, source_content, reminders)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       message_updated_at = VALUES(message_updated_at),
       pipeline_version = VALUES(pipeline_version),
       source_content = VALUES(source_content),
       reminders = VALUES(reminders)`,
    [userId, messageId, messageUpdatedAt, pipelineVersion, analysis.sourceContent, JSON.stringify(analysis.reminders)],
  );
}
