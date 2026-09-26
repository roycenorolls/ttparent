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
      background: 'rgba(255,249,236,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      padding: 'calc(12px + env(safe-area-inset-top)) 20px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 15, flexShrink: 0, background: '#fff',
        boxShadow: '0 3px 0 rgba(0,48,135,.15)', transform: 'rotate(-6deg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TutorTimeMark size={28} />
      </div>
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--tt-font-heading)',
          fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--tt-blue)',
        }}>
          TUTOR TIME
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {['#E03248', '#FFCA05', '#2F6FE4'].map(c => (
              <span key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
            ))}
          </span>
        </div>
        <h1 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 24, fontWeight: 700, color: 'var(--tt-text)', lineHeight: 1.1 }}>
          {title}
        </h1>
      </div>
    </header>
  );
}
