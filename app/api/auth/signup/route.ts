import { NextRequest, NextResponse } from 'next/server';
import { signUpWithEmail } from '@/lib/services/auth';
import { setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const { token, user } = await signUpWithEmail(email, password, displayName);
    const res = NextResponse.json({ user });
    return setAuthCookie(res, token);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
