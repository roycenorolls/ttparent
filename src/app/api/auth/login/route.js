import { NextResponse } from 'next/server';

const API = process.env.API_BASE || 'http://localhost:8000/api';

/**
 * Exchanges credentials for a Sanctum token and stores it in an httpOnly
 * cookie. The token is never handed to client JS — the browser can't read it,
 * and neither can anything injected into the page.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Bad request.' }, { status: 400 });
  }

  let upstream, data;
  try {
    upstream = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({ email: body?.email, password: body?.password }),
    });
    data = await upstream.json();
  } catch {
    return NextResponse.json({ message: 'Service unavailable.' }, { status: 502 });
  }

  if (!upstream.ok) {
    // Pass the status through so the UI can tell 401 from 429, but never echo
    // upstream detail that might distinguish "no such email" from "bad password".
    return NextResponse.json({ message: 'Invalid credentials.' }, { status: upstream.status });
  }

  const res = NextResponse.json({
    name:         data.name,
    school_label: data.school_label,
  });

  res.cookies.set('auth_token', data.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/',
    maxAge:   60 * 60 * 24 * 30,
  });

  return res;
}
