import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmail } from '@/lib/services/auth';
import { setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const { token, user } = await signInWithEmail(email, password);
    const res = NextResponse.json({ user });
    return setAuthCookie(res, token);
  } catch (err) {
    const message = (err as Error).message;
    console.error('POST /api/auth/signin error:', err);
    if (message.includes('Invalid')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: process.env.NODE_ENV === 'production' ? 'Failed to sign in' : message }, { status: 500 });
  }
}
