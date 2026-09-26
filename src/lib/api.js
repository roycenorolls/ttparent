// All calls go through the Next.js proxy at /api/tt, which attaches the
// Sanctum bearer token from the httpOnly cookie. The browser never holds the
// token, so nothing here needs credentials handling.

const BASE = '/api/tt';

// Reads are kept for a couple of minutes, so tabs that share data (every tab
// loads membership) and tabs warmed in the background by BottomNav open
// straight away instead of waiting on the round trip to the API. Any write
// clears the lot, so a like or a consent change never shows stale data.
const FRESH_MS = 2 * 60 * 1000;
const cache = new Map(); // path -> { at, promise }

function cachedGet(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise;
  const promise = apiFetch(path);
  cache.set(path, { at: Date.now(), promise });
  promise.catch(() => cache.delete(path)); // don't keep failures
  return promise;
}

async function apiFetch(path, options = {}) {
  if (options.method && options.method !== 'GET') cache.clear();
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
  childProfile:  (id) => cachedGet(`/parent/child/${id}`),
  scheduleWeek:  (id) => cachedGet(`/parent/child/${id}/schedule/week`),
  updates:       (all) => cachedGet(all ? '/parent/updates?all=1' : '/parent/updates'),
  updateDetail:  (id) => cachedGet(`/parent/updates/${id}`),
  toggleLike:    (id) => apiFetch(`/parent/updates/${id}/like`, { method: 'POST' }),
  comments:      (id) => apiFetch(`/parent/updates/${id}/comments`),
  addComment:    (id, body) => apiFetch(`/parent/updates/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  }),
  membership:    ()   => cachedGet('/parent/membership'),
  setFaceMatchConsent: (id, consent) => apiFetch(`/parent/child/${id}/face-match-consent`, {
    method: 'PATCH',
    body: JSON.stringify({ consent }),
  }),
  // Not via the /api/tt proxy: the cookie has to be cleared server-side.
  logout:        ()   => fetch('/api/auth/logout', { method: 'POST' }),
};
