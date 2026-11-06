import { useEffect, useRef } from 'react';

// Calls `onRefresh` when the page is pulled down from the top, or when the
// bottom nav fires 'tt:refresh' (tapping the tab you are already on).
export default function usePullToRefresh(onRefresh) {
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    let y0 = null, pulled = 0;
    const start = e => { y0 = window.scrollY <= 0 ? e.touches[0].clientY : null; pulled = 0; };
    const move  = e => { if (y0 !== null) pulled = e.touches[0].clientY - y0; };
    const end   = () => { if (y0 !== null && pulled > 80) cb.current(); y0 = null; };
    const fire  = () => cb.current();
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    window.addEventListener('tt:refresh', fire);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('tt:refresh', fire);
    };
  }, []);
}
