import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getStoredAiReview, queueAiReview } from '@/lib/services/ai-review-store';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await getStoredAiReview(userId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load AI review' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await queueAiReview(userId);
    return NextResponse.json({ status: 'pending' }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to queue AI review' }, { status: 503 });
  }
}
