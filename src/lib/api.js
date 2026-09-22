// All calls go through the Next.js proxy at /api/tt, which attaches the
// Sanctum bearer token from the httpOnly cookie. The browser never holds the
// token, so nothing here needs credentials handling.

const BASE = '/api/tt';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });

  if (res.status === 401) {
    // Session gone — bounce to sign-in rather than rendering an empty shell.
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthenticated');
  }
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);

  return res.json();
}

export const api = {
  childProfile:  (id) => apiFetch(`/parent/child/${id}`),
  scheduleWeek:  (id) => apiFetch(`/parent/child/${id}/schedule/week`),
  updates:       ()   => apiFetch('/parent/updates'),
  updateDetail:  (id) => apiFetch(`/parent/updates/${id}`),
  toggleLike:    (id) => apiFetch(`/parent/updates/${id}/like`, { method: 'POST' }),
  comments:      (id) => apiFetch(`/parent/updates/${id}/comments`),
  addComment:    (id, body) => apiFetch(`/parent/updates/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  }),
  membership:    ()   => apiFetch('/parent/membership'),
  setFaceMatchConsent: (id, consent) => apiFetch(`/parent/child/${id}/face-match-consent`, {
    method: 'PATCH',
    body: JSON.stringify({ consent }),
  }),
  // Not via the /api/tt proxy: the cookie has to be cleared server-side.
  logout:        ()   => fetch('/api/auth/logout', { method: 'POST' }),
};
