'use client';

export default function ChildSwitcher({ children, activeId, onChange }) {
  if (!children || children.length <= 1) return null;

  return (
    <div style={{ display: 'flex', gap: 10, padding: '0 20px', flexWrap: 'wrap' }}>
      {children.map(child => {
        const active = child.id === activeId;
        return (
          <button
            key={child.id}
            onClick={() => onChange(child.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 16, cursor: 'pointer',
              border: active ? 'none' : '1px solid #E2E8F0',
              background: active ? 'var(--tt-cobalt)' : '#fff',
              color: active ? '#fff' : '#475569',
              boxShadow: active ? '0 0 0 2px rgba(30,64,175,.2)' : 'none',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#F59E0B' : '#CBD5E1' }} />
            {child.firstname}
          </button>
        );
      })}
    </div>
  );
}
