'use client';
import Link from 'next/link';
import { isReminder } from '@/components/UpdatesFeed';
import { accentAt } from '@/lib/playful';

// Posts that belong in the gallery for this child: anything with files attached, whatever its
// post type. Class-wide posts (no tags) show for everyone.
export function visibleItems(updates, activeId) {
  return updates
    .filter(u => u.media?.length && !isReminder(u)) // announcement attachments are not gallery items
    .filter(u => !u.child_ids?.length || u.child_ids.includes(activeId));
}

const TAB_KIND = { all: null, photo: 'photo', video: 'video', reports: 'pdf' };

// One tile per FILE, so a single post can hold photos, videos and PDFs at once and each file
// lands in its own tab (Photos / Videos / Reports).
export function expandMedia(posts, filter = 'all') {
  const kind = TAB_KIND[filter];
  return posts
    .flatMap(p => p.media.map((m, i) => ({
      ...p, key: `${p.id}-${m.id}`, thumbnail: m.thumbnail, type: m.type, index: i,
    })))
    .filter(t => !kind || t.type === kind);
}

export default function GalleryGrid({ updates, filter, activeId }) {
  const items = expandMedia(visibleItems(updates, activeId), filter);
  // Viewer swipes through every tile in this order, across posts.
  const saveOrder = () => {
    try { sessionStorage.setItem('ttGallery', JSON.stringify(items.filter(t => t.type !== 'pdf').map(t => ({ u: t.id, i: t.index || 0, t: t.thumbnail })))); } catch {}
  };

  if (!items.length) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>🖍️</div>
        <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 18, fontWeight: 600, color: 'var(--tt-muted)', marginTop: 6 }}>
          Nothing here yet.
        </div>
      </div>
    );
  }

  const photos  = items.filter(i => i.type === 'photo').length;
  const videos  = items.filter(i => i.type === 'video').length;
  const reports = items.filter(i => i.type === 'pdf').length;

  return (
    <div>
      {groupByMonth(items).map(({ label, classes, items }, gi) => (
        <section key={label} style={{ marginTop: gi ? 18 : 4 }}>
          <div style={{ padding: '6px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--tt-font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--tt-text)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: accentAt(gi).main, transform: 'rotate(12deg)' }} />
              {label}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tt-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {classes}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 12px' }}>
            {items.map(item => <Tile key={item.key || item.id} item={item} onOpen={saveOrder} />)}
          </div>
        </section>
      ))}

      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 16, fontWeight: 600, color: 'var(--tt-muted)' }}>
          {[
            photos  && `${photos} ${photos === 1 ? 'Photo' : 'Photos'}`,
            videos  && `${videos} ${videos === 1 ? 'Video' : 'Videos'}`,
            reports && `${reports} ${reports === 1 ? 'Report' : 'Reports'}`,
          ].filter(Boolean).join(', ')}
        </div>
      </div>
    </div>
  );
}

function Tile({ item, onOpen }) {
  return (
    <Link href={`/gallery/${item.id}?m=${item.index || 0}`} onClick={onOpen} style={{
      position: 'relative', aspectRatio: '1', display: 'block', overflow: 'hidden', borderRadius: 14, background: '#F1ECE1',
    }}>
      {item.thumbnail ? (
        <img src={item.thumbnail} alt={item.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 29 }}>
          {item.type === 'video' ? '▶️' : item.type === 'pdf' ? '📄' : '🖼️'}
        </div>
      )}
      {item.type === 'video' && <Badge bg="#FFCA05" ink="#003087"><PlayIcon />Video</Badge>}
      {item.type === 'pdf' && <Badge bg="#2F6FE4" ink="#fff">PDF</Badge>}
    </Link>
  );
}

function Badge({ bg, ink, children }) {
  return (
    <span style={{
      position: 'absolute', bottom: 6, right: 6, display: 'flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 999, color: ink, background: bg,
      fontFamily: 'var(--tt-font-heading)', fontSize: 11, fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

function PlayIcon() {
  return <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}

function groupByMonth(items) {
  const groups = new Map();
  items.forEach(item => {
    const label = new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups.has(label)) groups.set(label, { items: [], classes: new Set() });
    const g = groups.get(label);
    g.items.push(item);
    if (item.class_name) g.classes.add(item.class_name);
  });
  return [...groups].map(([label, g]) => ({ label, items: g.items, classes: [...g.classes].join(', ') }));
}
