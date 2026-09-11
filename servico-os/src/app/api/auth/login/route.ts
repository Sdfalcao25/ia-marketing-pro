import { NextResponse } from 'next/server';
import { authenticate, createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  const user = await authenticate(email, password);
  if (!user) return NextResponse.redirect(new URL('/login?error=1', request.url), 303);

  const session = await createSession(user.user_id, user.organization_id);
  const response = NextResponse.redirect(new URL('/app', request.url), 303);
  response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.maxAge));
  return response;
}
