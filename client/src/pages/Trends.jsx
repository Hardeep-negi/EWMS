import React, { useEffect, useState } from "react";
import TrendChart, { ChartTypePicker } from "../components/TrendChart";
import { api } from "../services/api";

export default function Trends({ refreshKey }) {
  const [checkins, setCheckins] = useState([]);
  const [range, setRange] = useState(7);
  const [chartType, setChartType] = useState("line");

  useEffect(() => {
    api.getCheckins().then((data) => setCheckins(data.checkins || []));
  }, [refreshKey]);

  const filtered = checkins.filter((item) => new Date(item.shiftDate) >= new Date(Date.now() - range * 86400000));
  const scoreVersions = [...new Set(filtered.map((item) => item.scoreVersion || "v1"))];
  return (
    <section className="page-stack">
      <section className="content-band">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Personal analytics</p>
            <h2>Your wellbeing trend</h2>
          </div><div className="trend-controls"><ChartTypePicker value={chartType} onChange={setChartType} /><div className="segmented trend-range">{[7, 30, 90].map((days) => <button key={days} className={range === days ? "selected" : ""} onClick={() => setRange(days)}>Last {days} days</button>)}</div></div>
        </div>
        {filtered.length ? <div className="trend-grid">
          <TrendChart checkins={filtered} metric="score" title="Daily wellbeing score" chartType={chartType} />
          <TrendChart checkins={filtered} metric="mood" title="Mood: morning and evening" chartType={chartType} />
          <TrendChart checkins={filtered} metric="stress" title="Stress: morning and evening" chartType={chartType} />
          <TrendChart checkins={filtered} metric="workload" title="Workload: morning and evening" chartType={chartType} />
        </div> : <p className="soft-copy">No check-ins were recorded in this period.</p>}
        {scoreVersions.length > 1 && <p className="insufficient-data">This period includes scores calculated with different formula versions ({scoreVersions.join(", ")}). Compare the underlying mood, stress, and workload trends for the clearest context.</p>}
      </section>
      <section className="table-band">
        <h3>Check-in history</h3>
        <div className="history-table">
          <div className="table-header"><span>Date</span><span>Time of day</span><span>Mood</span><span>Stress</span><span>Workload</span><span>Score</span><span>Formula</span></div>
          {filtered.map((item) => (
            <div className="table-row" key={`${item.date}-${item.wellbeingScore}-${item.comment}`}>
              <span>{new Date(item.date).toLocaleDateString()}</span>
              <span>{item.type === "evening" ? "Evening" : "Morning"}</span>
              <span>{item.mood}/5</span>
              <span>{item.stress}/5</span>
              <span>{item.workload}/5</span>
              <strong>{item.wellbeingScore}</strong>
              <span>{item.scoreVersion || "v1"}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
