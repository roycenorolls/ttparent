'use client';

export default function ChildSwitcher({ children, activeId, onChange }) {
  if (!children || children.length <= 1) return null;

  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 16px', flexWrap: 'wrap' }}>
      {children.map(child => {
        const active = child.id === activeId;
        return (
          <button
            key={child.id}
            onClick={() => onChange(child.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: active ? 'var(--tt-blue)' : 'var(--tt-blue-tint)',
              color: active ? 'var(--tt-bg)' : 'var(--tt-blue)',
              fontSize: 13, fontWeight: active ? 500 : 400,
              fontFamily: 'inherit',
            }}
          >
            {child.firstname}
          </button>
        );
      })}
    </div>
  );
}
