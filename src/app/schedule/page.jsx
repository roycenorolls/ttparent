'use client';
import AppHeader from '@/components/AppHeader';
import ChildSwitcher from '@/components/ChildSwitcher';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTime, nowMinutes, parseTime } from '@/lib/time';

const NAVY  = '#0A3A82';
const MUTED = 'var(--tt-muted)';

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
    <div style={{ minHeight: '100dvh', paddingBottom: 24 }}>
      <AppHeader title="Weekly Schedule" />

      <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
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
            <div style={{ background: '#fff', borderRadius: 28, padding: '14px 12px 16px', boxShadow: '0 5px 0 rgba(0,48,135,.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 12px' }}>
                <span style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 18, fontWeight: 600, color: 'var(--tt-text)' }}>
                  📅 {monday?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                {monday && (
                  <span className="tt-sticker" style={{ background: 'var(--tt-yellow)', color: 'var(--tt-blue)', boxShadow: '0 2px 0 #D9A800' }}>
                    Week {isoWeek(monday)}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {days.map(d => (
                  <DayCell key={d.date} day={d} on={d.date === selected} isToday={d.date === today} onClick={() => setSelected(d.date)} />
                ))}
              </div>
            </div>

            {day && isToday && <HappeningNow slots={day.slots} />}

            {/* Timeline */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 21, fontWeight: 700, color: 'var(--tt-text)' }}>
                {isToday ? "Today's Timeline" : `${day ? parseDate(day.date).toLocaleDateString('en-US', { weekday: 'long' }) : ''}'s Timeline`}
              </h2>
              <span style={{
                fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--tt-blue)',
                background: 'var(--tt-blue-tint)', padding: '4px 12px', borderRadius: 999,
              }}>
                {day?.slots.length || 0} Activities
              </span>
            </div>

            {!day?.slots.length ? (
              <Message>Nothing planned for this day ☁️</Message>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'absolute', left: 26, top: 18, bottom: 18, borderLeft: '3px dotted #F0C85A' }} />
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

// A toy key per weekday: the selected day sticks up in blue, today is yellow.
function DayCell({ day, on, isToday, onClick }) {
  const date = parseDate(day.date);
  const dots = Math.min(3, Math.ceil(day.slots.length / 3));
  return (
    <button onClick={onClick} aria-pressed={on} className="tt-press" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', cursor: 'pointer',
      borderRadius: 18, border: 'none', fontFamily: 'inherit',
      background: on ? NAVY : isToday ? 'var(--tt-yellow-tint)' : '#F6F7FB',
      color: on ? '#fff' : 'var(--tt-text)',
      transform: on ? 'translateY(-3px)' : 'none',
      '--tt-edge': on ? '#001E57' : isToday ? '#FFE07A' : '#E4E8F2',
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: on ? 'rgba(255,255,255,.8)' : MUTED }}>
        {WEEKDAYS[date.getDay()]}
      </span>
      <span style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 21, fontWeight: 700, margin: '1px 0 2px' }}>{date.getDate()}</span>
      <span style={{ display: 'flex', gap: 2, height: 6 }}>
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: ['#E03248', '#FFCA05', '#2F6FE4'][i] }} />
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
    <div className="tt-pop-in" style={{
      position: 'relative', borderRadius: 26, padding: '20px 16px 16px', color: 'var(--tt-blue)',
      background: 'linear-gradient(180deg, #BFDBFF 0%, #E3ECFF 100%)', boxShadow: '0 5px 0 #CFDDFB',
    }}>
      <span className="tt-sticker" style={{
        position: 'absolute', top: -12, left: 16, display: 'flex', alignItems: 'center', gap: 6, transform: 'rotate(-3deg)',
        background: 'var(--tt-red-bright)', color: '#fff', boxShadow: '0 2px 0 #B0192D',
      }}>
        <span className="tt-react-dot" style={{ position: 'static', width: 9, height: 9, border: 'none', background: '#fff' }} />
        Happening now
      </span>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 14, fontWeight: 600, color: '#4A5A8A' }}>
            {formatTime(current.start_time)} – {formatTime(current.end_time)}
          </div>
          <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginTop: 2 }}>{current.activity}</div>
          {current.description && (
            <div style={{ fontSize: 14, fontWeight: 600, color: '#4A5A8A', marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {current.description}
            </div>
          )}
        </div>
        <div style={{
          width: 54, height: 54, borderRadius: 18, flexShrink: 0, background: '#fff', transform: 'rotate(6deg)',
          boxShadow: '0 4px 0 rgba(0,48,135,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
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
        position: 'relative', zIndex: 1, width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
        background: now ? NAVY : done ? '#22A559' : kind.bg,
        boxShadow: now ? '0 0 0 4px #FFF3C4, 0 3px 0 4px #FFE07A' : done ? '0 3px 0 #15803D' : '0 3px 0 rgba(0,0,0,.08)',
        color: '#fff', fontWeight: 800,
      }}>
        {done ? '✓' : now ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '3px solid #fff' }} /> : kind.icon}
      </div>

      <div style={{
        flex: 1, minWidth: 0, background: '#fff', borderRadius: 20, padding: '12px 14px',
        border: now ? '2.5px solid var(--tt-blue-bright)' : '2.5px solid transparent',
        boxShadow: now ? '0 5px 0 #CFDDFB' : '0 4px 0 rgba(0,48,135,.07)',
        opacity: done ? 0.75 : 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: now ? NAVY : MUTED }}>
            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
          </span>
          <span className="tt-sticker" style={{
            fontSize: 11, padding: '3px 9px', transform: 'rotate(2deg)',
            ...(now  ? { background: NAVY, color: '#fff' }
              : done ? { background: '#DCFCE7', color: '#15803D' }
              :        { background: kind.bg, color: kind.ink }),
          }}>
            {now ? 'Active now' : done ? 'Completed' : kind.label}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--tt-font-heading)', fontSize: now ? 18 : 17, fontWeight: 600, color: now ? NAVY : 'var(--tt-text)', marginTop: 4 }}>
          {slot.activity}
        </div>
        {slot.description && (
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tt-muted)', marginTop: 2, lineHeight: 1.45 }}>{slot.description}</div>
        )}
      </div>
    </div>
  );
}

function Message({ children }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: MUTED, fontFamily: 'var(--tt-font-heading)', fontSize: 17, fontWeight: 600 }}>
      {children}
    </div>
  );
}
