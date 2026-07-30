'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/',         label: 'Home',     icon: HomeIcon },
  { href: '/gallery',  label: 'Gallery',  icon: GalleryIcon },
  { href: '/card',     label: 'Card',     icon: CardIcon },
  { href: '/schedule', label: 'Schedule', icon: ScheduleIcon },
];

export default function BottomNav() {
  const path = usePathname();

  // Sign-in is a full-bleed screen with nowhere to navigate to yet.
  if (path === '/login') return null;

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--tt-surface)', borderTop: '1px solid var(--tt-border)',
      display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== '/' && path.startsWith(href));
        const color = active ? 'var(--tt-blue)' : 'var(--tt-placeholder)';
        return (
          <Link key={href} href={href} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3,
            padding: '9px 0 13px', textDecoration: 'none',
          }}>
            <Icon color={color} />
            <span style={{ fontSize: 10, color, fontWeight: active ? 500 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}

function GalleryIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  );
}

function CardIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  );
}

function ScheduleIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
