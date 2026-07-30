/**
 * The twin-T Tabula / TutorTime mark — red T lower-left, amber T upper-right,
 * overlapping only slightly at the inner corner.
 *
 * Geometry is measured directly from img/logo-tabula.png (pixel bounding
 * boxes of each colour, sampled programmatically), not redrawn by eye — an
 * earlier hand-drawn version overlapped the two Ts far more than the real
 * mark, so they read as merged rather than offset. Do not adjust these
 * coordinates without re-measuring against the source file.
 *
 * The brand colours are fixed too. Never recolour the mark to suit a
 * background: if contrast is the problem, put it on a light tile instead
 * (see the login header) rather than swapping a T to white.
 */
export default function TutorTimeMark({ size = 42 }) {
  return (
    <svg
      viewBox="0 0 286 240"
      width={size}
      height={size * (240 / 286)}
      role="img"
      aria-label="TutorTime"
      style={{ display: 'block' }}
    >
      <title>TutorTime</title>
      {/* Amber T — upper right, behind */}
      <rect x="136" y="9"  width="138" height="46" fill="var(--tt-logo-amber)" />
      <rect x="182" y="55" width="46"  height="92" fill="var(--tt-logo-amber)" />
      {/* Red T — lower left, in front */}
      <rect x="9"  y="90"  width="138" height="46" fill="var(--tt-logo-red)" />
      <rect x="55" y="136" width="46"  height="92" fill="var(--tt-logo-red)" />
    </svg>
  );
}
