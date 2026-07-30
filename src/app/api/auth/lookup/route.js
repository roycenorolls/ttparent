import { NextResponse } from 'next/server';

const API = process.env.API_BASE || 'http://localhost:8000/api';

/** Proxies the school lookup so the browser never talks to Laravel directly. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API}/auth/lookup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({ email: body?.email }),
    });

    if (!upstream.ok) return NextResponse.json({ found: false });
    return NextResponse.json(await upstream.json());
  } catch {
    // Detection is cosmetic — a failure here must not surface as an error.
    return NextResponse.json({ found: false });
  }
}
