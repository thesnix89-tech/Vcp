import { useMemo, useRef, useState } from "react";

interface Props {
  data: { timestamp: number; price: number }[];
  width?: number;
  height?: number;
}

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export default function PriceChart({ data, width = 800, height = 260 }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const computed = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const padding = 4;
    const w = width;
    const h = height;
    const points = data.map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * (w - 2 * padding) + padding;
      const y = h - padding - ((d.price - min) / range) * (h - 2 * padding);
      return { x, y };
    });
    const path = points.reduce(
      (acc, p, i) =>
        acc +
        (i === 0
          ? `M${p.x.toFixed(2)},${p.y.toFixed(2)}`
          : ` L${p.x.toFixed(2)},${p.y.toFixed(2)}`),
      ""
    );
    const areaPath =
      path +
      ` L${points[points.length - 1].x.toFixed(2)},${h - padding} L${points[0].x.toFixed(2)},${h - padding} Z`;
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }).map((_, i) => {
      const idx = Math.floor((i / (tickCount - 1)) * (data.length - 1));
      const d = data[idx];
      const date = new Date(d.timestamp);
      return {
        x: points[idx].x,
        label: date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
      };
    });
    return { path, areaPath, min, max, first, last, ticks, points };
  }, [data, width, height]);

  if (!computed) {
    return (
      <div className="h-64 grid place-items-center text-ink-mute text-sm">
        Нет данных
      </div>
    );
  }

  const { path, areaPath, min, max, first, last, ticks, points } = computed;
  const up = last >= first;
  // Up = Claude orange (accent), Down = red (bad)
  const lineClass = up ? "text-accent" : "text-bad";

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - px);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };

  const handleLeave = () => setHoverIdx(null);

  const hover = hoverIdx !== null ? data[hoverIdx] : null;
  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverDateLabel = hover
    ? new Date(hover.timestamp).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Tooltip horizontal placement so it stays within the chart
  let tipX = hoverPoint ? hoverPoint.x + 8 : 0;
  const tipW = 150;
  if (tipX + tipW > width - 4) tipX = (hoverPoint?.x ?? 0) - tipW - 8;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height + 24}`}
        className={`w-full h-auto ${lineClass}`}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={4}
            x2={width - 4}
            y1={4 + (height - 8) * p}
            y2={4 + (height - 8) * p}
            className="text-bg-line"
            stroke="currentColor"
            strokeDasharray="2 4"
          />
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
        <g className="text-ink-dim">
          {ticks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={height + 16}
              fontSize="10"
              fill="currentColor"
              textAnchor="middle"
            >
              {t.label}
            </text>
          ))}
          <text x={6} y={14} fontSize="10" fill="currentColor">
            High: ${fmtPrice(max)}
          </text>
          <text x={6} y={height - 4} fontSize="10" fill="currentColor">
            Low: ${fmtPrice(min)}
          </text>
        </g>

        {/* Hover crosshair */}
        {hoverPoint && hover && (
          <g pointerEvents="none">
            <line
              x1={hoverPoint.x}
              x2={hoverPoint.x}
              y1={4}
              y2={height - 4}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="4"
              fill="currentColor"
              stroke="white"
              strokeWidth="1.5"
            />
            <g transform={`translate(${tipX}, ${Math.max(8, hoverPoint.y - 38)})`}>
              <rect
                width={tipW}
                height={36}
                rx="6"
                ry="6"
                className="text-bg-elev"
                fill="currentColor"
                stroke="rgb(var(--c-bg-line))"
                strokeWidth="1"
              />
              <text x={8} y={15} fontSize="11" className="text-ink" fill="currentColor" fontWeight="600">
                ${fmtPrice(hover.price)}
              </text>
              <text x={8} y={29} fontSize="10" className="text-ink-mute" fill="currentColor">
                {hoverDateLabel}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
