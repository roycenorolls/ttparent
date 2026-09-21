import Link from 'next/link';

const CAPTION_CLAMP = {
  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
};

function initials(name) {
  return (name || 'T').replace(/^(ms|mr|mrs)\.?\s+/i, '').trim().charAt(0).toUpperCase();
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// A class-wide notice with no photo reads as a reminder, not a post.
function ReminderCard({ u }) {
  return (
    <Link href={`/gallery/${u.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article style={{
        background: 'linear-gradient(135deg, rgba(254,242,242,.7), #fff 50%, rgba(255,251,235,.5))',
        border: '1px solid rgba(254,202,202,.7)', borderRadius: 24, padding: 16,
        boxShadow: 'var(--tt-shadow-soft)', display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 16, flexShrink: 0, background: '#EF4444', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Important reminder
            </span>
            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{shortDate(u.created_at)}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{u.title}</div>
          {u.body && (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginTop: 4, ...CAPTION_CLAMP }}>{u.body}</div>
          )}
        </div>
      </article>
    </Link>
  );
}

function PostCard({ u }) {
  const photo = u.image || u.thumbnail;
  if (!photo && u.type === 'announcement') return <ReminderCard u={u} />;

  return (
    <article style={{
      background: '#fff', borderRadius: 24, border: '1px solid #F1F5F9',
      boxShadow: 'var(--tt-shadow-soft)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 16, flexShrink: 0,
          background: 'var(--tt-cobalt)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 700,
          boxShadow: '0 0 0 2px #EFF6FF',
        }}>
          {initials(u.teacher_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.teacher_name || 'TutorTime'}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
            {u.class_name || 'School'} · {shortDate(u.created_at)}
          </div>
        </div>
      </div>

      <Link href={`/gallery/${u.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {photo && (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', background: '#F1F5F9' }}>
            <img
              src={photo}
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

        <div style={{ padding: 16, paddingTop: photo ? 16 : 0 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>{u.title}</h3>
          {u.body && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.6, ...CAPTION_CLAMP }}>{u.body}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

export default function UpdatesFeed({ updates }) {
  if (!updates?.length) return null;

  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 12px' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', color: '#0F172A' }}>
          Latest updates
        </h2>
        <Link href="/gallery" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, fontWeight: 700, color: 'var(--tt-cobalt)', textDecoration: 'none',
        }}>
          See all ({updates.length})
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {updates.map(u => <PostCard key={u.id} u={u} />)}
      </div>
    </div>
  );
}
