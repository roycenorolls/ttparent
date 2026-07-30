/**
 * The twin-T TutorTime mark.
 *
 * `onBlue` swaps the red T for white — #D93B34 on #003087 is too low-contrast
 * to sit directly on the blue header.
 */
export default function TutorTimeMark({ size = 42, onBlue = false }) {
  const back  = onBlue ? '#FFCA05' : 'var(--tt-logo-amber)';
  const front = onBlue ? '#FFFFFF' : 'var(--tt-logo-red)';

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
      <rect x="15" y="0"  width="24" height="9"  fill={back} />
      <rect x="23" y="0"  width="8"  height="23" fill={back} />
      <rect x="1"  y="11" width="24" height="9"  fill={front} />
      <rect x="9"  y="11" width="8"  height="23" fill={front} />
    </svg>
  );
}
