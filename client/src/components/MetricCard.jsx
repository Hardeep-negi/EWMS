import React from "react";

export default function MetricCard({ label, value, detail, tone = "neutral" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
