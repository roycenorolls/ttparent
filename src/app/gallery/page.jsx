'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import GalleryGrid from '@/components/GalleryGrid';

const FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'photo',  label: 'Photos' },
  { key: 'video',  label: 'Videos' },
  { key: 'reports',label: 'Reports' },
];

export default function GalleryPage() {
  const [updates, setUpdates] = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.updates()
      .then(d => setUpdates(d.updates || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Header */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--tt-text)' }}>Gallery</div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: filter === f.key ? 'var(--tt-blue)' : 'var(--tt-blue-tint)',
              color:      filter === f.key ? 'var(--tt-bg)' : 'var(--tt-blue)',
              fontSize: 13, fontFamily: 'inherit',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading
        ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--tt-muted)' }}>Loading…</div>
        : <GalleryGrid updates={updates} filter={filter} />
      }
    </div>
  );
}
