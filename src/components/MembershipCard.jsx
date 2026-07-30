'use client';
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

export default function MembershipCard({ parent, children }) {
  const qrRef = useRef(null);

  useEffect(() => {
    if (qrRef.current && parent?.member_id) {
      QRCode.toCanvas(qrRef.current, parent.member_id, {
        width: 64, margin: 1,
        color: { dark: 'var(--tt-blue)', light: 'var(--tt-bg)' },
      });
    }
  }, [parent?.member_id]);

  const childNames = children?.map(c => c.firstname).join(' & ') || '';
  const sinceDate = parent?.since_date
    ? new Date(parent.since_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div style={{
      background: 'var(--tt-blue)', borderRadius: 16, padding: 18,
      position: 'relative', overflow: 'hidden', margin: '0 16px',
    }}>
      {/* QR code */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        background: 'var(--tt-bg)', borderRadius: 10, padding: 4,
      }}>
        <canvas ref={qrRef} style={{ display: 'block' }} />
      </div>

      <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--tt-blue-soft)', marginBottom: 8, textTransform: 'uppercase' }}>
        TutorTime Family
      </div>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--tt-bg)', marginBottom: 4 }}>
        {parent?.title || 'Ms.'} {parent?.name || '—'}
      </div>
      {childNames && (
        <div style={{ fontSize: 11, color: 'var(--tt-blue-soft)', marginBottom: 24 }}>
          Parent of {childNames}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--tt-blue-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>♡</span>
          <span>Part of the family since {sinceDate}</span>
        </div>
        {parent?.member_id && (
          <div style={{
            background: 'var(--tt-yellow)', color: 'var(--tt-text)',
            fontSize: 10, fontWeight: 500, padding: '2px 10px', borderRadius: 20,
          }}>
            #{parent.member_id}
          </div>
        )}
      </div>
    </div>
  );
}
