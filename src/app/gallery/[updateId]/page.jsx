'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function FullscreenViewer() {
  const { updateId } = useParams();
  const router = useRouter();
  const [update, setUpdate]   = useState(null);
  const [mediaIdx, setMediaIdx] = useState(0);

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
  const waLink  = teacher?.phone
    ? `https://wa.me/62${teacher.phone.replace(/\D/g, '').replace(/^0/, '').replace(/^62/, '')}`
    : null;

  return (
    <div style={{ background: '#000', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', minHeight: 0 }}>
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
          <a href={current.file_path} download target="_blank" rel="noopener noreferrer" style={{
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
