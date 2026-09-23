'use client';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';

// Demo of a partner scanning the parent's card: shows the parent QR full size.
export default function QrScanModal({ parent, onClose }) {
  const qrRef = useRef(null);
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  // Camera scan: read frames from the video and decode with jsQR until a code is found.
  useEffect(() => {
    if (!scanning) return;
    let stream, raf, stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      const v = videoRef.current;
      if (stopped || !v) return;
      if (v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth) {
        canvas.width = v.videoWidth; canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code?.data) { setResult(code.data); setScanning(false); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
        tick();
      })
      .catch(() => { setError('Camera unavailable. Allow camera access and try again.'); setScanning(false); });
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
  }, [scanning]);

  useEffect(() => {
    if (!scanning && qrRef.current && parent?.member_id) {
      QRCode.toCanvas(qrRef.current, parent.member_id, {
        width: 240, margin: 0,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
    }
  }, [parent?.member_id, scanning]);

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
        {scanning ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--tt-muted)', marginBottom: 12 }}>Point the camera at a QR code</div>
            <video ref={videoRef} playsInline muted style={{ width: 240, height: 240, objectFit: 'cover', borderRadius: 12, background: '#000' }} />
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--tt-muted)', marginBottom: 12 }}>
              Show this to the partner to scan
            </div>
            <canvas ref={qrRef} style={{ display: 'block', margin: '0 auto' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tt-text)', marginTop: 16 }}>
              {parent?.title} {parent?.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--tt-muted)', marginTop: 2 }}>#{parent?.member_id}</div>
          </>
        )}
        {result && <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: 'var(--tt-text)', wordBreak: 'break-all' }}>Scanned: {result}</div>}
        {error && <div style={{ marginTop: 14, fontSize: 13, color: '#B91C1C' }}>{error}</div>}
        <button type="button" onClick={() => { setResult(''); setError(''); setScanning(s => !s); }} style={{
          width: '100%', marginTop: 20, padding: '10px 14px', borderRadius: 999, cursor: 'pointer',
          background: '#fff', color: '#0A3A82', border: '1px solid #0A3A82', fontSize: 14, fontWeight: 700,
          fontFamily: 'inherit',
        }}>
          {scanning ? 'Stop scanning' : 'Scan QR with camera'}
        </button>
        <button onClick={onClose} style={{
          width: '100%', marginTop: 10, padding: '10px 14px', borderRadius: 999, border: 'none',
          cursor: 'pointer', background: '#0A3A82', color: '#fff', fontSize: 14, fontWeight: 700,
          fontFamily: 'inherit',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
