'use client';
import AppHeader from '@/components/AppHeader';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [children, setChildren] = useState(null);
  const [pending,  setPending]  = useState({}); // { [childId]: true } — a set, not a scalar,
                                                 // so toggling one child's request in flight
                                                 // doesn't get cleared by a different child's
                                                 // request resolving first.
  const [error,    setError]    = useState(null);

  useEffect(() => {
    api.membership().then(d => setChildren(d.children || []));
  }, []);

  async function toggle(child) {
    const next = child.face_match_consent === 'yes' ? 'no' : 'yes';
    setPending(p => ({ ...p, [child.id]: true }));
    setError(null);
    try {
      await api.setFaceMatchConsent(child.id, next);
      setChildren(cs => cs.map(c => c.id === child.id ? { ...c, face_match_consent: next } : c));
    } catch {
      setError(`Couldn't update ${child.firstname}'s setting — please try again.`);
    } finally {
      setPending(p => {
        const { [child.id]: _, ...rest } = p;
        return rest;
      });
    }
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <AppHeader title="Privacy Settings" />
      <div style={{ padding: '12px 16px 0' }}>
      </div>

      <div style={{ padding: '0 16px 16px', fontSize: 12, color: 'var(--tt-muted)', lineHeight: 1.5 }}>
        When enabled, your child's existing registration photo is used to suggest
        which photos they appear in on new class posts — teachers always review
        and confirm every suggestion before it's shown to anyone. You can turn
        this off at any time.
      </div>

      {error && (
        <div style={{ margin: '0 16px 12px', padding: '10px 12px', background: 'var(--tt-red-tint)', color: 'var(--tt-red-text)', borderRadius: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children === null && <div style={{ fontSize: 13, color: 'var(--tt-muted)' }}>Loading…</div>}

        {children?.map(child => {
          const restricted = child.photo_restriction === 'yes';
          const on = child.face_match_consent === 'yes';
          return (
            <div key={child.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--tt-surface)', border: '1px solid var(--tt-border)',
              borderRadius: 'var(--tt-radius)', padding: '12px 14px',
            }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--tt-text)', fontWeight: 500 }}>
                  {child.firstname} {child.lastname}
                </div>
                {restricted && (
                  <div style={{ fontSize: 11, color: 'var(--tt-muted)', marginTop: 2 }}>
                    Photo use is restricted for this child — face matching isn't available.
                  </div>
                )}
              </div>
              <button
                onClick={() => !restricted && toggle(child)}
                disabled={restricted || !!pending[child.id]}
                style={{
                  width: 44, height: 26, borderRadius: 13, border: 'none', flexShrink: 0,
                  background: restricted ? 'var(--tt-border)' : (on ? 'var(--tt-blue)' : 'var(--tt-border)'),
                  position: 'relative', cursor: restricted ? 'default' : 'pointer',
                  opacity: pending[child.id] ? 0.6 : 1,
                }}
                aria-label={`Face-match consent for ${child.firstname}`}
              >
                <span style={{
                  position: 'absolute', top: 3, left: on ? 21 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: 'var(--tt-bg)',
                  transition: 'left 0.15s ease',
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
