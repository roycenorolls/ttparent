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
    const name = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'photo';
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
  const [update, setUpdate]   = useState(null);
  const [mediaIdx, setMediaIdx] = useState(0);
  const touchX = useRef(0);

  useEffect(() => {
    if (updateId) api.updateDetail(updateId).then(d => setUpdate(d.update));
  }, [updateId]);

  if (!update) return (
    <div style={{ background: '#000', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: 15 }}>Loading…</div>
    </div>
  );

  const media  = update.media || [];
  const current = media[mediaIdx];
  const teacher = update.teacher;
  // No school WhatsApp number assigned to this class: never fall back to a
  // teacher's personal mobile, just let the parent open WhatsApp themselves.
  const waLink  = teacher?.phone
    ? `https://wa.me/62${teacher.phone.replace(/\D/g, '').replace(/^0/, '').replace(/^62/, '')}`
    : (teacher ? 'https://api.whatsapp.com/send/' : null);

  return (
    <div className="tt-viewer" style={{ background: '#000', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px', paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tt-bg)', fontSize: 23, padding: 0 }}>
          ←
        </button>
        <span style={{ color: 'var(--tt-bg)', fontSize: 14, fontWeight: 500 }}>
          {media.length > 1 ? `${mediaIdx + 1} of ${media.length}` : update.title}
        </span>
        <div style={{ width: 22 }} />
      </div>

      {/* Media */}
      <div
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) < 40) return;
          setMediaIdx(i => Math.min(media.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))));
        }}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', minHeight: 0, touchAction: 'pan-y' }}
      >
        {current?.file_type?.startsWith('image') ? (
          <img src={current.file_path} alt={update.title} style={{ maxWidth: '100%', maxHeight: '60dvh', objectFit: 'contain', borderRadius: 8 }} />
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

      {/* Dot indicators */}
      {media.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0' }}>
          {media.map((_, i) => (
            <div
              key={i}
              onClick={() => setMediaIdx(i)}
              style={{ width: 6, height: 6, borderRadius: '50%', cursor: 'pointer', background: i === mediaIdx ? 'var(--tt-bg)' : 'rgba(255,255,255,0.3)' }}
            />
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
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
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

      {/* Filmstrip */}
      {media.length > 1 && (
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 16px', overflowX: 'auto' }}>
          {media.map((m, i) => (
            <div
              key={i}
              onClick={() => setMediaIdx(i)}
              style={{
                width: 48, height: 48, flexShrink: 0, borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                border: i === mediaIdx ? '2px solid var(--tt-bg)' : '2px solid transparent',
                background: '#333',
              }}
            >
              {m.file_type?.startsWith('image') && (
                <img src={m.file_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
