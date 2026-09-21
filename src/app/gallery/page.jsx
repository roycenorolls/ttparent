'use client';
import AppHeader from '@/components/AppHeader';
import ChildSwitcher from '@/components/ChildSwitcher';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import GalleryGrid, { visibleItems } from '@/components/GalleryGrid';

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'photo',   label: 'Photos' },
  { key: 'video',   label: 'Videos' },
  { key: 'reports', label: 'Reports' },
];

export default function GalleryPage() {
  const [updates,  setUpdates]  = useState([]);
  const [children, setChildren] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.updates()
      .then(d => setUpdates(d.updates || []))
      .finally(() => setLoading(false));

    api.membership()
      .then(data => {
        setChildren(data.children || []);
        if (data.children?.length) setActiveId(data.children[0].id);
      })
      .catch(() => {});
  }, []);

  const count  = visibleItems(updates, filter, activeId).length;

  return (
    <div style={{ background: '#fff', minHeight: '100dvh' }}>
      <AppHeader title="Gallery" />
      <div style={{
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '12px 16px 10px',
      }}>
        <ChildSwitcher children={children} activeId={activeId} onChange={setActiveId} style={{ marginBottom: 12 }} />

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#000', lineHeight: 1 }}>
            Photos
          </h1>
          {!loading && <span style={{ fontSize: 13, fontWeight: 500, color: '#8E8E93' }}>{count} {count === 1 ? 'Item' : 'Items'}</span>}
        </div>

        {/* Segmented control */}
        <div style={{
          marginTop: 14, display: 'flex', padding: 2, borderRadius: 9,
          background: 'rgba(229,229,234,0.8)',
        }}>
          {FILTERS.map(f => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  flex: 1, padding: '5px 0', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 600,
                  background: on ? '#fff' : 'transparent',
                  color: on ? '#000' : '#64748B',
                  boxShadow: on ? '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)' : 'none',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading
        ? <div style={{ padding: 32, textAlign: 'center', color: '#8E8E93' }}>Loading…</div>
        : <GalleryGrid updates={updates} filter={filter} activeId={activeId} />
      }
    </div>
  );
}
