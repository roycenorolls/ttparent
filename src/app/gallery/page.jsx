'use client';
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

  const active = children.find(c => c.id === activeId);
  const count  = visibleItems(updates, filter, activeId).length;

  return (
    <div style={{ background: '#fff', minHeight: '100dvh' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.05)', padding: 'calc(12px + env(safe-area-inset-top)) 16px 10px',
      }}>
        {active && (
          <ChildPicker children={children} active={active} onChange={setActiveId} />
        )}

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: '#000', lineHeight: 1 }}>
            Photos
          </h1>
          {!loading && <span style={{ fontSize: 12, fontWeight: 500, color: '#8E8E93' }}>{count} {count === 1 ? 'Item' : 'Items'}</span>}
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
                  fontFamily: 'inherit', fontSize: 12, fontWeight: on ? 700 : 600,
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
      </header>

      {loading
        ? <div style={{ padding: 32, textAlign: 'center', color: '#8E8E93' }}>Loading…</div>
        : <GalleryGrid updates={updates} filter={filter} activeId={activeId} />
      }
    </div>
  );
}

// "Aria • Toddler" pill. A transparent native <select> sits on top so the
// phone shows its own picker; with one child it is just a label.
function ChildPicker({ children, active, onChange }) {
  const many = children.length > 1;
  return (
    <div style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', marginLeft: -4, borderRadius: 999, background: 'rgba(0,0,0,0.05)',
      fontSize: 12, fontWeight: 600, color: '#1E293B',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FEA619' }} />
      <span>{active.firstname}{active.class ? ` • ${active.class}` : ''}</span>
      {many && (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 9l-7 7-7-7" />
          </svg>
          <select
            aria-label="Choose child"
            value={active.id}
            onChange={e => onChange(Number(e.target.value))}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' }}
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.firstname}</option>)}
          </select>
        </>
      )}
    </div>
  );
}
