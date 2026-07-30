'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/time';

export default function SchedulePage() {
  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: multi-child support — get active child id from shared state/cookie
    const childId = document.cookie.match(/active_child=(\d+)/)?.[1];
    if (!childId) { setLoading(false); return; }
    api.scheduleToday(childId)
      .then(d => setSlots(d.slots || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--tt-text)' }}>Today's Schedule</div>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tt-muted)' }}>Loading…</div>
      ) : slots.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--tt-muted)', fontSize: 14 }}>
          No schedule available for today.
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slots.map((slot, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 14, padding: '14px 16px',
              border: '1px solid var(--tt-border)', display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <div style={{ textAlign: 'center', minWidth: 48, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--tt-muted)' }}>{formatTime(slot.start_time)}</div>
                <div style={{ width: 1, height: 20, background: 'var(--tt-border)', margin: '4px auto' }} />
                <div style={{ fontSize: 11, color: 'var(--tt-muted)' }}>{formatTime(slot.end_time)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{slot.icon || '📖'}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--tt-text)' }}>{slot.activity}</span>
                </div>
                {slot.description && (
                  <div style={{ fontSize: 12, color: 'var(--tt-muted)', lineHeight: 1.4 }}>{slot.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
