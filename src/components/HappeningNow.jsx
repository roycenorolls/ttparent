'use client';
import { parseTime, nowMinutes, formatTime, isEvening } from '@/lib/time';

export default function HappeningNow({ slots }) {
  if (!slots?.length) return null;

  if (isEvening()) {
    return <RecapCard slots={slots} />;
  }

  const now = nowMinutes();
  const current = slots.find(s => {
    const start = parseTime(s.start_time);
    const end   = parseTime(s.end_time);
    return now >= start && now < end;
  });

  const nextSlot = current
    ? slots.find(s => parseTime(s.start_time) > now)
    : slots.find(s => parseTime(s.start_time) > now);

  if (!current) {
    return nextSlot ? <UpcomingCard slot={nextSlot} /> : null;
  }

  const start    = parseTime(current.start_time);
  const end      = parseTime(current.end_time);
  const elapsed  = now - start;
  const duration = end - start;
  const progress = Math.min(100, Math.round((elapsed / duration) * 100));

  return (
    <div style={{ margin: '0 16px', background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--tt-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tt-blue)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Happening Now
        </span>
        {/* Red is reserved for failure everywhere else, but a live dot is the
            one place the convention outranks that. */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--tt-red)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--tt-red)', display: 'inline-block' }} />
          LIVE
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--tt-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {current.icon || '📚'}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--tt-text)' }}>{current.activity}</div>
          <div style={{ fontSize: 12, color: 'var(--tt-muted)', marginTop: 2 }}>
            {formatTime(current.start_time)} – {formatTime(current.end_time)}
            {current.description ? ` · ${current.description}` : ''}
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: 'var(--tt-blue-tint)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--tt-blue)', borderRadius: 2, transition: 'width 1s' }} />
      </div>

      {nextSlot && (
        <div style={{ fontSize: 11, color: 'var(--tt-muted)', marginTop: 8 }}>
          Up next: {nextSlot.activity} at {formatTime(nextSlot.start_time)}
        </div>
      )}
    </div>
  );
}

function RecapCard({ slots }) {
  const shown = slots.slice(0, 3);
  return (
    <div style={{ margin: '0 16px', background: 'var(--tt-yellow-tint)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tt-yellow-text)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        Today's Activities
      </div>
      {shown.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{s.icon || '📖'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tt-text)' }}>{s.activity}</div>
            {s.description && <div style={{ fontSize: 11, color: 'var(--tt-yellow-text)' }}>{s.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingCard({ slot }) {
  return (
    <div style={{ margin: '0 16px', background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--tt-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tt-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Up Next
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--tt-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {slot.icon || '📚'}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--tt-text)' }}>{slot.activity}</div>
          <div style={{ fontSize: 12, color: 'var(--tt-muted)' }}>Starts at {formatTime(slot.start_time)}</div>
        </div>
      </div>
    </div>
  );
}
