'use client';
import AppHeader from '@/components/AppHeader';
import ChildSwitcher from '@/components/ChildSwitcher';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import GalleryGrid, { visibleItems, expandMedia } from '@/components/GalleryGrid';

// Each filter is a toy-block chip in its own colour: fill, edge, text on fill.
const FILTERS = [
  { key: 'all',     label: 'All',     c: ['#003087', '#001E57', '#fff'] },
  { key: 'photo',   label: 'Photos',  c: ['#E03248', '#B0192D', '#fff'] },
  { key: 'video',   label: 'Videos',  c: ['#FFCA05', '#D9A800', '#003087'] },
  { key: 'reports', label: 'Reports', c: ['#2F6FE4', '#1C4FB3', '#fff'] },
];

export default function GalleryPage() {
  const [updates,  setUpdates]  = useState([]);
  const [children, setChildren] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.updates(true)
      .then(d => setUpdates(d.updates || []))
      .finally(() => setLoading(false));

    api.membership()
      .then(data => {
        setChildren(data.children || []);
        if (data.children?.length) setActiveId(data.children[0].id);
      })
      .catch(() => {});
  }, []);

  const count  = expandMedia(visibleItems(updates, activeId), filter).length;

  return (
    <div style={{ minHeight: '100dvh' }}>
      <AppHeader title="Gallery" />
      <div style={{ padding: '8px 16px 12px' }}>
        <ChildSwitcher children={children} activeId={activeId} onChange={setActiveId} style={{ marginBottom: 12 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 28, fontWeight: 700, color: 'var(--tt-text)', lineHeight: 1 }}>
            Photos
          </h2>
          {!loading && (
            <span style={{
              fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--tt-blue)',
              background: 'var(--tt-blue-tint)', padding: '4px 12px', borderRadius: 999,
            }}>
              {count} {count === 1 ? 'Item' : 'Items'}
            </span>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          {FILTERS.map(f => {
            const on = filter === f.key;
            const [fill, edge, ink] = f.c;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={on}
                className="tt-press"
                style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: 999, cursor: 'pointer',
                  fontFamily: 'var(--tt-font-heading)', fontSize: 15, fontWeight: 600,
                  background: on ? fill : '#fff', color: on ? ink : 'var(--tt-muted)',
                  '--tt-edge': on ? edge : 'rgba(0,48,135,.10)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading
        ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--tt-muted)', fontWeight: 600 }}>Loading…</div>
        : <GalleryGrid updates={updates} filter={filter} activeId={activeId} />
      }
    </div>
  );
}
