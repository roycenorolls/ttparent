/**
 * The twin-T Tabula / TutorTime mark — red T in front (lower left), amber T
 * behind (upper right). Matches img/logo-tabula.png.
 *
 * The brand colours are fixed. Never recolour the mark to suit a background:
 * if contrast is the problem, put it on a light tile instead (see the login
 * header) rather than swapping a T to white.
 */
export default function TutorTimeMark({ size = 42 }) {
  return (
    <svg
      viewBox="0 0 40 34"
      width={size}
      height={size * (34 / 40)}
      role="img"
      aria-label="TutorTime"
      style={{ display: 'block' }}
    >
      <title>TutorTime</title>
      <rect x="15" y="0"  width="24" height="9"  fill="var(--tt-logo-amber)" />
      <rect x="23" y="0"  width="8"  height="23" fill="var(--tt-logo-amber)" />
      <rect x="1"  y="11" width="24" height="9"  fill="var(--tt-logo-red)" />
      <rect x="9"  y="11" width="8"  height="23" fill="var(--tt-logo-red)" />
    </svg>
  );
}
