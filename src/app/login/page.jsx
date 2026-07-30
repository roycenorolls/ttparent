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
  const [school,   setSchool]   = useState(null);   // { label, has_password }
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
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

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
    <div className="tt-auth" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column',
                                      background: 'var(--tt-blue)' }}>
      <header style={{ padding: '38px 24px 30px' }}>
        <div style={{ marginBottom: 20 }}><TutorTimeMark onBlue /></div>
        <h1 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif',
                     fontSize: 23, fontWeight: 400, color: '#fff', lineHeight: 1.25 }}>
          {blocked ? 'Almost there' : 'Welcome back'}
        </h1>
        <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--tt-blue-soft)', lineHeight: 1.55 }}>
          {blocked
            ? 'One step left before you can sign in.'
            : 'Sign in with the email you gave your school.'}
        </p>
      </header>

      <div style={{ flex: 1, background: 'var(--tt-bg)',
                    borderRadius: 'var(--tt-radius-lg) var(--tt-radius-lg) 0 0',
                    padding: '26px 24px calc(28px + env(safe-area-inset-bottom))' }}>
        {blocked ? (
          <BlockedNotice school={school} onReset={() => { setSchool(null); setEmail(''); }} />
        ) : (
          <form onSubmit={submit} noValidate>
            {error && (
              <div role="alert" style={{ background: 'var(--tt-red-tint)',
                                         borderLeft: '3px solid var(--tt-red)',
                                         padding: '11px 13px', marginBottom: 18 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--tt-red-text)', lineHeight: 1.55 }}>
                  {error}
                </p>
              </div>
            )}

            <label className="tt-label" htmlFor="email">EMAIL</label>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--tt-yellow-tint)', borderRadius: 10,
                            padding: '9px 12px', marginTop: 10 }}>
                <PinIcon />
                <span style={{ fontSize: 12, color: 'var(--tt-yellow-text)' }}>
                  {school.school_label}
                </span>
              </div>
            )}

            <div style={{ height: 16 }} />

            <label className="tt-label" htmlFor="password">PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password" type={reveal ? 'text' : 'password'}
                autoComplete="current-password"
                className="tt-field" placeholder="Your app password"
                style={{ paddingRight: 44 }}
                value={password}
                aria-invalid={error ? 'true' : undefined}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 6, top: 0, bottom: 0, width: 36,
                         display: 'flex', alignItems: 'center', justifyContent: 'center',
                         background: 'none', border: 'none', cursor: 'pointer',
                         color: 'var(--tt-placeholder)' }}
              >
                <EyeIcon off={reveal} />
              </button>
            </div>

            <div style={{ height: 22 }} />

            <button type="submit" className="tt-btn-primary"
                    disabled={busy || !email.trim() || !password}>
              {busy ? 'Signing in…' : 'Continue'}
            </button>

            <p style={{ margin: '18px 0 0', fontSize: 11, color: 'var(--tt-muted)',
                        textAlign: 'center', lineHeight: 1.6 }}>
              No password yet? Ask your school&rsquo;s front desk.
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="21" x2="21" y2="3" />}
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
      <div style={{ background: 'var(--tt-yellow-tint)', borderLeft: '3px solid var(--tt-yellow)',
                    padding: 13, marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tt-yellow-text)', lineHeight: 1.6 }}>
          App access isn&rsquo;t switched on for this email yet. Ask the front desk at{' '}
          <span style={{ fontWeight: 500 }}>{school.school_label}</span> to set up your parent password.
        </p>
      </div>

      <Wrapper
        href={wa.href}
        aria-disabled={wa['aria-disabled']}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                 background: 'var(--tt-whatsapp)', borderRadius: 'var(--tt-radius)',
                 padding: 14, textDecoration: 'none', marginBottom: 11, ...(wa.style || {}) }}
      >
        <WhatsAppIcon />
        <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Message the school</span>
      </Wrapper>

      <button type="button" onClick={onReset}
              style={{ width: '100%', border: '1px solid var(--tt-border)',
                       borderRadius: 'var(--tt-radius)', padding: 13, background: 'none',
                       textAlign: 'center', fontSize: 13, color: 'var(--tt-muted)',
                       fontFamily: 'inherit', cursor: 'pointer' }}>
        Try a different email
      </button>
    </div>
  );
}
