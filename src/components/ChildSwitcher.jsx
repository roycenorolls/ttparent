'use client';

// Initial colours per child, in order.
const BADGES = [
  { bg: '#E03248', ink: '#fff' },
  { bg: '#2F6FE4', ink: '#fff' },
  { bg: '#FFCA05', ink: '#003087' },
];

// Chunky toy-block pill per child with a coloured initial; the active child turns yellow.
export default function ChildSwitcher({ children, activeId, onChange, style }) {
  if (!children || children.length <= 1) return null;

  return (
    // Bottom padding leaves room for the pills' solid edge inside the scroller.
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 6, ...style }}>
      {children.map((child, i) => {
        const active = child.id === activeId;
        const badge = BADGES[i % BADGES.length];
        return (
          <button
            key={child.id}
            onClick={() => onChange(child.id)}
            className="tt-press"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, cursor: 'pointer',
              padding: '5px 16px 5px 5px', borderRadius: 999, border: 'none',
              fontFamily: 'var(--tt-font-heading)', fontSize: 17, fontWeight: 600,
              background: active ? 'var(--tt-yellow)' : '#fff', color: active ? 'var(--tt-blue)' : 'var(--tt-text)',
              '--tt-edge': active ? '#D9A800' : 'rgba(0,48,135,.12)',
            }}
          >
            <span style={{
              width: 32, height: 32, borderRadius: '50%', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: badge.bg, color: badge.ink, boxShadow: '0 0 0 2px #fff',
            }}>
              {child.firstname.charAt(0)}
            </span>
            {child.firstname}
          </button>
        );
      })}
    </div>
  );
}
