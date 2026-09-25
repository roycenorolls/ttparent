'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Engagement, isReminder } from '@/components/UpdatesFeed';

// Browsers ignore <a download> for cross-origin files and just open them, so
// fetch the bytes and save them ourselves. Phones get the share sheet
// ("Save image"); desktops get a normal download.
async function saveInBrowser(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const blob = await res.blob();
    // Cloudflare Images URLs end in the variant name ("public"), not a filename.
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const name = `tutortime-${Date.now()}.${ext}`;
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (err) {
    if (err?.name === 'AbortError') return; // user closed the share sheet
    window.open(url, '_blank'); // CORS blocked the fetch: at least show it so they can long-press
  }
}

// Pinch to zoom, drag to pan while zoomed, double-tap to toggle 2.5x. At 1x a
// horizontal drag is a swipe to the next/previous photo. Reset on `resetKey`.
function useZoom(onSwipe, resetKey) {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const cur = useRef(t); cur.current = t;
  const g = useRef({});
  const lastTap = useRef(0);
  useEffect(() => setT({ s: 1, x: 0, y: 0 }), [resetKey]);

  const dist = ts => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
  const clampPan = (v, s, size) => Math.max(-(s - 1) * size / 2, Math.min((s - 1) * size / 2, v));

  const handlers = {
    onTouchStart: e => {
      const ts = e.touches;
      if (ts.length === 2) g.current = { mode: 'pinch', d: dist(ts), s: cur.current.s };
      else if (ts.length === 1) {
        g.current = { mode: 'pan', sx: ts[0].clientX, sy: ts[0].clientY, bx: cur.current.x, by: cur.current.y };
      }
    },
    onTouchMove: e => {
      const ts = e.touches, k = g.current;
      if (k.mode === 'pinch' && ts.length === 2) {
        const s = Math.min(5, Math.max(1, k.s * dist(ts) / k.d));
        setT(p => s === 1 ? { s, x: 0, y: 0 } : { ...p, s });
      } else if (k.mode === 'pan' && ts.length === 1 && cur.current.s > 1) {
        const s = cur.current.s;
        setT({
          s,
          x: clampPan(k.bx + ts[0].clientX - k.sx, s, window.innerWidth),
          y: clampPan(k.by + ts[0].clientY - k.sy, s, window.innerHeight),
        });
      }
    },
    onTouchEnd: e => {
      const k = g.current;
      if (e.touches.length > 0) { g.current = { mode: 'none' }; return; } // one finger lifted mid-pinch
      if (k.mode !== 'pan') return;
      const dx = e.changedTouches[0].clientX - k.sx, dy = e.changedTouches[0].clientY - k.sy;
      if (cur.current.s === 1 && Math.abs(dx) >= 40) { onSwipe(dx < 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          setT(cur.current.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 });
          lastTap.current = 0;
        } else lastTap.current = now;
      }
    },
  };

  const imgStyle = { transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, touchAction: 'none' };
  return { handlers, imgStyle, zoomed: t.s > 1 };
}

