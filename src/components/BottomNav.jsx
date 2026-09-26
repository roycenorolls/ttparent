'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Sparkles from '@/components/Sparkles';

// Each tab has its own colour: active fill, its edge, idle stroke, idle tint, label.
const tabs = [
  { href: '/',         label: 'Home',     icon: HomeIcon,     c: ['#003087', '#001E57', '#003087', '#DCE7FF', '#003087'] },
  { href: '/gallery',  label: 'Gallery',  icon: GalleryIcon,  c: ['#E03248', '#B0192D', '#E03248', '#FFE0E5', '#E03248'] },
  { href: '/card',     label: 'Card',     icon: CardIcon,     c: ['#FFCA05', '#D9A800', '#003087', '#FFF0B3', '#003087'], yellow: true },
  { href: '/schedule', label: 'Schedule', icon: ScheduleIcon, c: ['#2F6FE4', '#1C4FB3', '#2F6FE4', '#E3ECFF', '#2F6FE4'] },
  { href: '/settings', label: 'Profile',  icon: ProfileIcon,  c: ['#E03248', '#B0192D', '#E03248', '#FFE0E5', '#E03248'] },
];

/**
 * Docked "jelly bubble" nav: two-tone icons in their own colours; the
 * current tab pops up out of the bar as a coloured bubble and wobbles
 * (CSS in globals.css), with sparkles when the parent taps into it.
 */
export default function BottomNav() {
  const path = usePathname();
  const [tap, setTap] = useState({ href: null, n: 0 });

  // Sign-in is a full-bleed screen with nowhere to navigate to yet.
  if (path === '/login') return null;
  return (
    <nav className="tt-nav">
      {tabs.map(({ href, label, icon: Icon, c: [c, cs, s, t, lc], yellow }) => {
        const active = path === href || (href !== '/' && path.startsWith(href));
        return (
          <Link
            key={href} href={href} aria-current={active ? 'page' : undefined}
            className={`tt-tab${yellow ? ' is-yellow' : ''}`}
            onClick={() => !active && setTap(p => ({ href, n: p.n + 1 }))}
            style={{ '--c': c, '--cs': cs, '--s': s, '--t': t, '--lc': lc }}
          >
            <span className="tt-tab-ic">
              <Icon />
              {active && tap.href === href && <Sparkles key={tap.n} radius={36} />}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const svg = {
  width: 23, height: 23, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2.3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
};

function HomeIcon() {
  return <svg {...svg}><path className="tt-fill" d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" /></svg>;
}

function GalleryIcon() {
  return (
    <svg {...svg}>
      <rect className="tt-fill" x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function CardIcon() {
  return <svg {...svg}><rect className="tt-fill" x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" /></svg>;
}

function ScheduleIcon() {
  return <svg {...svg}><rect className="tt-fill" x="3" y="4" width="18" height="17" rx="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}

function ProfileIcon() {
  return <svg {...svg}><circle className="tt-fill" cx="12" cy="8" r="4" /><path className="tt-fill" d="M4 21a8 8 0 0116 0z" /></svg>;
}
