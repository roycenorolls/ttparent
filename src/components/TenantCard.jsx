'use client';
import { useEffect, useState } from 'react';
import { formatDistance } from '@/lib/haversine';

const CATEGORY_STYLE = {
  food:      { icon: '🍜', bg: 'var(--tt-yellow-tint)', text: 'var(--tt-yellow-text)', discountBg: 'var(--tt-yellow-tint)', discountText: 'var(--tt-yellow-text)' },
  books:     { icon: '📚', bg: 'var(--tt-blue-tint)', text: 'var(--tt-blue)', discountBg: 'var(--tt-blue-tint)', discountText: 'var(--tt-blue)' },
  dessert:   { icon: '🍦', bg: 'var(--tt-yellow-tint)', text: 'var(--tt-yellow-text)', discountBg: 'var(--tt-yellow-tint)', discountText: 'var(--tt-yellow-text)' },
  health:    { icon: '💚', bg: 'var(--tt-blue-tint)', text: 'var(--tt-blue)', discountBg: 'var(--tt-blue-tint)', discountText: 'var(--tt-blue)' },
  retail:    { icon: '🛍️', bg: 'var(--tt-yellow-tint)', text: 'var(--tt-yellow-text)', discountBg: 'var(--tt-yellow-tint)', discountText: 'var(--tt-yellow-text)' },
};

// Demo check-in: remembered on this device for the day, nothing is sent anywhere.
const checkInKey = id => `tt_partner_checkin_${id}_${new Date().toDateString()}`;

export default function TenantCard({ tenant, distanceKm }) {
  const style = CATEGORY_STYLE[tenant.category] || CATEGORY_STYLE.retail;
  const [checkedInAt, setCheckedInAt] = useState(null);

  useEffect(() => {
    try { setCheckedInAt(localStorage.getItem(checkInKey(tenant.id))); } catch {}
  }, [tenant.id]);

  const checkIn = () => {
    const now = new Date().toISOString();
    setCheckedInAt(now);
    try { localStorage.setItem(checkInKey(tenant.id), now); } catch {}
  };
  const undo = () => {
    setCheckedInAt(null);
    try { localStorage.removeItem(checkInKey(tenant.id)); } catch {}
  };
  const mapsUrl = `https://maps.google.com/?q=${tenant.lat},${tenant.lng}`;

  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '14px 16px',
      border: '1px solid var(--tt-border)', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 42, borderRadius: 10, flexShrink: 0,
        background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23,
      }}>
        {style.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--tt-text)' }}>{tenant.name}</span>
          <span style={{
            fontSize: 12, fontWeight: 500, color: style.discountText,
            background: style.discountBg, padding: '2px 8px', borderRadius: 10,
          }}>
            {tenant.discount}
          </span>
        </div>
        <div style={{ fontSize: 12, color: style.text, marginBottom: 6 }}>{tenant.description}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {distanceKm != null && (
            <span style={{
              fontSize: 11, color: 'var(--tt-green)', background: 'var(--tt-blue-tint)',
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
                fontSize: 11, color: 'var(--tt-blue)', border: '1px solid var(--tt-blue)',
                padding: '2px 8px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              🧭 Directions
            </a>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          {checkedInAt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#15803D', background: '#DCFCE7',
                border: '1px solid #BBF7D0', padding: '6px 12px', borderRadius: 999,
              }}>
                ✓ Checked in · {new Date(checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button onClick={undo} style={{
                fontSize: 12, color: 'var(--tt-muted)', background: 'none', border: 'none',
                padding: 0, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
              }}>
                Undo
              </button>
            </div>
          ) : (
            <button onClick={checkIn} style={{
              width: '100%', padding: '9px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: '#0A3A82', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              boxShadow: '0 4px 10px -2px rgba(10,58,130,.35)',
            }}>
              📍 Check in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
