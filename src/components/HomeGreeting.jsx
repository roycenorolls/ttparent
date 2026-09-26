import { isEvening } from '@/lib/time';

/**
 * The Home greeting as a little scene: a light-blue sky with a sun, a cloud
 * and green hills by day; navy with the moon and twinkling stars at night.
 * `hasSwitcher` leaves room at the bottom for the child pills that overlap it.
 */
export default function HomeGreeting({ greeting, name, hasSwitcher }) {
  const night = isEvening();

  return (
    <section style={{
      position: 'relative', overflow: 'hidden', borderRadius: 30,
      padding: `22px 20px ${hasSwitcher ? 64 : 50}px`,
      background: night ? 'var(--tt-blue)' : 'linear-gradient(180deg, #BFDBFF 0%, #E3ECFF 100%)',
      color: night ? '#fff' : 'var(--tt-blue)',
    }}>
      {night ? <NightSky /> : <DaySky />}

      <h2 style={{
        position: 'relative', margin: 0, maxWidth: 'calc(100% - 64px)',
        fontFamily: 'var(--tt-font-heading)', fontSize: 28, fontWeight: 700, lineHeight: 1.15,
      }}>
        {greeting.text}
        {name && <>,<br />
          <span style={{ position: 'relative', whiteSpace: 'nowrap', color: night ? 'var(--tt-yellow)' : 'var(--tt-red-bright)' }}>
            {name}
            <svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true"
                 style={{ position: 'absolute', left: 0, bottom: -8, width: '100%', height: 10 }}>
              <path d="M2 6c10-6 18 6 28 0s18 6 28 0 18 6 28 0 18 6 28 0" fill="none"
                    stroke={night ? '#E03248' : '#FFCA05'} strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </span>
        </>}
      </h2>
      <p style={{
        position: 'relative', margin: '10px 0 0', fontSize: 15, fontWeight: 700,
        color: night ? 'rgba(255,255,255,.85)' : '#4A5A8A',
      }}>
        {greeting.sub}
      </p>

      <svg viewBox="0 0 390 60" preserveAspectRatio="none" aria-hidden="true"
           style={{ position: 'absolute', left: 0, right: 0, bottom: -1, width: '100%', height: 56 }}>
        {night ? (
          <path d="M0 34 Q 60 14 130 30 T 260 26 T 390 30 V60 H0z" fill="#2F6FE4" opacity=".55" />
        ) : (
          <>
            <path d="M0 30 Q 70 4 150 26 T 300 20 T 390 24 V60 H0z" fill="#A8DB8F" />
            <path d="M0 42 Q 90 20 190 38 T 390 34 V60 H0z" fill="#7CC66A" />
          </>
        )}
      </svg>
    </section>
  );
}

function DaySky() {
  return (
    <svg width="96" height="76" viewBox="0 0 96 76" aria-hidden="true" style={{ position: 'absolute', right: 10, top: 10 }}>
      {/* Sun with rays */}
      <g transform="translate(54 30)">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="0" y1="-24" x2="0" y2="-30" stroke="#FFCA05" strokeWidth="4" strokeLinecap="round"
                transform={`rotate(${i * 45})`} />
        ))}
        <circle r="18" fill="#FFCA05" />
        <circle cx="-6" cy="-5" r="4" fill="#fff" opacity=".45" />
      </g>
      {/* Cloud drifting in front of the sun */}
      <path d="M14 66h40a10 10 0 000-20 14 14 0 00-26-4 11 11 0 00-14 13 6 6 0 000 11z" fill="#fff" />
    </svg>
  );
}

// [x%, y px, size px, twinkle delay s]
const STARS = [
  [8, 14, 3, 0], [22, 70, 2, 1.2], [46, 10, 2.5, .6], [58, 58, 2, 1.8],
  [64, 20, 3, 1], [38, 86, 2, .3], [90, 76, 2.5, 1.5], [14, 96, 2, 2],
];

function NightSky() {
  return (
    <>
      {STARS.map(([x, y, r, delay], i) => (
        <span key={i} className="tt-twinkle" aria-hidden="true" style={{
          position: 'absolute', left: `${x}%`, top: y, width: r * 2, height: r * 2,
          borderRadius: '50%', background: i % 3 ? '#fff' : '#FFE27A', animationDelay: `${delay}s`,
        }} />
      ))}
      <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true" style={{ position: 'absolute', right: 16, top: 14 }}>
        <path d="M40 8a24 24 0 1 0 18 34A20 20 0 0 1 40 8z" fill="#FFCA05" />
        <path className="tt-twinkle" d="M12 38l1.8 3.6 3.6 1.8-3.6 1.8L12 48.8l-1.8-3.6-3.6-1.8 3.6-1.8z" fill="#fff" />
        <path className="tt-twinkle" style={{ animationDelay: '1.1s' }} d="M22 6l1.2 2.4 2.4 1.2-2.4 1.2L22 13.2l-1.2-2.4-2.4-1.2 2.4-1.2z" fill="#FFE27A" />
      </svg>
    </>
  );
}
