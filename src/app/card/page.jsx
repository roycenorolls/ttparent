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
      <div style={{ padding: '12px 16px 12px' }}>
        {data?.parent && (
          <div style={{ fontSize: 13, color: 'var(--tt-muted)', marginTop: 2 }}>
            {data.parent.title} {data.parent.name} · #{data.parent.member_id}
          </div>
        )}
      </div>

      <MembershipCard parent={data?.parent} children={data?.children} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 10px' }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--tt-text)' }}>Partners near you</span>
        <span style={{ fontSize: 12, color: 'var(--tt-muted)' }}>{sorted.length} partners</span>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(t => (
          <TenantCard key={t.id} tenant={t} distanceKm={t.distKm} />
        ))}
      </div>

      {sorted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 0', color: 'var(--tt-muted)' }}>
          <span style={{ fontSize: 16 }}>ℹ️</span>
          <span style={{ fontSize: 11 }}>Show your QR at checkout. Discount applies once scanned.</span>
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        <Link href="/settings" style={{ fontSize: 12, color: 'var(--tt-blue)', textDecoration: 'none' }}>
          Privacy settings →
        </Link>
      </div>
    </div>
  );
}
