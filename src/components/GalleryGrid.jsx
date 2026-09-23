'use client';
import Link from 'next/link';

// Items shown for the current filter and child. Class-wide posts (no tags) show for everyone.
export function visibleItems(updates, filter, activeId) {
  return updates
    .filter(u => u.type !== 'announcement')
    .filter(u => filter === 'all' || u.type === filter || (filter === 'reports' && u.type === 'pdf'))
    .filter(u => !u.child_ids?.length || u.child_ids.includes(activeId));
}

// One tile per media item, so a post with several photos shows all of them.
export function expandMedia(posts) {
  return posts.flatMap(p => {
    if (p.type === 'pdf' || !p.media?.length) return [p];
    return p.media.map((m, i) => ({
      ...p, id: p.id, key: `${p.id}-${m.id}`, thumbnail: m.thumbnail,
      type: p.type === 'video' || m.type === 'video' ? 'video' : 'photo', index: i,
    }));
  });
}

export default function GalleryGrid({ updates, filter, activeId }) {
  const items = expandMedia(visibleItems(updates, filter, activeId));
  // Viewer swipes through every tile in this order, across posts.
  const saveOrder = () => {
    try { sessionStorage.setItem('ttGallery', JSON.stringify(items.filter(t => t.type !== 'pdf').map(t => ({ u: t.id, i: t.index || 0 })))); } catch {}
  };

  if (!items.length) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center', color: '#8E8E93', fontSize: 15 }}>
        Nothing here yet.
      </div>
    );
  }

  const photos = items.filter(i => i.type !== 'video' && i.type !== 'pdf').length;
  const videos = items.filter(i => i.type === 'video').length;

  return (
    <div>
      {groupByMonth(items).map(({ label, classes, items }, gi) => (
        <section key={label} style={{ marginTop: gi ? 12 : 4 }}>
          <div style={{
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#000', letterSpacing: '-0.01em' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {classes}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: '2px 2px 0' }}>
            {items.map(item => <Tile key={item.key || item.id} item={item} onOpen={saveOrder} />)}
          </div>
        </section>
      ))}

      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#000' }}>
          {photos} {photos === 1 ? 'Photo' : 'Photos'}{videos ? `, ${videos} ${videos === 1 ? 'Video' : 'Videos'}` : ''}
        </div>
      </div>
    </div>
  );
}

function Tile({ item, onOpen }) {
  return (
    <Link href={`/gallery/${item.id}?m=${item.index || 0}`} onClick={onOpen} style={{
      position: 'relative', aspectRatio: '1', display: 'block', overflow: 'hidden', background: '#F1F5F9',
    }}>
      {item.thumbnail ? (
        <img src={item.thumbnail} alt={item.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 29 }}>
          {item.type === 'video' ? '▶️' : item.type === 'pdf' ? '📄' : '🖼️'}
        </div>
      )}
      {item.type === 'video' && <Badge><PlayIcon />Video</Badge>}
      {item.type === 'pdf' && <Badge>PDF</Badge>}
    </Link>
  );
}

function Badge({ children }) {
  return (
    <span style={{
      position: 'absolute', bottom: 4, right: 4, display: 'flex', alignItems: 'center', gap: 2,
      padding: '2px 4px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600,
      background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      {children}
    </span>
  );
}

function PlayIcon() {
  return <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
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
