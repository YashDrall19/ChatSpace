import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getFileItems } from '@/lib/services/files';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const files = await getFileItems(userId);
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const messageId = req.nextUrl.searchParams.get('id');
    if (!messageId) return NextResponse.json({ error: 'Missing message id' }, { status: 400 });

    const { getMessageById, deleteMessage } = await import('@/lib/services/messages');
    const { deleteFile } = await import('@/lib/services/media');
    const msg = await getMessageById(userId, parseInt(messageId, 10));
    if (msg?.fileUrl) await deleteFile(msg.fileUrl);
    await deleteMessage(userId, parseInt(messageId, 10));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
