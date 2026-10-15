import React from "react";

export default function TrendChart({ checkins }) {
  const points = [...checkins].reverse().slice(-10);
  const width = 720;
  const height = 230;
  const padding = 28;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((item, index) => ({
    x: padding + index * step,
    y: height - padding - (Number(item.wellbeingScore || 0) / 100) * (height - padding * 2),
    item
  }));
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Wellbeing score trend">
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} className="axis" />
        <line x1={padding} x2={width - padding} y1={padding} y2={padding} className="guide" />
        <line x1={padding} x2={width - padding} y1={height / 2} y2={height / 2} className="guide" />
        <path d={path} className="trend-line" />
        {coords.map((point) => (
          <circle key={`${point.item.date}-${point.x}`} cx={point.x} cy={point.y} r="5" className={`dot ${point.item.riskLevel}`} />
        ))}
      </svg>
      <div className="chart-labels">
        {points.map((point) => <span key={point.date}>{new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>)}
      </div>
    </div>
  );
}
