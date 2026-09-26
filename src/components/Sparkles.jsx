const COLORS = ['#E03248', '#FFCA05', '#2F6FE4'];

// Six red / yellow / blue dots that fly out from the middle of the parent
// (which must be position: relative). Mount with a new `key` to replay.
export default function Sparkles({ radius = 30 }) {
  return (
    <span className="tt-sparkles" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <i key={i} style={{
            background: COLORS[i % COLORS.length],
            '--x': `${Math.cos(a) * radius}px`, '--y': `${Math.sin(a) * radius}px`,
          }} />
        );
      })}
    </span>
  );
}
