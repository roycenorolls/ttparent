import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE || 'http://localhost:8000/api';

/**
 * Authenticated proxy to the Laravel API.
 *
 * The Sanctum token lives in an httpOnly cookie, so the browser can't attach
 * it itself. Every /parent/* call goes through here, where the cookie is read
 * server-side and replayed as a bearer token.
 */
async function forward(request, path) {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return NextResponse.json({ message: 'Unauthenticated.' }, { status: 401 });

  const target = `${API}/${path.join('/')}${request.nextUrl.search}`;

  const init = {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/json',
    },
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.headers['Content-Type'] = 'application/json';
    init.body = await request.text();
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json({ message: 'Service unavailable.' }, { status: 502 });
  }

  const payload = await upstream.text();
  const res = new NextResponse(payload, {
    status:  upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
  });

  // A rejected token means the session is over — clear it so the next
  // navigation lands on /login instead of looping through 401s.
  if (upstream.status === 401) {
    res.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  }

  return res;
}

export async function GET(request, { params }) {
  const { path } = await params;
  return forward(request, path);
}

export async function POST(request, { params }) {
  const { path } = await params;
  return forward(request, path);
}
