'use client';

const NAVY = '#0A3A82';

// Pill per child with an initial badge; the active child is navy with a yellow badge.
export default function ChildSwitcher({ children, activeId, onChange, style }) {
  if (!children || children.length <= 1) return null;

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', ...style }}>
      {children.map(child => {
        const active = child.id === activeId;
        return (
          <button
            key={child.id}
            onClick={() => onChange(child.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, cursor: 'pointer',
              padding: '6px 14px 6px 8px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              background: active ? NAVY : '#fff', color: active ? '#fff' : '#5C5549',
              border: active ? '1px solid transparent' : '1px solid #EAE3D2',
              boxShadow: '0 1px 2px rgba(0,0,0,.05)',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? '#FFC72C' : '#F3EFE6', color: active ? NAVY : '#5C5549',
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
