'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function GalleryGrid({ updates, filter }) {
  const filtered = filter === 'all'
    ? updates
    : updates.filter(u => u.type === filter || (filter === 'reports' && u.type === 'pdf'));

  const grouped = groupByDate(filtered);

  return (
    <div>
      {grouped.map(({ label, items }) => (
        <div key={label}>
          <div style={{
            padding: '8px 12px', fontSize: 11, fontWeight: 500,
            color: 'var(--tt-blue)', textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {label}
          </div>
          <LazyGrid items={items} />
        </div>
      ))}
    </div>
  );
}

function LazyGrid({ items }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { rootMargin: '200px' });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const shown  = items.slice(0, 8);
  const hidden = items.length - shown.length;

  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      {visible && shown.map((item, i) => {
        const isLast = i === shown.length - 1 && hidden > 0;
        return (
          <Link key={item.id} href={`/gallery/${item.id}`} style={{ position: 'relative', aspectRatio: '1', display: 'block' }}>
            <div style={{
              width: '100%', height: '100%', background: 'var(--tt-blue-tint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28 }}>{item.type === 'video' ? '▶️' : item.type === 'pdf' ? '📄' : '🖼️'}</span>
              )}
              {item.type === 'video' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 14 }}>▶</span>
                  </div>
                </div>
              )}
            </div>
            {isLast && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(8,80,65,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'var(--tt-bg)', fontSize: 18, fontWeight: 500 }}>+{hidden}</span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function groupByDate(items) {
  const groups = {};
  items.forEach(item => {
    const d    = new Date(item.created_at);
    const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                + (item.class_name ? ` — ${item.class_name}` : '');
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}
