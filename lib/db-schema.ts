import { getPool } from './db';

export async function initDatabase(): Promise<void> {
  const pool = getPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) DEFAULT NULL,
      photo_url TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INT PRIMARY KEY,
      theme VARCHAR(20) DEFAULT 'system',
      accent_color VARCHAR(20) DEFAULT 'blue',
      send_on_enter BOOLEAN DEFAULT TRUE,
      show_timestamps BOOLEAN DEFAULT TRUE,
      compact_view BOOLEAN DEFAULT FALSE,
      notifications BOOLEAN DEFAULT TRUE,
      chat_background VARCHAR(500) DEFAULT 'none',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'text',
      text TEXT DEFAULT NULL,
      file_name VARCHAR(500) DEFAULT NULL,
      file_url TEXT DEFAULT NULL,
      thumbnail_url TEXT DEFAULT NULL,
      mime_type VARCHAR(255) DEFAULT NULL,
      file_size BIGINT DEFAULT NULL,
      duration INT DEFAULT NULL,
      is_pinned BOOLEAN DEFAULT FALSE,
      is_starred BOOLEAN DEFAULT FALSE,
      reply_to INT DEFAULT NULL,
      reply_to_text TEXT DEFAULT NULL,
      reply_to_type VARCHAR(20) DEFAULT NULL,
      reactions JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_created (user_id, created_at DESC),
      INDEX idx_user_type (user_id, type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
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
  `);

  await pool.execute(`
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
  `);
}
