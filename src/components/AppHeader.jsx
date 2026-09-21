import TutorTimeMark from '@/components/TutorTimeMark';

/**
 * Shared top bar: TT mark in a round tile, "TUTOR TIME •" eyebrow and the page
 * title. Sticky, frosted cream so content scrolls under it.
 *
 * The mark keeps its fixed brand colours, so it sits on a white tile rather
 * than the navy one in the mock.
 */
export default function AppHeader({ title }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(253,251,247,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid #F1ECE1', boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: '#fff',
        boxShadow: '0 0 0 1px #EAE3D2, 0 1px 3px rgba(10,58,130,.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TutorTimeMark size={24} />
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#0A3A82' }}>
          TUTOR TIME <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFC72C' }} />
        </div>
        <h1 style={{ margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 17, fontWeight: 700, color: '#131B2E', lineHeight: 1.2 }}>
          {title}
        </h1>
      </div>
    </header>
  );
}
