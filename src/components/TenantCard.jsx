'use client';
import { useEffect, useState } from 'react';
import { formatDistance } from '@/lib/haversine';
import { accentAt } from '@/lib/playful';

const CATEGORY_ICON = { food: '🍜', books: '📚', dessert: '🍦', health: '💚', retail: '🛍️' };

// Demo check-in: remembered on this device for the day, nothing is sent anywhere.
const checkInKey = id => `tt_partner_checkin_${id}_${new Date().toDateString()}`;

// `index` picks the card colour, so the partner list cycles red → yellow → blue.
export default function TenantCard({ tenant, distanceKm, index = 0 }) {
  const icon = CATEGORY_ICON[tenant.category] || CATEGORY_ICON.retail;
  const a = accentAt(index);
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
      background: '#fff', borderRadius: 24, padding: 16,
      boxShadow: `0 5px 0 ${a.soft}`, display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 15, flexShrink: 0, transform: 'rotate(-6deg)',
        background: a.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 17, fontWeight: 600, color: 'var(--tt-text)' }}>{tenant.name}</span>
          <span className="tt-sticker" style={{ background: a.main, color: a.on, boxShadow: `0 2px 0 ${a.edge}`, textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
            {tenant.discount}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tt-muted)', marginBottom: 8 }}>{tenant.description}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {distanceKm != null && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: 'var(--tt-green)', background: 'var(--tt-green-tint)',
              padding: '3px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3,
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
                fontSize: 12, fontWeight: 700, color: 'var(--tt-blue)', background: 'var(--tt-blue-tint)',
                padding: '3px 10px', borderRadius: 999, textDecoration: 'none',
              }}
            >
              🧭 Directions
            </a>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          {checkedInAt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 600, color: '#15803D', background: '#DCFCE7',
                padding: '6px 14px', borderRadius: 999,
              }}>
                ✓ Checked in · {new Date(checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button onClick={undo} style={{
                fontSize: 13, fontWeight: 700, color: 'var(--tt-muted)', background: 'none', border: 'none',
                padding: 0, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
              }}>
                Undo
              </button>
            </div>
          ) : (
            <button onClick={checkIn} className="tt-press" style={{
              width: '100%', padding: '10px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'var(--tt-blue)', color: '#fff', fontFamily: 'var(--tt-font-heading)', fontSize: 15, fontWeight: 600,
              '--tt-edge': '#001E57',
            }}>
              📍 Check in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
