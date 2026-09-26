'use client';
import { useLayoutEffect } from 'react';

/**
 * Re-tags <html> with .tt-shell after hydration. The inline script in
 * layout.jsx tags it before first paint, but if hydration fails anywhere
 * React rebuilds the document and drops the class, bringing back the doubled
 * safe-area gap above the header.
 */
export default function ShellTag() {
  useLayoutEffect(() => {
    if (window.TTShell) document.documentElement.classList.add('tt-shell');
  }, []);
  return null;
}
