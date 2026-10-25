export interface ChartPoint {
  label: string;
  total: number;
  accuracy: number | null;
}

export function Chart({ points }: { points: ChartPoint[] }) {
  const width = 340;
  const height = 150;
  const padX = 6;
  const padTop = 10;
  const padBottom = 24;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const max = Math.max(1, ...points.map((p) => p.total));
  const step = points.length > 0 ? innerW / points.length : innerW;
  const barW = Math.max(4, step * 0.56);

  const lineDots = points
    .map((p, i) => {
      if (p.accuracy === null) return null;
      return {
        x: padX + step * i + step / 2,
        y: padTop + innerH * (1 - p.accuracy / 100),
      };
    })
    .filter((dot): dot is { x: number; y: number } => dot !== null);
  const linePoints = lineDots.map((dot) => `${dot.x.toFixed(1)},${dot.y.toFixed(1)}`).join(' ');

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="近 14 天学习量">
      {[0, 0.5, 1].map((t) => (
        <line
          key={t}
          className="chart-grid"
          x1={padX}
          x2={width - padX}
          y1={padTop + innerH * t}
          y2={padTop + innerH * t}
        />
      ))}
      {points.map((p, i) => {
        const h = (p.total / max) * innerH;
        const x = padX + step * i + (step - barW) / 2;
        return (
          <rect
            key={p.label}
            className="chart-bar"
            x={x}
            y={padTop + innerH - h}
            width={barW}
            height={h}
            rx={3}
          />
        );
      })}
      {lineDots.length > 1 ? <polyline className="chart-line" points={linePoints} fill="none" /> : null}
      {lineDots.map((dot, i) => (
        <circle key={`dot-${i}`} className="chart-dot" cx={dot.x} cy={dot.y} r={2.6} />
      ))}
      {points.map((p, i) => {
        const showLabel = i === points.length - 1 || (i % 2 === 0 && i !== points.length - 2);
        if (!showLabel) return null;
        return (
          <text key={`l-${p.label}`} className="chart-label" x={padX + step * i + step / 2} y={height - 6} textAnchor="middle">
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}
