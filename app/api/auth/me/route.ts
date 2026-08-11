import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, clearAuthCookie } from '@/lib/auth';
import { getAuthUser } from '@/lib/services/auth';
import { getUserProfile, getUserSettings } from '@/lib/services/users';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (process.env.NODE_ENV !== 'production') {
      console.debug('GET /api/auth/me userId:', userId);
    }

    const user = await getAuthUser(userId);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [profile, settings] = await Promise.all([
      getUserProfile(userId),
      getUserSettings(userId),
    ]);

    return NextResponse.json({ user, profile, settings });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  return clearAuthCookie(res);
}
