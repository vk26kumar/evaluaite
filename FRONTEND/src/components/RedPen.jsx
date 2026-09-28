/**
 * Hand-drawn red-pen marks: the product's signature. Each one draws itself
 * in with a stroke animation (skipped when reduced motion is requested).
 */

const drawStyle = (length, delay = 0) => ({
  strokeDasharray: length,
  strokeDashoffset: length,
  animation: `draw 900ms cubic-bezier(0.65, 0, 0.35, 1) ${delay}ms forwards`,
});

export function PenCircle({ className, delay = 0, strokeWidth = 3 }) {
  return (
    <svg className={className} viewBox="0 0 220 120" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M 128 10 C 60 4, 12 24, 10 60 C 8 96, 70 114, 124 110 C 180 106, 214 84, 210 52 C 206 20, 150 6, 92 14 C 76 16, 66 20, 58 24"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={drawStyle(700, delay)}
      />
    </svg>
  );
}

export function PenTick({ className, delay = 0, strokeWidth = 4 }) {
  return (
    <svg className={className} viewBox="0 0 48 40" fill="none" aria-hidden="true">
      <path
        d="M 4 22 C 9 26, 13 31, 17 36 C 24 22, 33 11, 45 3"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(80, delay)}
      />
    </svg>
  );
}

export function PenUnderline({ className, delay = 0, strokeWidth = 3 }) {
  return (
    <svg className={className} viewBox="0 0 300 16" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M 3 11 C 60 5, 140 4, 297 7 M 40 13 C 120 10, 200 10, 260 12"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={drawStyle(600, delay)}
      />
    </svg>
  );
}

export function PenCross({ className, delay = 0, strokeWidth = 3.5 }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M 6 7 C 16 17, 24 25, 34 34 M 33 6 C 24 15, 15 25, 7 33"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={drawStyle(110, delay)}
      />
    </svg>
  );
}
