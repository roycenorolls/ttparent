'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Engagement } from '@/components/UpdatesFeed';

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

export default function FullscreenViewer() {
  const { updateId } = useParams();
  const router = useRouter();
  const [list, setList]       = useState(null); // [{u: updateId, i: index within post}] in gallery order
  const [idx, setIdx]         = useState(0);
  const [details, setDetails] = useState({});
  const touchX = useRef(0);

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

  if (!update) return (
    <div style={{ background: '#000', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: 15 }}>Loading…</div>
    </div>
  );

  const media  = update.media || [];
  const current = media[entry.i];
  const total = list.length;
  const teacher = update.teacher;
  // No school WhatsApp number assigned to this class: never fall back to a
  // teacher's personal mobile, just let the parent open WhatsApp themselves.
  const waLink  = teacher?.phone
    ? `https://wa.me/62${teacher.phone.replace(/\D/g, '').replace(/^0/, '').replace(/^62/, '')}`
    : (teacher ? 'https://api.whatsapp.com/send/' : null);

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
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) < 40) return;
          setIdx(i => Math.min(total - 1, Math.max(0, i + (dx < 0 ? 1 : -1))));
        }}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', minHeight: 0, touchAction: 'pan-y' }}
      >
        {current?.file_type?.startsWith('image') ? (
          <img src={current.file_path} alt={update.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
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
            flex: 1, background: 'rgba(255,255,255,0.15)', color: 'var(--tt-bg)', textDecoration: 'none',
            padding: '10px 0', borderRadius: 12, textAlign: 'center', fontSize: 15, fontWeight: 500,
          }}>
            ↓ Save
          </a>
        )}
      </div>

    </div>
  );
}
