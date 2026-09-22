import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE || 'http://localhost:8000/api';

/**
 * Ends the session: revokes the Sanctum token upstream, then clears the
 * httpOnly cookie. The cookie is cleared even if Laravel is unreachable —
 * the user asked to sign out, so the browser side must always let go.
 */
export async function POST() {
  const token = (await cookies()).get('auth_token')?.value;

  if (token) {
    try {
      await fetch(`${API}/auth/logout`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
    } catch {
      // Best effort — see above.
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
