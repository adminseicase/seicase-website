/** Decorative botanical line-art (inline SVG, inherits currentColor). */
export function BotanicalBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 240" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M60 236C58 180 64 120 84 60 92 36 100 18 108 6" />
      {[
        [62, 200, -1],
        [64, 170, 1],
        [68, 140, -1],
        [73, 112, 1],
        [79, 86, -1],
        [87, 62, 1],
        [95, 40, -1],
      ].map(([x, y, d], i) => (
        <path
          key={i}
          d={`M${x} ${y}c${d * 18} -6 ${d * 34} -22 ${d * 40} -40c${d * -20} 2 ${d * -36} 18 ${d * -40} 40z`}
          transform={`rotate(${d * -8} ${x} ${y})`}
        />
      ))}
      {[
        [62, 200],
        [68, 140],
        [79, 86],
        [95, 40],
      ].map(([x, y], i) => (
        <path key={`v${i}`} d={`M${x} ${y}l-${12 + i * 2} -18`} opacity="0.6" />
      ))}
    </svg>
  );
}

export function BotanicalSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M14 58C24 42 34 28 52 8" />
      <path d="M22 46c-8-2-12-10-12-18 8 2 12 10 12 18z" />
      <path d="M30 35c-2-8 2-16 9-20 2 8-2 16-9 20z" />
      <path d="M38 25c-7-4-9-12-6-20 7 4 9 12 6 20z" />
      <path d="M44 18c8-2 14 2 16 9-8 2-14-2-16-9z" />
    </svg>
  );
}

export function BotanicalVase({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 320" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M70 318c-10-30-14-60-6-86 6-18 6-26 0-34h72c-6 8-6 16 0 34 8 26 4 56-6 86z" />
      <path d="M100 198C96 150 80 110 50 70M100 198c4-50 22-96 56-140M100 198c0-60 2-120 4-180" />
      {[
        [50, 70],
        [62, 96],
        [78, 130],
        [156, 58],
        [140, 90],
        [124, 126],
        [104, 18],
        [103, 60],
        [102, 110],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="10" ry="4" transform={`rotate(${i % 2 ? 35 : -35} ${x} ${y})`} />
      ))}
    </svg>
  );
}
