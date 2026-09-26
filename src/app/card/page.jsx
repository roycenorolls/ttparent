'use client';
import AppHeader from '@/components/AppHeader';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getDistanceKm } from '@/lib/haversine';
import MembershipCard from '@/components/MembershipCard';
import TenantCard     from '@/components/TenantCard';

export default function CardPage() {
  const [data,     setData]     = useState(null);
  const [tenants,  setTenants]  = useState([]);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    api.membership().then(d => {
      setData(d);
      setTenants(d.benefits || []);
    });
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 },
    );
  }, []);

  const sorted = location
    ? [...tenants]
        .map(t => ({ ...t, distKm: t.lat && t.lng ? getDistanceKm(location.lat, location.lng, t.lat, t.lng) : null }))
        .sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity))
    : tenants;

  return (
    <div style={{ paddingBottom: 24 }}>
      <AppHeader title="Member Card" />
      <div style={{ padding: '8px 20px 14px' }}>
        {data?.parent && (
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tt-muted)' }}>
            {data.parent.title} {data.parent.name} · #{data.parent.member_id}
          </div>
        )}
      </div>

      <MembershipCard parent={data?.parent} children={data?.children} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 16px 12px' }}>
        <span style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 21, fontWeight: 700, color: 'var(--tt-text)' }}>Partners near you</span>
        <span style={{
          fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--tt-blue)',
          background: 'var(--tt-blue-tint)', padding: '4px 12px', borderRadius: 999,
        }}>
          {sorted.length} partners
        </span>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sorted.map((t, i) => (
          <TenantCard key={t.id} tenant={t} distanceKm={t.distKm} index={i} />
        ))}
      </div>

      {sorted.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, margin: '18px 16px 0', padding: '10px 14px',
          background: 'var(--tt-yellow-tint)', borderRadius: 18, color: 'var(--tt-yellow-text)',
        }}>
          <span style={{ fontSize: 17 }}>ℹ️</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Show your QR at checkout. Discount applies once scanned.</span>
        </div>
      )}

      <div style={{ padding: '18px 16px 0' }}>
        <Link href="/settings" style={{
          fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--tt-blue)', textDecoration: 'none',
        }}>
          Privacy settings →
        </Link>
      </div>
    </div>
  );
}
