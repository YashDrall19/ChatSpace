import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getMessagesForAiReview } from '@/lib/services/messages';
import { createAiReview } from '@/lib/services/ai-agent';

export const runtime = 'nodejs';
export const maxDuration = 300;

declare global {
  // Prevent repeated clicks from launching several expensive local model runs
  // for the same account in one long-running app instance.
  // eslint-disable-next-line no-var
  var __chatReviewUsers: Set<number> | undefined;
}

function activeReviewUsers(): Set<number> {
  if (!globalThis.__chatReviewUsers) globalThis.__chatReviewUsers = new Set();
  return globalThis.__chatReviewUsers;
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const activeUsers = activeReviewUsers();
    if (activeUsers.has(userId)) {
      return NextResponse.json({ error: 'A chat review is already running. Please wait for it to finish.' }, { status: 429 });
    }
    activeUsers.add(userId);
    try {
      const review = await createAiReview(userId, await getMessagesForAiReview(userId));
      return NextResponse.json(review);
    } finally {
      activeUsers.delete(userId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI review failed';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
