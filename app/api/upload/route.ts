import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserIdFromRequest } from '@/lib/auth';
import { inferMessageType } from '@/lib/utils/storage-paths';
import type { MessageType } from '@/types';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const type = inferMessageType(file.type);
    const folder = type === 'voice' ? 'voice-notes' : type === 'image' ? 'images' : type === 'video' ? 'videos' : type === 'audio' ? 'audio' : 'files';
    const dir = path.join(UPLOAD_DIR, String(userId), folder);
    await fs.mkdir(dir, { recursive: true });

    const ext = file.name.split('.').pop() || 'bin';
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const filename = `${fileId}.${ext}`;
    const filepath = path.join(dir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    const fileUrl = `/uploads/${userId}/${folder}/${filename}`;

    const durationStr = formData.get('duration');
    const duration = durationStr ? parseInt(durationStr as string, 10) : undefined;

    return NextResponse.json({
      fileUrl,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      type,
      duration,
    });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
