import { formatDistance } from '@/lib/haversine';

const CATEGORY_STYLE = {
  food:      { icon: '🍜', bg: 'var(--tt-yellow-tint)', text: 'var(--tt-yellow-text)', discountBg: 'var(--tt-yellow-tint)', discountText: 'var(--tt-yellow-text)' },
  books:     { icon: '📚', bg: 'var(--tt-blue-tint)', text: 'var(--tt-blue)', discountBg: 'var(--tt-blue-tint)', discountText: 'var(--tt-blue)' },
  dessert:   { icon: '🍦', bg: 'var(--tt-yellow-tint)', text: 'var(--tt-yellow-text)', discountBg: 'var(--tt-yellow-tint)', discountText: 'var(--tt-yellow-text)' },
  health:    { icon: '💚', bg: 'var(--tt-blue-tint)', text: 'var(--tt-blue)', discountBg: 'var(--tt-blue-tint)', discountText: 'var(--tt-blue)' },
  retail:    { icon: '🛍️', bg: 'var(--tt-yellow-tint)', text: 'var(--tt-yellow-text)', discountBg: 'var(--tt-yellow-tint)', discountText: 'var(--tt-yellow-text)' },
};

export default function TenantCard({ tenant, distanceKm }) {
  const style = CATEGORY_STYLE[tenant.category] || CATEGORY_STYLE.retail;
  const mapsUrl = `https://maps.google.com/?q=${tenant.lat},${tenant.lng}`;

  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '14px 16px',
      border: '1px solid var(--tt-border)', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 42, borderRadius: 10, flexShrink: 0,
        background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        {style.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tt-text)' }}>{tenant.name}</span>
          <span style={{
            fontSize: 11, fontWeight: 500, color: style.discountText,
            background: style.discountBg, padding: '2px 8px', borderRadius: 10,
          }}>
            {tenant.discount}
          </span>
        </div>
        <div style={{ fontSize: 11, color: style.text, marginBottom: 6 }}>{tenant.description}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {distanceKm != null && (
            <span style={{
              fontSize: 10, color: 'var(--tt-green)', background: 'var(--tt-blue-tint)',
              padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3,
            }}>
              📍 {formatDistance(distanceKm)}
            </span>
          )}
          {tenant.lat && tenant.lng && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10, color: 'var(--tt-blue)', border: '1px solid var(--tt-blue)',
                padding: '2px 8px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              🧭 Directions
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
