"use client";

import { useId } from "react";

type SparklineProps = {
  points: number[];
  className?: string;
};

const WIDTH = 180;
const HEIGHT = 70;
const PADDING = 8;

function createSmoothPath(points: number[]) {
  if (points.length < 2) return "";

  const stepX = (WIDTH - PADDING * 2) / (points.length - 1);
  const pathPoints = points.map((point, index) => {
    const x = PADDING + index * stepX;
    const y =
      HEIGHT -
      PADDING -
      (Math.max(0, Math.min(100, point)) / 100) * (HEIGHT - PADDING * 2);
    return { x, y };
  });

  let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
  for (let i = 1; i < pathPoints.length; i += 1) {
    const prev = pathPoints[i - 1];
    const curr = pathPoints[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` Q ${cx} ${prev.y}, ${curr.x} ${curr.y}`;
  }

  return d;
}

export default function Sparkline({ points, className }: SparklineProps) {
  const uniqueId = useId().replace(/:/g, "");
  const first = points[0] ?? 0;
  const last = points[points.length - 1] ?? first;
  const isUp = last >= first;
  const strokeColor = isUp ? "rgba(74,222,128,0.95)" : "rgba(248,113,113,0.95)";
  const fillId = `${isUp ? "spark-fill-up" : "spark-fill-down"}-${uniqueId}`;

  const d = createSmoothPath(points);
  if (!d) return null;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      role="img"
      aria-label="Price trend sparkline"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L ${WIDTH - PADDING} ${HEIGHT - PADDING} L ${PADDING} ${
          HEIGHT - PADDING
        } Z`}
        fill={`url(#${fillId})`}
      />
      <path d={d} fill="none" stroke={strokeColor} strokeWidth="2" />
    </svg>
  );
}
