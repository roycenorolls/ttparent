import { formatTime } from '@/lib/time';

/**
 * The four states of the safety card, driven by the `checkinout` kiosk record.
 *
 * The subtitle names whoever actually carried the child in or out — often a
 * driver or grandparent rather than the parent reading this, and frequently a
 * different person at each end of the day, so both are shown.
 */
const STATES = {
  before: {
    icon: ClockIcon, tint: 'var(--tt-yellow-tint)', accent: 'var(--tt-yellow)',
    title: (c) => `We're waiting for ${c} at school`,
    sub:   (d) => `Drop-off opens at ${d.open_time ? formatTime(d.open_time) : '07:30'}`
                + `${d.class_name ? ` · ${d.class_name}` : ''}`,
  },
  checkedin: {
    icon: ShieldIcon, tint: 'var(--tt-green-tint)', accent: 'var(--tt-green)',
    title: (c) => `${c} is at school`,
    sub:   (d) => d.by_name
      ? `Dropped off at ${formatTime(d.checkin_time)} by ${d.by_name}`
      : `Dropped off at ${formatTime(d.checkin_time)}`,
  },
  checkedout: {
    icon: HomeIcon, tint: 'var(--tt-green-tint)', accent: 'var(--tt-green)',
    title: (c) => `${c} is home safe`,
    sub:   (d) => d.out_by
      ? `Collected at ${formatTime(d.checkout_time)} by ${d.out_by}`
      : `Dropped off ${formatTime(d.checkin_time)} · Checked out ${formatTime(d.checkout_time)}`,
  },
  absent: {
    icon: CalendarIcon, tint: 'var(--tt-yellow-tint)', accent: 'var(--tt-yellow)',
    title: (c, d) => d.reason === 'vacation'
      ? `${c} is away today`
      : `${c} isn't expected today`,
    // TutorTime records a vacation or a postponed start — never a sick day —
    // so "feel better soon" would be a guess about why the child is absent.
    sub: (d) => d.reason === 'vacation'
      ? 'Enjoy the break — see you when you’re back'
      : 'We’ll see you when term starts',
  },
};

export default function CheckInCard({ child, status }) {
  const data  = status || {};
  const state = STATES[data.state] || STATES.before;
  const name  = child?.firstname || 'Your child';
  const Icon  = state.icon;

  return (
    <div style={{
      margin: '0 16px', background: state.tint,
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: state.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--tt-text)', marginBottom: 2 }}>
          {state.title(name, data)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tt-muted)' }}>
          {state.sub(data)}
        </div>
      </div>
    </div>
  );
}

/* Inline SVG rather than emoji — emoji render inconsistently across Android
   and can't inherit the accent colour. */
const stroke = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff',
  strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': 'true',
};

function ClockIcon()    { return <svg {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function ShieldIcon()   { return <svg {...stroke}><path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>; }
function HomeIcon()     { return <svg {...stroke}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>; }
function CalendarIcon() { return <svg {...stroke}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>; }
