import { NextResponse } from 'next/server';
import { SESSION_COOKIE, destroySession } from '@/lib/auth';

export async function POST(request: Request) {
  const rawCookie = request.headers.get('cookie') || '';
  const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (match?.[1]) await destroySession(decodeURIComponent(match[1]));
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.cookies.set(SESSION_COOKIE, '', { httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', path:'/', maxAge:0 });
  return response;
}
