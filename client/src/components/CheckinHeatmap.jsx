import React, { useMemo, useState } from "react";

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CheckinHeatmap({ checkins }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const years = Array.from({ length: currentYear - 2015 + 1 }, (_, index) => currentYear - index);
  const data = useMemo(() => {
    const byDate = new Map();
    for (const item of checkins) {
      if (!item.shiftDate?.startsWith(`${year}-`)) continue;
      const types = byDate.get(item.shiftDate) || new Set();
      types.add(item.type);
      byDate.set(item.shiftDate, types);
    }
    const start = new Date(year, 0, 1);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(year, 11, 31);
    end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
    const days = [];
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const copy = new Date(date);
      const inYear = copy.getFullYear() === year;
      days.push({ date: copy, inYear, count: inYear ? (byDate.get(dateKey(copy))?.size || 0) : -1, key: dateKey(copy) });
    }
    const months = days.reduce((result, item, index) => {
      if (item.date.getDate() !== 1 || item.date.getFullYear() !== year) return result;
      result.push({ label: item.date.toLocaleDateString(undefined, { month: "short" }), column: Math.floor(index / 7) + 1 });
      return result;
    }, []);
    return { days, months, columns: Math.ceil(days.length / 7) };
  }, [checkins, year]);

  return <section className="content-band checkin-heatmap" style={{ "--heatmap-columns": data.columns }}><div className="section-heading"><div><p className="eyebrow">Check-in consistency</p><h3>Check-in calendar</h3></div><div className="heatmap-actions"><label>Year<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><div className="heatmap-legend"><span><i className="heatmap-cell none" /> None</span><span><i className="heatmap-cell one" /> One check-in</span><span><i className="heatmap-cell two" /> Morning and evening</span></div></div></div><div className="heatmap-months">{data.months.map((month) => <span key={month.label} style={{ gridColumnStart: month.column }}>{month.label}</span>)}</div><div className="heatmap-grid" aria-label={`${year} daily check-in calendar`}>{data.days.map((item) => { const state = item.count < 0 ? "future" : item.count >= 2 ? "two" : item.count === 1 ? "one" : "none"; const text = item.count < 0 ? "Outside selected year" : item.count >= 2 ? "Morning and evening check-ins completed" : item.count === 1 ? "One check-in completed" : "No check-ins completed"; return <span key={item.key} className={`heatmap-cell ${state}`} title={`${item.date.toLocaleDateString()}: ${text}`} aria-label={`${item.date.toLocaleDateString()}: ${text}`} />; })}</div><p className="soft-copy">This calendar records submitted check-ins only. It does not measure work time or performance.</p></section>;
}
