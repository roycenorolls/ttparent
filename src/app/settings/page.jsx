'use client';
import AppHeader from '@/components/AppHeader';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '•';

export default function ProfilePage() {
  const [data,     setData]     = useState(null);
  const [pending,  setPending]  = useState({}); // { [childId]: true } — a set, not a scalar,
                                                 // so toggling one child's request in flight
                                                 // doesn't get cleared by a different child's
                                                 // request resolving first.
  const [error,    setError]    = useState(null);
  const [confirm,  setConfirm]  = useState(false);
  const [leaving,  setLeaving]  = useState(false);

  useEffect(() => {
    api.membership()
      .then(setData)
      .catch(() => setError('Could not load your profile.'));
  }, []);

  const parent   = data?.parent;
  const children = data?.children;
  const sinceDate = parent?.since_date
    ? new Date(parent.since_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  async function toggle(child) {
    const next = child.face_match_consent === 'yes' ? 'no' : 'yes';
    setPending(p => ({ ...p, [child.id]: true }));
    setError(null);
    try {
      await api.setFaceMatchConsent(child.id, next);
      setData(d => ({
        ...d,
        children: d.children.map(c => c.id === child.id ? { ...c, face_match_consent: next } : c),
      }));
    } catch {
      setError(`Couldn't update ${child.firstname}'s setting — please try again.`);
    } finally {
      setPending(p => {
        const { [child.id]: _, ...rest } = p;
        return rest;
      });
    }
  }

  async function signOut() {
    setLeaving(true);
    try { await api.logout(); } catch {}
    // Full navigation, not router.push: drops every bit of the previous
    // session's client state along with the cookie.
    window.location.href = '/login';
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <AppHeader title="Profile" />

      {/* Identity — same navy card language as the Member Card. */}
      <section style={{
        margin: '16px 16px 0', color: '#fff', borderRadius: 24, padding: 20,
        position: 'relative', overflow: 'hidden', boxShadow: 'var(--tt-shadow-card)',
        background: 'radial-gradient(circle at 100% 0%, rgba(239,68,68,.22) 0%, transparent 40%), radial-gradient(circle at 0% 100%, rgba(245,158,11,.25) 0%, transparent 40%), linear-gradient(135deg, #1E40AF 0%, #172554 100%)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: '#F59E0B', color: '#020617',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--tt-font-heading)', fontSize: 20, fontWeight: 800,
          boxShadow: '0 0 0 3px rgba(255,255,255,.2)',
        }}>
          {initials(parent?.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 21, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {parent ? `${parent.title || 'Ms.'} ${parent.name}` : '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {parent?.member_id && (
              <span style={{
                background: '#F59E0B', color: '#020617', fontSize: 12, fontWeight: 800,
                letterSpacing: '0.05em', padding: '2px 10px', borderRadius: 999,
              }}>
                #{parent.member_id}
              </span>
            )}
            {sinceDate && <span style={{ fontSize: 13, color: '#BFDBFE' }}>Since {sinceDate}</span>}
          </div>
        </div>
      </section>

      {error && (
        <div style={{ margin: '16px 16px 0', padding: '10px 12px', background: 'var(--tt-red-tint)', color: 'var(--tt-red-text)', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Face-match consent, one row per child. */}
      <div style={{ padding: '24px 20px 4px' }}>
        <div className="tt-eyebrow" style={{ margin: 0 }}>Photo privacy</div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--tt-muted)', lineHeight: 1.5 }}>
          When enabled, your child's registration photo is used to suggest which
          photos they appear in on new class posts. Teachers always review and
          confirm every suggestion before it's shown to anyone. You can turn this
          off at any time.
        </p>
      </div>

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!data && !error && <div style={{ fontSize: 14, color: 'var(--tt-muted)' }}>Loading…</div>}

        {children?.map(child => {
          const restricted = child.photo_restriction === 'yes';
          const on = child.face_match_consent === 'yes';
          return (
            <div key={child.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--tt-surface)', border: '1px solid var(--tt-border)',
              borderRadius: 14, padding: '12px 14px', boxShadow: 'var(--tt-shadow-soft)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'var(--tt-blue-tint)', color: 'var(--tt-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 800,
              }}>
                {initials(`${child.firstname} ${child.lastname}`)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: 'var(--tt-text)', fontWeight: 600 }}>
                  {child.firstname} {child.lastname}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tt-muted)', marginTop: 2 }}>
                  {restricted
                    ? "Photo use is restricted — face matching isn't available."
                    : on ? 'Face matching on' : 'Face matching off'}
                </div>
              </div>
              <button
                onClick={() => !restricted && toggle(child)}
                disabled={restricted || !!pending[child.id]}
                style={{
                  width: 44, height: 26, borderRadius: 13, border: 'none', flexShrink: 0,
                  background: on && !restricted ? 'var(--tt-blue)' : 'var(--tt-border)',
                  position: 'relative', cursor: restricted ? 'default' : 'pointer',
                  opacity: pending[child.id] ? 0.6 : 1, transition: 'background .15s',
                }}
                aria-label={`Face-match consent for ${child.firstname}`}
                aria-pressed={on}
              >
                <span style={{
                  position: 'absolute', top: 3, left: on ? 21 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left 0.15s ease',
                }} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Sign out — a tinted pill, so it reads as deliberate but never as the primary action. */}
      <div style={{ padding: '28px 16px 0' }}>
        {confirm ? (
          <div style={{
            background: 'var(--tt-surface)', border: '1px solid var(--tt-border)', borderRadius: 18,
            padding: 16, boxShadow: 'var(--tt-shadow-soft)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tt-text)' }}>Sign out of TT Parents?</div>
            <div style={{ fontSize: 13, color: 'var(--tt-muted)', margin: '4px 0 14px' }}>
              You'll need your email and password to sign back in.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(false)} disabled={leaving} style={{
                flex: 1, height: 48, borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                background: 'var(--tt-surface)', color: 'var(--tt-text)',
                border: '1px solid var(--tt-border)', fontSize: 15, fontWeight: 600,
              }}>
                Cancel
              </button>
              <button onClick={signOut} disabled={leaving} style={{
                flex: 1, height: 48, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: 'linear-gradient(135deg, var(--tt-red) 0%, var(--tt-red-bright) 100%)',
                color: '#fff', fontSize: 15, fontWeight: 700, opacity: leaving ? 0.6 : 1,
                boxShadow: '0 8px 20px -6px rgba(200,16,46,.4)',
              }}>
                {leaving ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} style={{
            width: '100%', height: 52, borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--tt-red-tint)', color: 'var(--tt-red-text)',
            border: '1px solid rgba(200,16,46,.15)', fontSize: 15, fontWeight: 700,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
