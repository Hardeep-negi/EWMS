import React, { useEffect, useState } from "react";
import TrendChart from "../components/TrendChart";
import { api } from "../services/api";

export default function Trends({ refreshKey }) {
  const [checkins, setCheckins] = useState([]);

  useEffect(() => {
    api.getCheckins().then((data) => setCheckins(data.checkins || []));
  }, [refreshKey]);

  return (
    <section className="page-stack">
      <section className="content-band">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Personal analytics</p>
            <h2>Your wellbeing trend</h2>
          </div>
        </div>
        <TrendChart checkins={checkins} />
      </section>
      <section className="table-band">
        <h3>Check-in history</h3>
        <div className="history-table">
          <div className="table-header"><span>Date</span><span>Mood</span><span>Stress</span><span>Workload</span><span>Score</span></div>
          {checkins.map((item) => (
            <div className="table-row" key={`${item.date}-${item.wellbeingScore}-${item.comment}`}>
              <span>{new Date(item.date).toLocaleDateString()}</span>
              <span>{item.mood}/5</span>
              <span>{item.stress}/5</span>
              <span>{item.workload}/5</span>
              <strong>{item.wellbeingScore}</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
