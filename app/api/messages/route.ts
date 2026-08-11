import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getMessages, createMessage, loadOlderMessages } from '@/lib/services/messages';
import type { MessageType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cursor = req.nextUrl.searchParams.get('cursor');
    if (cursor) {
      const result = await loadOlderMessages(userId, parseInt(cursor, 10));
      return NextResponse.json(result);
    }
    const messages = await getMessages(userId);
    return NextResponse.json({ messages, hasMore: messages.length >= 20 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const id = await createMessage(userId, { ...body, type: body.type as MessageType });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing message id' }, { status: 400 });

    const { updateMessage } = await import('@/lib/services/messages');
    await updateMessage(userId, parseInt(id, 10), updates);
    return NextResponse.json({ success: true });
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
    const msg = await getMessageById(userId, parseInt(messageId, 10));
    if (msg?.fileUrl) {
      const { deleteFile } = await import('@/lib/services/media');
      await deleteFile(msg.fileUrl);
    }
    await deleteMessage(userId, parseInt(messageId, 10));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
