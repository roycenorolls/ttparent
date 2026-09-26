import { formatTime, parseTime } from '@/lib/time';
import { accentAt } from '@/lib/playful';
import { PostCard, ReminderList } from '@/components/UpdatesFeed';

/**
 * The child's day: a full-width status card (arrival, and who dropped them
 * off), then a dotted rail with today's class posts in time order and
 * pick-up (and who collected them).
 *
 * The person named is whoever actually carried the child in or out — often a
 * driver or grandparent rather than the parent reading this — so each end of
 * the day names its own person. The API sends the drop-off name as `by_name`
 * while the child is at school and as `in_by` once they've been collected.
 *
 * TutorTime records a vacation or a postponed start — never a sick day — so the
 * absent text makes no guess about why.
 */

const GREEN  = { border: '#86EFAC', edge: '#DCFCE7', art: '#DCFCE7', chip: '#22A559', chipInk: '#fff', chipEdge: '#15803D' };
const YELLOW = { border: '#FFCA05', edge: '#FFF3C4', art: '#FFF3C4', chip: '#FFCA05', chipInk: '#003087', chipEdge: '#D9A800' };

function minutesOf(iso) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export default function DayTimeline({ child, status, updates, reminders }) {
  const data  = status || {};
  const name  = child?.firstname || 'Your child';
  const state = data.state || 'before';

  // The status card always leads; the rail below holds the rest of the day.
  const arrival = state === 'checkedin' || state === 'checkedout' ? 'checkin' : state === 'absent' ? 'absent' : 'before';

  const items = [];
  if (state === 'checkedout') {
    items.push({ kind: 'checkout', t: data.checkout_time ? parseTime(data.checkout_time) : Infinity });
  }
  (updates || []).forEach(u => items.push({ kind: 'post', u, t: minutesOf(u.created_at) }));
  if (state === 'checkedin') items.push({ kind: 'pickup', t: Infinity });
  items.sort((a, b) => a.t - b.t);

  let post = 0; // post cards cycle red → yellow → blue
  const rail = (
    <div style={{ position: 'relative', margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ position: 'absolute', left: 13, top: 20, bottom: 20, borderLeft: '3px dotted #F0C85A' }} />
      {items.map((it, i) => {
        const accent = it.kind === 'post' ? post++ : 0;
        return (
          <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Node kind={it.kind} accent={accent} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {it.kind === 'post'
                ? <PostCard u={it.u} accent={accent} />
                : <EventCard kind={it.kind} name={name} data={data} />}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ margin: '0 16px' }}>
        <EventCard kind={arrival} name={name} data={data} />
      </div>
      {/* Pinned reminders sit directly under the status card, before the posts. */}
      <ReminderList updates={reminders} />
      {items.length > 0 && rail}
    </div>
  );
}

function Node({ kind, accent }) {
  if (kind === 'post') {
    return <div style={{ width: 29, height: 29, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 14, height: 14, borderRadius: '50%', background: accentAt(accent).main, boxShadow: '0 0 0 4px var(--tt-page)' }} />
    </div>;
  }
  if (kind === 'pickup') {
    return <div style={{ width: 29, height: 29, flexShrink: 0, borderRadius: '50%', background: 'var(--tt-page)', border: '2.5px dashed #F0C85A' }} />;
  }
  // checkout
  return (
    <div style={{
      width: 29, height: 29, flexShrink: 0, borderRadius: '50%', background: '#22A559', color: '#fff',
      boxShadow: '0 3px 0 #15803D', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <HomeIcon />
    </div>
  );
}

function EventCard({ kind, name, data }) {
  const at = t => (t ? formatTime(t) : null);
  const person = (label, who) => (who ? `${label} ${who}` : null);

  const E = {
    before: {
      c: YELLOW, chip: 'Scheduled', art: 'school',
      title: `We're waiting for ${name} at school`,
      lines: [`Drop-off opens at ${data.open_time ? formatTime(data.open_time) : '7:30 AM'}${data.class_name ? ` · ${data.class_name}` : ''}`],
    },
    absent: {
      c: YELLOW, chip: 'Away', art: 'sun',
      title: data.reason === 'vacation' ? `${name} is away today` : `${name} isn't expected today`,
      lines: [data.reason === 'vacation' ? 'Enjoy the break — see you when you’re back' : 'We’ll see you when term starts'],
    },
    checkin: {
      c: GREEN, chip: 'At school', art: 'school',
      title: `${name} arrived at school`,
      lines: [at(data.checkin_time), person('Dropped off by', data.by_name || data.in_by)],
    },
    checkout: {
      c: GREEN, chip: 'Home safe', art: 'home',
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

  if (!E.c) {
    return (
      <div style={{ borderRadius: 22, padding: 14, border: '2.5px dashed #F0C85A' }}>
        <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 16, fontWeight: 600, color: 'var(--tt-muted)' }}>{E.title}</div>
        {lines.map((l, i) => <div key={i} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tt-muted)', marginTop: 2 }}>{l}</div>)}
      </div>
    );
  }

  return (
    <div className="tt-pop-in" style={{
      position: 'relative', background: '#fff', borderRadius: 24, padding: 16,
      border: `2.5px solid ${E.c.border}`, boxShadow: `0 5px 0 ${E.c.edge}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span className="tt-sticker" style={{
        position: 'absolute', top: -12, right: 14, background: E.c.chip, color: E.c.chipInk, boxShadow: `0 2px 0 ${E.c.chipEdge}`,
      }}>
        {E.chip}
      </span>
      <Art kind={E.art} bg={E.c.art} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 18, fontWeight: 600, color: 'var(--tt-text)', lineHeight: 1.2 }}>{E.title}</div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 14, color: 'var(--tt-muted)', fontWeight: 600, marginTop: 3 }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

// Little drawings for the status card: the school, home, or a holiday sun.
function Art({ kind, bg }) {
  return (
    <svg width="58" height="58" viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="32" cy="32" r="30" fill={bg} />
      {kind === 'school' && <>
        <path d="M14 30 L32 16 L50 30 V48 H14z" fill="#E03248" />
        <path d="M10 31 L32 13 L54 31" fill="none" stroke="#003087" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="27" y="36" width="10" height="12" rx="2" fill="#FFCA05" />
        <rect x="18" y="33" width="6" height="6" rx="1.5" fill="#fff" /><rect x="40" y="33" width="6" height="6" rx="1.5" fill="#fff" />
        <circle cx="32" cy="26" r="3" fill="#FFCA05" />
      </>}
      {kind === 'home' && <>
        <path d="M16 31 L32 18 L48 31 V48 H16z" fill="#FFCA05" />
        <path d="M12 32 L32 15 L52 32" fill="none" stroke="#E03248" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="27" y="36" width="10" height="12" rx="2" fill="#2F6FE4" />
        <path d="M32 24.5c-1.6-2.2-5-1-5 1.4 0 2.2 5 5 5 5s5-2.8 5-5c0-2.4-3.4-3.6-5-1.4z" fill="#E03248" />
      </>}
      {kind === 'sun' && <>
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="32" y1="12" x2="32" y2="17" stroke="#FFCA05" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${i * 45} 32 32)`} />
        ))}
        <circle cx="32" cy="32" r="11" fill="#FFCA05" />
      </>}
    </svg>
  );
}

/* Inline SVG rather than emoji — emoji render inconsistently across Android
   and can't inherit the accent colour. */
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" />
    </svg>
  );
}
