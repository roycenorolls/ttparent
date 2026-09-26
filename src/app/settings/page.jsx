'use client';
import AppHeader from '@/components/AppHeader';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { accentAt } from '@/lib/playful';

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

      {/* Identity — light blue, like the daytime greeting on Home. */}
      <section style={{
        margin: '8px 16px 0', color: 'var(--tt-blue)', borderRadius: 28, padding: 20,
        position: 'relative', overflow: 'hidden', boxShadow: '0 5px 0 #CFDDFB',
        background: `radial-gradient(circle at 88% 22%, #FFCA05 0 5px, transparent 6px),
          radial-gradient(circle at 70% 82%, #E03248 0 4px, transparent 5px),
          linear-gradient(180deg, #BFDBFF 0%, #E3ECFF 100%)`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 20, flexShrink: 0, transform: 'rotate(-6deg)',
          background: 'var(--tt-yellow)', color: 'var(--tt-blue)', boxShadow: '0 4px 0 #D9A800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--tt-font-heading)', fontSize: 22, fontWeight: 700,
        }}>
          {initials(parent?.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 23, fontWeight: 700 }}>
            {parent ? `${parent.title || 'Ms.'} ${parent.name}` : '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            {parent?.member_id && (
              <span className="tt-sticker" style={{
                background: 'var(--tt-red-bright)', color: '#fff', boxShadow: '0 2px 0 #B0192D', fontSize: 13, transform: 'rotate(-3deg)',
              }}>
                #{parent.member_id}
              </span>
            )}
            {sinceDate && <span style={{ fontSize: 13.5, fontWeight: 700, color: '#4A5A8A' }}>Since {sinceDate}</span>}
          </div>
        </div>
      </section>

      {error && (
        <div style={{ margin: '16px 16px 0', padding: '10px 14px', background: 'var(--tt-red-tint)', color: 'var(--tt-red-text)', borderRadius: 16, fontSize: 13.5, fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* Face-match consent, one row per child. */}
      <div style={{ padding: '28px 20px 4px' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 21, fontWeight: 700, color: 'var(--tt-text)' }}>Photo privacy</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, fontWeight: 600, color: 'var(--tt-muted)', lineHeight: 1.5 }}>
          When enabled, your child's registration photo is used to suggest which
          photos they appear in on new class posts. Teachers always review and
          confirm every suggestion before it's shown to anyone. You can turn this
          off at any time.
        </p>
      </div>

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!data && !error && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tt-muted)' }}>Loading…</div>}

        {children?.map((child, i) => {
          const restricted = child.photo_restriction === 'yes';
          const on = child.face_match_consent === 'yes';
          const a = accentAt(i);
          return (
            <div key={child.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#fff', borderRadius: 22, padding: '14px 16px', boxShadow: `0 5px 0 ${a.soft}`,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 14, flexShrink: 0, transform: 'rotate(-6deg)',
                background: a.main, color: a.on,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--tt-font-heading)', fontSize: 15, fontWeight: 700,
              }}>
                {initials(`${child.firstname} ${child.lastname}`)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 17, color: 'var(--tt-text)', fontWeight: 600 }}>
                  {child.firstname} {child.lastname}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tt-muted)', marginTop: 2 }}>
                  {restricted
                    ? "Photo use is restricted — face matching isn't available."
                    : on ? 'Face matching on' : 'Face matching off'}
                </div>
              </div>
              <button
                onClick={() => !restricted && toggle(child)}
                disabled={restricted || !!pending[child.id]}
                style={{
                  width: 54, height: 32, borderRadius: 16, border: 'none', flexShrink: 0,
                  background: on && !restricted ? 'var(--tt-blue-bright)' : '#DCE3F2',
                  boxShadow: on && !restricted ? 'inset 0 -3px 0 #1C4FB3' : 'inset 0 -3px 0 #C5CEE2',
                  position: 'relative', cursor: restricted ? 'default' : 'pointer',
                  opacity: pending[child.id] ? 0.6 : 1, transition: 'background .2s',
                }}
                aria-label={`Face-match consent for ${child.firstname}`}
                aria-pressed={on}
              >
                <span style={{
                  position: 'absolute', top: 3, left: on ? 25 : 3,
                  width: 26, height: 26, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 2px 0 rgba(0,0,0,.15)', transition: 'left .35s cubic-bezier(.34,1.56,.64,1)',
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
            background: '#fff', borderRadius: 24, padding: 18, boxShadow: '0 5px 0 #FFD0D7', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 19, fontWeight: 600, color: 'var(--tt-text)' }}>Sign out of TT Parents?</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tt-muted)', margin: '4px 0 16px' }}>
              You'll need your email and password to sign back in.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(false)} disabled={leaving} className="tt-press" style={{
                flex: 1, height: 48, borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--tt-font-heading)',
                background: '#F6F7FB', color: 'var(--tt-text)', border: 'none', fontSize: 16, fontWeight: 600,
                '--tt-edge': '#E4E8F2',
              }}>
                Cancel
              </button>
              <button onClick={signOut} disabled={leaving} className="tt-press" style={{
                flex: 1, height: 48, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--tt-font-heading)',
                background: 'var(--tt-red-bright)', color: '#fff', fontSize: 16, fontWeight: 600, opacity: leaving ? 0.6 : 1,
                '--tt-edge': '#B0192D',
              }}>
                {leaving ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="tt-press" style={{
            width: '100%', height: 52, borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--tt-font-heading)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--tt-red-tint)', color: 'var(--tt-red)', border: 'none', fontSize: 17, fontWeight: 600,
            '--tt-edge': '#FFC2CB',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
