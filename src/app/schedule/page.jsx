'use client';
import AppHeader from '@/components/AppHeader';
import ChildSwitcher from '@/components/ChildSwitcher';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTime, nowMinutes, parseTime } from '@/lib/time';

const NAVY  = '#0A3A82';
const LINE  = '#EAE3D2';
const MUTED = '#8C8476';

// Chip, tint and emoji per part of the day, keyed by the planner's slot code.
const KINDS = {
  arrival:        { label: 'Arrival',       icon: '🎒', bg: '#FFF3D6', ink: '#8C5300' },
  morning_circle: { label: 'Circle Time',   icon: '🎶', bg: '#FFF3D6', ink: '#8C5300' },
  small_group:    { label: 'Small Group',   icon: '🧩', bg: '#EBF2FA', ink: NAVY },
  centers:        { label: 'Learning Centers', icon: '🎨', bg: '#FFEBEE', ink: '#D32F2F' },
  outdoor:        { label: 'Outdoor Play',  icon: '⚽', bg: '#E8F5E9', ink: '#2E7D32' },
  playground:     { label: 'Playground',    icon: '🛝', bg: '#E8F5E9', ink: '#2E7D32' },
  read_aloud:     { label: 'Storytime',     icon: '📚', bg: '#FFEBEE', ink: '#D32F2F' },
  meal:           { label: 'Lunch',         icon: '🍎', bg: '#FFF3D6', ink: '#8C5300' },
  closing_circle: { label: 'Goodbye',       icon: '👋', bg: '#EBF2FA', ink: NAVY },
};
const FALLBACK = { label: 'Activity', icon: '📖', bg: '#EBF2FA', ink: NAVY };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function localDateString(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ISO-8601 week number.
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export default function SchedulePage() {
  const [children, setChildren] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [days,     setDays]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [failed,   setFailed]   = useState(false);

  const today = localDateString();

  useEffect(() => {
    api.membership()
      .then(d => {
        setChildren(d.children || []);
        if (d.children?.length) setActiveId(d.children[0].id);
        else setLoading(false);
      })
      .catch(() => { setFailed(true); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    api.scheduleWeek(activeId)
      .then(d => {
        const list = d.days || [];
        setDays(list);
        setFailed(false);
        // Open on today; at the weekend fall back to Monday.
        setSelected(s => s && list.some(x => x.date === s) ? s : (list.find(x => x.date === today) || list[0])?.date ?? null);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [activeId, today]);

  const day     = days.find(d => d.date === selected);
  const isToday = selected === today;
  const monday  = days[0] && parseDate(days[0].date);

  return (
    <div style={{ background: '#FDFBF7', minHeight: '100dvh', paddingBottom: 24 }}>
      <AppHeader title="Weekly Schedule" />

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ChildSwitcher children={children} activeId={activeId} onChange={setActiveId} />

        {loading ? (
          <Message>Loading…</Message>
        ) : failed ? (
          <Message>Couldn't load the schedule. Please try again.</Message>
        ) : days.every(d => d.slots.length === 0) ? (
          <Message>🌱 The teachers haven't shared this week's plan yet.</Message>
        ) : (
          <>
            {/* Day strip */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 32, padding: 12, boxShadow: '0 4px 16px rgba(10,58,130,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px' }}>
                <span style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 16, fontWeight: 700, color: '#131B2E' }}>
                  📅 {monday?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                {monday && (
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 999, background: '#FFF3D6', color: '#8C5300' }}>
                    WEEK {isoWeek(monday)}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {days.map(d => (
                  <DayCell key={d.date} day={d} on={d.date === selected} isToday={d.date === today} onClick={() => setSelected(d.date)} />
                ))}
              </div>
            </div>

            {day && isToday && <HappeningNow slots={day.slots} />}

            {/* Timeline */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 18, fontWeight: 700, color: '#131B2E' }}>
                {isToday ? "Today's Timeline" : `${day ? parseDate(day.date).toLocaleDateString('en-US', { weekday: 'long' }) : ''}'s Timeline`}
              </h2>
              <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>
                {day?.slots.length || 0} Activities
              </span>
            </div>

            {!day?.slots.length ? (
              <Message>Nothing planned for this day ☁️</Message>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'absolute', left: 27, top: 16, bottom: 16, width: 2, background: LINE }} />
                {day.slots.map((slot, i) => (
                  <TimelineItem key={i} slot={slot} state={slotState(slot, selected, today)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 'done' | 'now' | 'upcoming', relative to the real clock.
function slotState(slot, date, today) {
  if (date < today) return 'done';
  if (date > today) return 'upcoming';
  const now = nowMinutes();
  if (now >= parseTime(slot.end_time)) return 'done';
  if (now >= parseTime(slot.start_time)) return 'now';
  return 'upcoming';
}

function DayCell({ day, on, isToday, onClick }) {
  const date = parseDate(day.date);
  const dots = Math.min(3, Math.ceil(day.slots.length / 3));
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', cursor: 'pointer',
      borderRadius: 16, fontFamily: 'inherit',
      background: on ? `linear-gradient(180deg, ${NAVY} 0%, #002266 100%)` : '#fff',
      color: on ? '#fff' : '#222',
      border: on ? 'none' : `1px solid ${isToday ? NAVY : LINE}`,
      boxShadow: on ? '0 4px 10px rgba(10,58,130,.25)' : '0 1px 2px rgba(0,0,0,.04)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: on ? 'rgba(255,255,255,.8)' : MUTED }}>
        {WEEKDAYS[date.getDay()]}
      </span>
      <span style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 19, fontWeight: 700, margin: '2px 0' }}>{date.getDate()}</span>
      <span style={{ display: 'flex', gap: 2, height: 6 }}>
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: on ? (i % 2 ? '#E53935' : '#FFC72C') : '#D4CDBC' }} />
        ))}
      </span>
    </button>
  );
}

function HappeningNow({ slots }) {
  const today   = localDateString();
  const current = slots.find(s => slotState(s, today, today) === 'now');
  if (!current) return null;
  const kind = KINDS[current.code] || FALLBACK;

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 16, padding: 16, color: '#fff',
      background: `linear-gradient(135deg, ${NAVY} 0%, #002266 100%)`, boxShadow: '0 4px 12px rgba(10,58,130,.25)',
    }}>
      <div style={{ position: 'absolute', right: -24, bottom: -24, width: 144, height: 144, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,199,44,.18) 0%, transparent 70%)' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: '#FFC72C', color: NAVY, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: NAVY }} />
          HAPPENING NOW
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>
          {formatTime(current.start_time)} – {formatTime(current.end_time)}
        </span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>{current.activity}</div>
          {current.description && (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {current.description}
            </div>
          )}
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25 }}>
          {kind.icon}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ slot, state }) {
  const kind = KINDS[slot.code] || FALLBACK;
  const now  = state === 'now';
  const done = state === 'done';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        position: 'relative', zIndex: 1, width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        background: now ? NAVY : done ? '#fff' : kind.bg,
        border: done ? `1px solid ${LINE}` : 'none',
        boxShadow: now ? '0 0 0 4px #FFF3D6' : '0 1px 2px rgba(0,0,0,.05)',
        color: '#10B981', fontWeight: 700,
      }}>
        {done ? '✓' : now ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '3px solid #fff' }} /> : kind.icon}
      </div>

      <div style={{
        flex: 1, minWidth: 0, background: '#fff', borderRadius: 16, padding: 12,
        border: now ? `2px solid ${NAVY}` : `1px solid ${LINE}`,
        boxShadow: now ? '0 4px 12px rgba(10,58,130,.12)' : '0 1px 2px rgba(0,0,0,.04)',
        opacity: done ? 0.9 : 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: now ? 12 : 11, fontWeight: now ? 700 : 600, color: now ? NAVY : MUTED }}>
            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
            ...(now  ? { background: NAVY, color: '#fff' }
              : done ? { background: '#E8F5E9', color: '#2E7D32' }
              :        { background: kind.bg, color: kind.ink }),
          }}>
            {now ? 'Active now' : done ? 'Completed' : kind.label}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: now ? 15 : 14, fontWeight: 700, color: now ? NAVY : '#131B2E', marginTop: 4 }}>
          {slot.activity}
        </div>
        {slot.description && (
          <div style={{ fontSize: 13, color: '#6B6355', marginTop: 2, lineHeight: 1.45 }}>{slot.description}</div>
        )}
      </div>
    </div>
  );
}

function Message({ children }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: MUTED, fontSize: 15 }}>
      {children}
    </div>
  );
}
