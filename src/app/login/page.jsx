'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TutorTimeMark from '@/components/TutorTimeMark';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [reveal,   setReveal]   = useState(false);
  const [school,   setSchool]   = useState(null);   // { school_label, has_password, whatsapp }
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  // Resolve the branch from the email alone. Fires on blur so the parent sees
  // where they're signing in before committing a password.
  async function detectSchool() {
    const value = email.trim();
    if (!EMAIL_RE.test(value)) { setSchool(null); return; }

    try {
      const res  = await fetch('/api/auth/lookup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: value }),
      });
      const data = await res.json();
      setSchool(data.found ? data : null);
    } catch {
      setSchool(null); // detection is a nicety; never block sign-in on it
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        // Only 401 is genuinely the parent's fault. Blaming their password for
        // a server fault sends them to the front desk over an outage.
        if (res.status === 429) {
          setError('Too many attempts. Wait a minute, then try again.');
        } else if (res.status >= 500) {
          setError("We can't reach the school system right now. Please try again shortly.");
        } else {
          setError("We couldn't sign you in. Check your email and password, then try again.");
        }
        return;
      }
      router.replace('/');
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  // A recognised parent with no app password can never succeed here, so send
  // them to the school instead of letting them guess.
  const blocked = school && school.has_password === false;

  return (
    <div className="tt-auth">
      {/* Decorative colour fields behind the card. */}
      <span className="tt-orb" aria-hidden="true"
            style={{ top: '-12%', right: '-18%', width: 340, height: 340, background: 'var(--tt-blue)' }} />
      <span className="tt-orb" aria-hidden="true"
            style={{ bottom: '-10%', left: '-20%', width: 380, height: 380,
                     background: 'var(--tt-red)', animationDelay: '-3s' }} />
      <span className="tt-orb" aria-hidden="true"
            style={{ bottom: '12%', right: '-12%', width: 240, height: 240,
                     background: 'var(--tt-yellow)', animationDelay: '-6s' }} />

      {/* Logo on a white tile — the mark keeps its own red + amber. */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 76, height: 76, marginBottom: 26,
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,48,135,0.08)',
      }}>
        <TutorTimeMark size={42} />
      </div>

      <div className="tt-glass">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 className="tt-title">{blocked ? 'Almost there' : 'Welcome back'}</h1>
          <p className="tt-subtitle">
            {blocked ? 'One step left before you can sign in.' : 'Stay close to your loved ones'}
          </p>
          {!blocked && <p className="tt-eyebrow">Sign in with your school email</p>}
        </div>

        {blocked ? (
          <BlockedNotice school={school} onReset={() => { setSchool(null); setEmail(''); }} />
        ) : (
          <form onSubmit={submit} noValidate>
            {error && (
              <div role="alert" style={{
                background: 'var(--tt-red-tint)',
                border: '1px solid rgba(200,16,46,0.18)',
                borderRadius: 14, padding: '12px 14px', marginBottom: 22,
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--tt-red-text)', lineHeight: 1.5 }}>
                  {error}
                </p>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label className="tt-label" htmlFor="email">Email</label>
              <input
                id="email" type="email" inputMode="email" autoComplete="email"
                autoCapitalize="none" spellCheck="false"
                className="tt-field" placeholder="name@example.com"
                value={email}
                aria-invalid={error ? 'true' : undefined}
                onChange={(e) => { setEmail(e.target.value); setSchool(null); }}
                onBlur={detectSchool}
              />
              {school && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--tt-yellow-tint)', borderRadius: 10,
                  padding: '9px 12px', marginTop: 10,
                }}>
                  <PinIcon />
                  <span style={{ fontSize: 12, color: 'var(--tt-yellow-text)' }}>
                    {school.school_label}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 32 }}>
              <label className="tt-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" type={reveal ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="tt-field" placeholder="Your app password"
                  style={{ paddingRight: 48 }}
                  value={password}
                  aria-invalid={error ? 'true' : undefined}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 6, top: 0, bottom: 0, width: 40,
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           background: 'none', border: 'none', cursor: 'pointer',
                           color: 'rgba(84,110,122,0.5)' }}
                >
                  <EyeIcon off={reveal} />
                </button>
              </div>
            </div>

            <button type="submit" className="tt-btn-primary"
                    disabled={busy || !email.trim() || !password}>
              {busy ? 'Signing in…' : 'Continue'}
              {!busy && <ArrowIcon />}
            </button>

            <p style={{ margin: '28px 0 0', fontSize: 14, color: 'var(--tt-label)',
                        textAlign: 'center' }}>
              No password yet?{' '}
              <span style={{ color: 'var(--tt-red)', fontWeight: 700 }}>
                Contact front desk.
              </span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* Inline SVG rather than emoji — emoji glyphs vary wildly across Android
   builds and don't inherit colour. Matches the icon style in BottomNav. */
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
         stroke="var(--tt-yellow-text)" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function EyeIcon({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="21" x2="21" y2="3" />}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28z"/>
    </svg>
  );
}

function BlockedNotice({ school, onReset }) {
  // Front-desk numbers aren't configured yet (config/schools.php). The button
  // is in place per the design; it becomes a live wa.me link once a number
  // exists, and stays inert rather than opening a broken chat until then.
  const wa = school.whatsapp
    ? { as: 'a', href: `https://wa.me/${school.whatsapp}` }
    : { as: 'div', 'aria-disabled': 'true', style: { opacity: 0.55 } };
  const Wrapper = wa.as;

  return (
    <div>
      <div style={{ background: 'var(--tt-yellow-tint)',
                    border: '1px solid rgba(255,202,5,0.35)',
                    borderRadius: 14, padding: 14, marginBottom: 22 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--tt-yellow-text)', lineHeight: 1.6 }}>
          App access isn&rsquo;t switched on for this email yet. Ask the front desk at{' '}
          <span style={{ fontWeight: 700 }}>{school.school_label}</span> to set up your parent password.
        </p>
      </div>

      <Wrapper
        href={wa.href}
        aria-disabled={wa['aria-disabled']}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                 height: 56, background: 'var(--tt-whatsapp)', borderRadius: 999,
                 textDecoration: 'none', marginBottom: 12, ...(wa.style || {}) }}
      >
        <WhatsAppIcon />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff',
                       fontFamily: 'var(--tt-font-heading)' }}>Message the school</span>
      </Wrapper>

      <button type="button" onClick={onReset}
              style={{ width: '100%', height: 52, border: '1px solid rgba(84,110,122,0.25)',
                       borderRadius: 999, background: 'none',
                       fontSize: 14, color: 'var(--tt-label)',
                       fontFamily: 'inherit', cursor: 'pointer' }}>
        Try a different email
      </button>
    </div>
  );
}
