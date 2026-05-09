type Props = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Tiny inline-SVG trend line for a 7-bucket series. Works as content (no axes / labels) — sized
 * to live inside a table cell. Auto-scaled to its own range so a flat zero series renders as a
 * thin baseline rather than a misleading peak.
 */
export function Sparkline({ values, width = 64, height = 18, className }: Props) {
  if (!values || values.length === 0) {
    return <span aria-hidden className={className} style={{ display: "inline-block", width, height }} />;
  }
  const max = Math.max(...values, 1);
  const step = values.length === 1 ? 0 : width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = values[values.length - 1];
  const lastX = (values.length - 1) * step;
  const lastY = height - (last / max) * (height - 2) - 1;
  const flat = max === 0 || values.every((v) => v === values[0]);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="7-day click trend"
      className={className}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={flat ? 0.3 : 0.85}
      />
      {!flat && <circle cx={lastX} cy={lastY} r="1.6" fill="currentColor" />}
    </svg>
  );
}
