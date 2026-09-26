import TutorTimeMark from '@/components/TutorTimeMark';

/**
 * Shared top bar: TT mark on a tilted white tile, "TUTOR TIME" with red /
 * yellow / blue dots, and the page title. Sticky, frosted cream so content
 * scrolls under it.
 *
 * The mark keeps its fixed brand colours, so it always sits on a white tile.
 */
export default function AppHeader({ title }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(255,249,236,0.80)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      padding: 'calc(8px + var(--tt-safe-top)) 20px 8px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: '#fff',
        boxShadow: '0 3px 0 rgba(0,48,135,.15)', transform: 'rotate(-6deg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TutorTimeMark size={22} />
      </div>
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--tt-font-heading)',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--tt-blue)',
        }}>
          TUTOR TIME
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {['#E03248', '#FFCA05', '#2F6FE4'].map(c => (
              <span key={c} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
            ))}
          </span>
        </div>
        <h1 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--tt-text)', lineHeight: 1.1 }}>
          {title}
        </h1>
      </div>
    </header>
  );
}
