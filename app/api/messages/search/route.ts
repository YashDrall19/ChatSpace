import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { searchMessages } from '@/lib/services/messages';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const term = req.nextUrl.searchParams.get('q') || '';
    if (!term.trim()) return NextResponse.json({ results: [] });

    const results = await searchMessages(userId, term);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
