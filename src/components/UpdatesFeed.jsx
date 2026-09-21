import Link from 'next/link';

const CAPTION_CLAMP = {
  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
};

function initials(name) {
  return (name || 'T').replace(/^(ms|mr|mrs)\.?\s+/i, '').trim().charAt(0).toUpperCase();
}

function PostCard({ u }) {
  const date = new Date(u.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const isText = !u.thumbnail;

  return (
    <article style={{
      background: '#fff', borderRadius: 12, border: '1px solid var(--tt-border)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'var(--tt-blue)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 600,
        }}>
          {initials(u.teacher_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tt-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.teacher_name || 'TutorTime'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tt-muted)' }}>
            {u.class_name || 'School'} · {date}
          </div>
        </div>
      </div>

      <Link href={`/gallery/${u.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {!isText && (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', background: 'var(--tt-blue-tint)' }}>
            <img
              src={u.thumbnail}
              alt={u.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {u.type === 'video' && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 44, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.4)',
              }}>▶</div>
            )}
          </div>
        )}

        <div style={{ padding: isText ? '0 12px 14px' : '10px 12px 14px' }}>
          <div style={{ fontSize: 13, color: 'var(--tt-text)', lineHeight: 1.45, ...CAPTION_CLAMP }}>
            <span style={{ fontWeight: 600 }}>{u.title}</span>
            {u.body ? <span> {u.body}</span> : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function UpdatesFeed({ updates }) {
  if (!updates?.length) return null;

  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--tt-text)' }}>Latest updates</span>
        <Link href="/gallery" style={{ fontSize: 12, color: 'var(--tt-blue)', textDecoration: 'none' }}>See all</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {updates.map(u => <PostCard key={u.id} u={u} />)}
      </div>
    </div>
  );
}
