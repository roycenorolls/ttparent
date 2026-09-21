'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatTime, nowMinutes, parseTime } from '@/lib/time';
import ChildSwitcher from '@/components/ChildSwitcher';

// One friendly colour + emoji per part of the day, keyed by the planner's slot code.
const LOOKS = {
  arrival:        { icon: '🎒', bg: '#FFF1BF', ink: '#8A5A00' },
  morning_circle: { icon: '🎶', bg: '#FFE1D2', ink: '#B4400A' },
  small_group:    { icon: '🧩', bg: '#EADFFB', ink: '#6528C8' },
  centers:        { icon: '🎨', bg: '#D8E8FF', ink: '#1A4FC4' },
  playground:     { icon: '🛝', bg: '#D6F3DF', ink: '#137A3A' },
  outdoor:        { icon: '⚽', bg: '#D6F3DF', ink: '#137A3A' },
  read_aloud:     { icon: '📚', bg: '#FFDDE9', ink: '#B4155B' },
  meal:           { icon: '🍎', bg: '#D3F1EC', ink: '#0C6E63' },
  closing_circle: { icon: '👋', bg: '#E1E6FF', ink: '#3F35C2' },
};
const FALLBACK = { icon: '📖', bg: '#E6EDF7', ink: '#003087' };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function localDateString(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function SchedulePage() {
  const [children, setChildren] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [days,     setDays]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [failed,   setFailed]   = useState(false);
  const todayRef = useRef(null);

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
      .then(d => { setDays(d.days || []); setFailed(false); })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [activeId]);

  // Bring today into view (matters on Thu/Fri, when the list is taller than the screen).
  useEffect(() => {
    if (!loading) todayRef.current?.scrollIntoView({ block: 'start' });
  }, [loading, days]);

  const monday = days[0] && parseDate(days[0].date);
  const friday = days[4] && parseDate(days[4].date);
  const range = monday && friday
    ? `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${friday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : null;

  return (
    <div style={{ paddingTop: 20, paddingBottom: 24 }}>
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          fontFamily: 'var(--tt-font-heading)', fontSize: 28, fontWeight: 800,
          letterSpacing: '-0.02em', color: 'var(--tt-blue)',
        }}>
          This week ☀️
        </div>
        {range && <div style={{ fontSize: 14, color: 'var(--tt-muted)', marginTop: 2 }}>{range}</div>}
      </div>

      {children.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <ChildSwitcher children={children} activeId={activeId} onChange={setActiveId} />
        </div>
      )}

      {loading ? (
        <Message>Loading…</Message>
      ) : failed ? (
        <Message>Couldn't load the schedule. Please try again.</Message>
      ) : days.every(d => d.slots.length === 0) ? (
        <Message>🌱 The teachers haven't shared this week's plan yet.</Message>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {days.map(day => {
            const date    = parseDate(day.date);
            const isToday = day.date === today;
            const isPast  = day.date < today;
            return (
              <div
                key={day.date}
                ref={isToday ? todayRef : null}
                style={{ display: 'flex', gap: 10, padding: '0 16px', scrollMarginTop: 12, opacity: isPast ? 0.6 : 1 }}
              >
                <div style={{ width: 46, flexShrink: 0, textAlign: 'center', paddingTop: 2 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                    color: isToday ? 'var(--tt-blue)' : 'var(--tt-muted)',
                  }}>
                    {WEEKDAYS[date.getDay()]}
                  </div>
                  <div style={{
                    width: 40, height: 40, margin: '4px auto 0', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--tt-font-heading)', fontSize: 20, fontWeight: 800,
                    background: isToday ? 'var(--tt-yellow)' : 'transparent',
                    color: isToday ? 'var(--tt-blue-deep)' : 'var(--tt-text)',
                    boxShadow: isToday ? '0 4px 10px -2px rgba(239,172,67,0.6)' : 'none',
                  }}>
                    {date.getDate()}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {day.slots.length === 0 ? (
                    <div style={{ padding: '10px 4px', fontSize: 14, color: 'var(--tt-muted)' }}>
                      Nothing planned yet ☁️
                    </div>
                  ) : day.slots.map((slot, i) => (
                    <SlotCard key={i} slot={slot} isToday={isToday} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlotCard({ slot, isToday }) {
  const look = LOOKS[slot.code] || FALLBACK;
  const now  = isToday && nowMinutes() >= parseTime(slot.start_time) && nowMinutes() < parseTime(slot.end_time);

  return (
    <div style={{
      background: look.bg, borderRadius: 22, padding: '12px 14px',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      boxShadow: now ? `0 0 0 3px ${look.ink}` : 'none',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>
        {look.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: look.ink }}>
            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
          </span>
          {now && (
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              background: look.ink, color: '#fff', borderRadius: 999, padding: '2px 8px',
            }}>
              Now
            </span>
          )}
        </div>
        <div style={{
          fontFamily: 'var(--tt-font-heading)', fontSize: 17, fontWeight: 700,
          color: 'var(--tt-text)', marginTop: 2, lineHeight: 1.25,
        }}>
          {slot.activity}
        </div>
        {slot.description && (
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.45, marginTop: 4 }}>
            {slot.description}
          </div>
        )}
      </div>
    </div>
  );
}

function Message({ children }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--tt-muted)', fontSize: 14 }}>
      {children}
    </div>
  );
}
