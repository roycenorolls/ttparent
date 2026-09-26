'use client';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import QrScanModal from '@/components/QrScanModal';

export default function MembershipCard({ parent, children }) {
  const qrRef = useRef(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (qrRef.current && parent?.member_id) {
      // qrcode draws to a canvas and needs literal hex — it cannot resolve
      // CSS custom properties.
      QRCode.toCanvas(qrRef.current, parent.member_id, {
        width: 56, margin: 0,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
    }
  }, [parent?.member_id]);

  const childNames = children?.map(c => c.firstname).join(' & ') || '';
  const sinceDate = parent?.since_date
    ? new Date(parent.since_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <section style={{
      margin: '0 16px', color: '#fff', borderRadius: 28, padding: 20,
      position: 'relative', overflow: 'hidden', boxShadow: '0 6px 0 #001E57',
      // Brand blue with a sprinkle of red / yellow / light-blue confetti.
      background: `radial-gradient(circle at 8% 88%, #FFCA05 0 5px, transparent 6px),
        radial-gradient(circle at 46% 18%, #E03248 0 4px, transparent 5px),
        radial-gradient(circle at 62% 80%, #7EA8F5 0 5px, transparent 6px),
        radial-gradient(circle at 100% 0%, rgba(224,50,72,.28) 0%, transparent 42%),
        #003087`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <span className="tt-sticker" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, transform: 'rotate(-3deg)',
            background: 'var(--tt-yellow)', color: 'var(--tt-blue)', boxShadow: '0 2px 0 #D9A800',
          }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Family Pass
          </span>
          <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 23, fontWeight: 700, paddingTop: 10 }}>
            {parent?.title || 'Ms.'} {parent?.name || '—'}
          </div>
          {childNames && (
            <div style={{ fontSize: 14, color: '#DBEAFE', fontWeight: 700, marginTop: 2 }}>Parent of {childNames}</div>
          )}
        </div>

        {/* QR code */}
        <button
          type="button"
          onClick={() => setShowQr(true)}
          disabled={!parent?.member_id}
          aria-label="Open QR code"
          style={{
            position: 'relative', background: '#fff', padding: 8, borderRadius: 16, flexShrink: 0, border: 'none', cursor: 'pointer', font: 'inherit',
            transform: 'rotate(4deg)', boxShadow: '0 4px 0 rgba(0,0,0,.25)',
          }}
        >
          <canvas ref={qrRef} width={56} height={56} style={{ display: 'block', width: 56, height: 56, borderRadius: 8 }} />
          <span className="tt-sticker" style={{
            position: 'absolute', bottom: -10, left: '50%', marginLeft: -26, width: 52, padding: '2px 0', textAlign: 'center',
            background: 'var(--tt-red-bright)', color: '#fff', fontSize: 10, transform: 'rotate(-6deg)', boxShadow: '0 2px 0 #B0192D',
          }}>
            Scan
          </span>
        </button>
      </div>

      <div style={{
        marginTop: 24, paddingTop: 12, borderTop: '2px dashed rgba(255,255,255,.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 700,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#BFDBFE' }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="#FFCA05" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
          </svg>
          <span>Since {sinceDate}</span>
        </div>
        {parent?.member_id && (
          <div style={{
            background: 'var(--tt-yellow)', color: 'var(--tt-blue)', fontFamily: 'var(--tt-font-heading)', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.05em', padding: '3px 12px', borderRadius: 999, boxShadow: '0 2px 0 #D9A800',
          }}>
            #{parent.member_id}
          </div>
        )}
      </div>
      {showQr && <QrScanModal parent={parent} onClose={() => setShowQr(false)} />}
    </section>
  );
}