export default function FullscreenViewer() {
  const { updateId } = useParams();
  const router = useRouter();
  const [list, setList]       = useState(null); // [{u: updateId, i: index within post}] in gallery order
  const [idx, setIdx]         = useState(0);
  const [details, setDetails] = useState({});
  const [landscape, setLandscape] = useState(false);
  // Rotating the phone sideways turns an image into a full-screen view.
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
    const sync = () => setLandscape(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // The grid leaves its ordered tile list in sessionStorage so swiping can cross posts.
  useEffect(() => {
    const start = Number(new URLSearchParams(location.search).get('m') || 0);
    let stored = null;
    try { stored = JSON.parse(sessionStorage.getItem('ttGallery') || 'null'); } catch {}
    const at = stored?.findIndex(e => String(e.u) === String(updateId) && e.i === start) ?? -1;
    if (at >= 0) { setList(stored); setIdx(at); return; }
    setList([{ u: Number(updateId), i: start }]); // direct link: just this post (filled in below)
    setIdx(0);
  }, [updateId]);

  const entry = list?.[idx];
  const update = entry && details[entry.u];

  useEffect(() => {
    if (!entry || details[entry.u]) return;
    api.updateDetail(entry.u).then(d => setDetails(m => ({ ...m, [entry.u]: d.update })));
  }, [entry, details]);

  // Direct link with no stored list: expand to the post's own media once loaded.
  useEffect(() => {
    if (list?.length === 1 && update?.media?.length > 1) {
      setList(update.media.map((_, i) => ({ u: update.id, i })));
      setIdx(list[0].i);
    }
  }, [update]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = useZoom(d => setIdx(i => Math.min((list?.length || 1) - 1, Math.max(0, i + d))), idx);

  if (!update) return (
    <div style={{ background: '#000', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: 15 }}>Loading…</div>
    </div>
  );

  if (isReminder(update)) return <AnnouncementView update={update} onBack={() => router.back()} />;

  const media  = update.media || [];
  const current = media[entry.i];
  const total = list.length;
  const teacher = update.teacher;
  // No school WhatsApp number assigned to this class: never fall back to a
  // teacher's personal mobile, just let the parent open WhatsApp themselves.
  const waLink  = teacher?.phone
    ? `https://wa.me/62${teacher.phone.replace(/\D/g, '').replace(/^0/, '').replace(/^62/, '')}`
    : (teacher ? 'whatsapp://' : null);

  if (landscape && current?.file_type?.startsWith('image')) return (
    <div {...zoom.handlers} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: '#000', touchAction: 'none', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img src={current.file_path} alt={update.title} style={{ width: '100%', height: '100%', objectFit: 'contain', ...zoom.imgStyle }} />
    </div>
  );

  return (
    <div style={{
      // Exactly the space above the docked nav, so the buttons never slide behind it.
      background: '#000', height: 'calc(100dvh - 70px - env(safe-area-inset-bottom))', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px', paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tt-bg)', fontSize: 23, padding: 0 }}>
          ←
        </button>
        <span style={{ color: 'var(--tt-bg)', fontSize: 14, fontWeight: 500 }}>
          {total > 1 ? `${idx + 1} of ${total}` : update.title}
        </span>
        <div style={{ width: 22 }} />
      </div>

      {/* Media */}
      <div
        {...zoom.handlers}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', minHeight: 0, touchAction: 'none', overflow: 'hidden' }}
      >
        {current?.file_type?.startsWith('image') ? (
          <img src={current.file_path} alt={update.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, ...zoom.imgStyle }} />
        ) : current?.file_path?.startsWith('stream:') ? (
          <iframe
            src={`https://iframe.videodelivery.net/${current.file_path.replace('stream:', '')}`}
            style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: 8 }}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div style={{ color: 'var(--tt-bg)', fontSize: 49 }}>📄</div>
        )}
      </div>

      {/* Filmstrip: the whole gallery, current photo highlighted */}
      {total > 1 && (
        <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0', overflowX: 'auto' }}>
          {list.map((e, n) => (
            <div
              key={`${e.u}-${e.i}`}
              ref={n === idx ? el => el?.scrollIntoView({ inline: 'center', block: 'nearest' }) : undefined}
              onClick={() => setIdx(n)}
              style={{
                width: 48, height: 48, flexShrink: 0, borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                border: n === idx ? '2px solid var(--tt-bg)' : '2px solid transparent', background: '#333',
              }}
            >
              {(e.t || update.media?.[e.i]?.file_type?.startsWith('image')) && (
                <img src={e.t || update.media[e.i].file_path} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Caption */}
      <div style={{ padding: '8px 16px' }}>
        <div style={{ color: 'var(--tt-bg)', fontSize: 14, fontWeight: 500 }}>{update.title}</div>
        <div style={{ color: 'rgba(253,246,238,0.6)', fontSize: 12, marginTop: 2 }}>
          {new Date(update.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
          {teacher ? ` · Posted by ${teacher.title || 'Ms.'} ${teacher.name?.split(' ')[0]}` : ''}
        </div>
      </div>

      {/* Like / comment */}
      <Engagement u={update} dark />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px' }}>
        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{
            flex: 1, background: 'var(--tt-whatsapp)', color: '#fff', textDecoration: 'none',
            padding: '10px 0', borderRadius: 12, textAlign: 'center', fontSize: 15, fontWeight: 500,
          }}>
            Ask {teacher?.title || 'Ms.'} {teacher?.name?.split(' ')[0]}
          </a>
        )}
        {current?.file_path && !current.file_path.startsWith('stream:') && (
          <a href={current.file_path} download target="_blank" rel="noopener noreferrer" onClick={e => {
            // Inside the app shell the WebView can't download; hand the file to the shell instead.
            e.preventDefault();
            const url = new URL(current.file_path, location.href).href;
            if (window.TTShell) {
              window.TTShell.postMessage(JSON.stringify({ url, type: current.file_type || '' }));
              return;
            }
            saveInBrowser(url);
          }} style={{
            flex: 1, background: '#fff', color: '#0F172A', textDecoration: 'none',
            padding: '10px 0', borderRadius: 12, textAlign: 'center', fontSize: 15, fontWeight: 500,
          }}>
            ↓ Save
          </a>
        )}
      </div>

    </div>
  );
}

// An announcement opened from Home: the full text, then its attachments as tappable rows.
function AnnouncementView({ update, onBack }) {
  const files = update.media || [];
  const open = f => {
    const url = new URL(f.file_path, location.href).href;
    if (window.TTShell) { window.TTShell.postMessage(JSON.stringify({ url, type: f.file_type || '' })); return; }
    window.open(url, '_blank', 'noopener');
  };
  return (
    <div style={{ background: '#fff', minHeight: '100dvh', paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
        <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#0F172A' }}>←</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Important reminder</span>
      </div>
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 24, fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>{update.title}</h1>
        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>
          {new Date(update.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
          {update.teacher?.name ? ` · ${update.teacher.title || 'Ms.'} ${update.teacher.name.split(' ')[0]}` : ''}
        </div>
        {update.body && (
          <p style={{ fontSize: 16, color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: '18px 0 0' }}>{update.body}</p>
        )}
        {files.length > 0 && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {files.map((f, i) => {
              const photo = f.file_type?.startsWith('image');
              return (
                <button key={i} onClick={() => open(f)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, cursor: 'pointer',
                  border: '1px solid #E2E8F0', background: '#F8FAFC', textAlign: 'left', fontFamily: 'inherit',
                }}>
                  {photo
                    ? <img src={f.file_path} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
                    : <span style={{ width: 48, height: 48, borderRadius: 10, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📄</span>}
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{photo ? 'View photo' : 'Open document'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
