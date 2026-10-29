import React from "react";
import { Bar, BarChart, CartesianGrid, Label, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const labels = {
  score: { title: "Wellbeing score", axis: "Score (0-100)", overall: "Daily score" },
  mood: { title: "Mood", axis: "Rating (1-5)", overall: "Daily mood" },
  stress: { title: "Stress", axis: "Rating (1-5)", overall: "Daily stress" },
  workload: { title: "Workload", axis: "Rating (1-5)", overall: "Daily workload" }
};

function average(items, field) {
  const values = items.map((item) => Number(item[field])).filter(Number.isFinite);
  return values.length ? Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1)) : null;
}

function chartData(checkins, metric) {
  const grouped = new Map();
  for (const checkin of checkins) {
    const date = checkin.shiftDate || new Date(checkin.date || checkin.createdAt).toISOString().slice(0, 10);
    const items = grouped.get(date) || [];
    items.push(checkin);
    grouped.set(date, items);
  }
  const field = metric === "score" ? "wellbeingScore" : metric;
  return [...grouped.entries()].sort(([first], [second]) => first.localeCompare(second)).map(([date, items]) => {
    const mornings = items.filter((item) => item.type === "morning");
    const evenings = items.filter((item) => item.type === "evening");
    const morning = average(mornings, field);
    const evening = average(evenings, field);
    return { date, label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }), overall: average(items, field), morning, evening };
  });
}

function TrendTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const suffix = metric === "score" ? "/100" : "/5";
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.filter((entry) => entry.value !== null).map((entry) => <span key={entry.dataKey} style={{ color: entry.color }}>{entry.name}: {entry.value}{suffix}</span>)}</div>;
}

export function ChartTypePicker({ value, onChange }) {
  return <label className="chart-type-picker">Chart style<select value={value} onChange={(event) => onChange(event.target.value)}><option value="line">Line graph</option><option value="grouped">Grouped bars</option></select></label>;
}

export default function TrendChart({ checkins, metric = "score", title, chartType = "line" }) {
  const copy = labels[metric] || labels.score;
  const data = chartData(checkins, metric);
  const hasMorningOrEvening = data.some((point) => point.morning !== null || point.evening !== null);
  const domain = metric === "score" ? [0, 100] : [1, 5];
  const isBars = chartType === "grouped";

  if (data.length < 2) return <p className="soft-copy">At least two recorded days are needed to show a trend.</p>;

  return <section className="trend-chart" aria-label={title || copy.title}>
    {title && <h3>{title}</h3>}
    <div className="trend-chart-canvas"><ResponsiveContainer width="100%" height="100%">
      {isBars ? <BarChart data={data} margin={{ top: 16, right: 20, left: 6, bottom: 18 }}><CartesianGrid strokeDasharray="3 3" stroke="#dfe7e0" /><XAxis dataKey="label" tick={{ fill: "#405047", fontSize: 14 }} interval="preserveStartEnd"><Label value="Check-in date" position="insideBottom" offset={-10} style={{ fontSize: 14, fill: "#405047" }} /></XAxis><YAxis domain={domain} allowDecimals={metric !== "score"} tick={{ fill: "#405047", fontSize: 14 }}><Label value={copy.axis} angle={-90} position="insideLeft" style={{ fontSize: 14, fill: "#405047" }} /></YAxis><Tooltip content={<TrendTooltip metric={metric} />} /><Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 14 }} /><Bar dataKey="overall" name={copy.overall} fill="#176d6b" radius={[4, 4, 0, 0]} />{hasMorningOrEvening && <><Bar dataKey="morning" name={`Morning ${copy.title.toLowerCase()}`} fill="#4f81bd" radius={[4, 4, 0, 0]} /><Bar dataKey="evening" name={`Evening ${copy.title.toLowerCase()}`} fill="#b06f2c" radius={[4, 4, 0, 0]} /></>}</BarChart> : <LineChart data={data} margin={{ top: 16, right: 20, left: 6, bottom: 18 }}><CartesianGrid strokeDasharray="3 3" stroke="#dfe7e0" /><XAxis dataKey="label" tick={{ fill: "#405047", fontSize: 14 }} interval="preserveStartEnd"><Label value="Check-in date" position="insideBottom" offset={-10} style={{ fontSize: 14, fill: "#405047" }} /></XAxis><YAxis domain={domain} allowDecimals={metric !== "score"} tick={{ fill: "#405047", fontSize: 14 }}><Label value={copy.axis} angle={-90} position="insideLeft" style={{ fontSize: 14, fill: "#405047" }} /></YAxis><Tooltip content={<TrendTooltip metric={metric} />} /><Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 14 }} /><Line type="monotone" dataKey="overall" name={copy.overall} stroke="#176d6b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />{hasMorningOrEvening && <><Line type="monotone" dataKey="morning" name={`Morning ${copy.title.toLowerCase()}`} stroke="#4f81bd" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls /><Line type="monotone" dataKey="evening" name={`Evening ${copy.title.toLowerCase()}`} stroke="#b06f2c" strokeWidth={2} strokeDasharray="2 3" dot={{ r: 3 }} connectNulls /></>}</LineChart>}
    </ResponsiveContainer></div>
  </section>;
}
