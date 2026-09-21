import { formatTime, parseTime } from '@/lib/time';
import { PostCard, ReminderList } from '@/components/UpdatesFeed';

/**
 * The child's day on one rail: arrival (and who dropped them off), today's
 * class posts in time order, then pick-up (and who collected them).
 *
 * The person named is whoever actually carried the child in or out — often a
 * driver or grandparent rather than the parent reading this — so each end of
 * the day names its own person. The API sends the drop-off name as `by_name`
 * while the child is at school and as `in_by` once they've been collected.
 *
 * TutorTime records a vacation or a postponed start — never a sick day — so the
 * absent text makes no guess about why.
 */

const GREEN = { tint: '#DCFCE7', ink: '#15803D', border: '#BBF7D0' };
const AMBER = { tint: '#FEF3C7', ink: '#B45309', border: '#FDE68A' };

function minutesOf(iso) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export default function DayTimeline({ child, status, updates, reminders }) {
  const data  = status || {};
  const name  = child?.firstname || 'Your child';
  const state = data.state || 'before';

  const items = [];
  if (state === 'checkedin' || state === 'checkedout') {
    items.push({ kind: 'checkin', t: data.checkin_time ? parseTime(data.checkin_time) : -1 });
  } else {
    items.push({ kind: state === 'absent' ? 'absent' : 'before', t: -1 });
  }
  if (state === 'checkedout') {
    items.push({ kind: 'checkout', t: data.checkout_time ? parseTime(data.checkout_time) : Infinity });
  }
  (updates || []).forEach(u => items.push({ kind: 'post', u, t: minutesOf(u.created_at) }));
  if (state === 'checkedin') items.push({ kind: 'pickup', t: Infinity });

  // Arrival first, pick-up last, posts in the order they happened.
  const order = { checkin: 0, before: 0, absent: 0 };
  items.sort((a, b) => a.t - b.t || (order[a.kind] ?? 1) - (order[b.kind] ?? 1));

  const rail = list => (
    <div style={{ position: 'relative', margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ position: 'absolute', left: 13, top: 20, bottom: 20, width: 2, background: '#EAE3D2' }} />
      {list.map((it, i) => (
        <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Node kind={it.kind} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {it.kind === 'post'
              ? <PostCard u={it.u} />
              : <EventCard kind={it.kind} name={name} data={data} />}
          </div>
        </div>
      ))}
    </div>
  );

  // Pinned reminders sit directly under the arrival/status card, before the posts.
  if (!reminders?.length) return rail(items);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rail(items.slice(0, 1))}
      <ReminderList updates={reminders} />
      {items.length > 1 && rail(items.slice(1))}
    </div>
  );
}

function Node({ kind }) {
  const done   = kind === 'checkin' || kind === 'checkout';
  const waiting = kind === 'before' || kind === 'absent';
  const Icon = kind === 'checkout' ? HomeIcon : kind === 'absent' ? CalendarIcon : kind === 'before' ? ClockIcon : ShieldIcon;

  if (kind === 'post') {
    return <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#0A3A82', boxShadow: '0 0 0 4px #FDFBF7' }} />
    </div>;
  }
  if (kind === 'pickup') {
    return <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', background: '#FDFBF7', border: '2px dashed #D4CDBC' }} />;
  }
  const c = done ? GREEN : AMBER;
  return (
    <div style={{
      width: 28, height: 28, flexShrink: 0, borderRadius: '50%', background: c.tint, color: c.ink,
      boxShadow: '0 0 0 3px #FDFBF7', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon />
    </div>
  );
}

function EventCard({ kind, name, data }) {
  const at = t => (t ? formatTime(t) : null);
  const person = (label, who) => (who ? `${label} ${who}` : null);

  const E = {
    before: {
      c: AMBER, chip: 'Scheduled',
      title: `We're waiting for ${name} at school`,
      lines: [`Drop-off opens at ${data.open_time ? formatTime(data.open_time) : '7:30 AM'}${data.class_name ? ` · ${data.class_name}` : ''}`],
    },
    absent: {
      c: AMBER, chip: 'Away',
      title: data.reason === 'vacation' ? `${name} is away today` : `${name} isn't expected today`,
      lines: [data.reason === 'vacation' ? 'Enjoy the break — see you when you’re back' : 'We’ll see you when term starts'],
    },
    checkin: {
      c: GREEN, chip: 'At school',
      title: `${name} arrived at school`,
      lines: [at(data.checkin_time), person('Dropped off by', data.by_name || data.in_by)],
    },
    checkout: {
      c: GREEN, chip: 'Home safe',
      title: `${name} is home safe`,
      lines: [at(data.checkout_time), person('Collected by', data.out_by)],
    },
    pickup: {
      c: null, chip: null,
      title: 'Waiting for pick-up',
      lines: [`We’ll let you know when ${name} is collected`],
    },
  }[kind];

  const lines = E.lines.filter(Boolean);

  return (
    <div style={{
      background: E.c ? '#fff' : 'transparent', borderRadius: 20, padding: 14,
      border: E.c ? `1px solid ${E.c.border}` : '1px dashed #D4CDBC',
      boxShadow: E.c ? 'var(--tt-shadow-soft)' : 'none',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: E.c ? '#0F172A' : '#8C8476', lineHeight: 1.3 }}>{E.title}</div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginTop: 2 }}>{l}</div>
        ))}
      </div>
      {E.chip && (
        <span style={{
          flexShrink: 0, padding: '3px 8px', borderRadius: 8, textTransform: 'uppercase',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          color: E.c.ink, background: E.c.tint, border: `1px solid ${E.c.border}`,
        }}>
          {E.chip}
        </span>
      )}
    </div>
  );
}

/* Inline SVG rather than emoji — emoji render inconsistently across Android
   and can't inherit the accent colour. */
const stroke = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
};

function ClockIcon()    { return <svg {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function ShieldIcon()   { return <svg {...stroke}><path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>; }
function HomeIcon()     { return <svg {...stroke}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>; }
function CalendarIcon() { return <svg {...stroke}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>; }
