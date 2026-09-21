'use client';
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

// Demo of a partner scanning the parent's card: shows the parent QR full size.
export default function QrScanModal({ parent, onClose }) {
  const qrRef = useRef(null);

  useEffect(() => {
    if (qrRef.current && parent?.member_id) {
      QRCode.toCanvas(qrRef.current, parent.member_id, {
        width: 240, margin: 0,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
    }
  }, [parent?.member_id]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Member QR code"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, padding: 16,
        background: 'rgba(2,6,23,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 320,
          textAlign: 'center', boxShadow: 'var(--tt-shadow-card)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--tt-muted)', marginBottom: 12 }}>
          Show this to the partner to scan
        </div>
        <canvas ref={qrRef} style={{ display: 'block', margin: '0 auto' }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tt-text)', marginTop: 16 }}>
          {parent?.title} {parent?.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tt-muted)', marginTop: 2 }}>#{parent?.member_id}</div>
        <button onClick={onClose} style={{
          width: '100%', marginTop: 20, padding: '10px 14px', borderRadius: 999, border: 'none',
          cursor: 'pointer', background: '#0A3A82', color: '#fff', fontSize: 14, fontWeight: 700,
          fontFamily: 'inherit',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
