import Link from 'next/link';

// Thumbnail tints are categorical, not status — they only distinguish update
// types at a glance. The saturated roles (red = failure, green = check-in)
// don't apply at this weight.
const TYPE_STYLE = {
  photo:        { bg: 'var(--tt-blue-tint)',   icon: '🖼️' },
  video:        { bg: 'var(--tt-green-tint)',  icon: '▶️' },
  pdf:          { bg: 'var(--tt-yellow-tint)', icon: '📄' },
  announcement: { bg: 'var(--tt-red-tint)',    icon: '📣' },
};

export default function UpdatesFeed({ updates }) {
  if (!updates?.length) return null;

  const shown = updates.slice(0, 3);

  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--tt-text)' }}>Latest updates</span>
        <Link href="/gallery" style={{ fontSize: 12, color: 'var(--tt-blue)', textDecoration: 'none' }}>See all</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(u => {
          const style = TYPE_STYLE[u.type] || TYPE_STYLE.announcement;
          const date  = new Date(u.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          return (
            <Link key={u.id} href={`/gallery/${u.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', borderRadius: 12, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                border: '1px solid var(--tt-border)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                  background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>
                  {style.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tt-text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tt-muted)' }}>
                    {date} · {u.class_name || 'School'}
                  </div>
                </div>
                <span style={{ color: 'var(--tt-placeholder)', fontSize: 16 }}>›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
