import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getMediaItems } from '@/lib/services/files';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const media = await getMediaItems(userId);
    return NextResponse.json({ media });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
