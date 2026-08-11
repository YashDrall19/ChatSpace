import { promises as fs } from 'fs';
import path from 'path';

export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl.startsWith('/uploads/')) return;
    const filepath = path.join(process.cwd(), 'public', fileUrl);
    await fs.unlink(filepath);
  } catch {
    // File may already be deleted
  }
}
