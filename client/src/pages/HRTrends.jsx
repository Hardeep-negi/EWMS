import React, { useEffect, useMemo, useState } from "react";
import TrendChart, { ChartTypePicker } from "../components/TrendChart";
import { api } from "../services/api";

function average(items, field) {
  const values = items.map((item) => Number(item[field])).filter(Number.isFinite);
  return values.length ? (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1) : "--";
}

export default function HRTrends() {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [checkins, setCheckins] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [range, setRange] = useState(30);
  const [chartType, setChartType] = useState("line");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.getHrEmployees({ limit: 50 }), api.getHrOverview()])
      .then(([directory, overview]) => {
        if (!active) return;
        const rows = directory.employees || [];
        const supportFirst = (overview.support || []).find((item) => item.needsSupport);
        setEmployees(rows);
        setEmployeeId(supportFirst?.id || rows[0]?.id || "");
      })
      .catch((err) => { if (active) setError(err.message || "Unable to load employees."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    setLoading(true);
    api.getHrEmployee(employeeId)
      .then((result) => { if (active) { setEmployee(result.employee); setCheckins(result.checkins || []); } })
      .catch((err) => { if (active) setError(err.message || "Unable to load this employee's trend."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employeeId]);

  const filtered = useMemo(() => checkins.filter((item) => new Date(item.shiftDate) >= new Date(Date.now() - range * 86400000)), [checkins, range]);
  const selected = employees.find((item) => item.id === employeeId);

  return <section className="page-stack"><section className="content-band"><div className="section-heading"><div><p className="eyebrow">Authorized employee analytics</p><h2>Trends</h2><p className="soft-copy">Choose an employee from your department to review their self-reported wellbeing history.</p></div><div className="trend-controls"><label className="employee-trend-picker">Employee<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={!employees.length}>{employees.map((item) => <option key={item.id} value={item.id}>{item.name}{item.supportStatus === "offer-support" ? " - needs support" : ""}</option>)}</select></label><ChartTypePicker value={chartType} onChange={setChartType} /></div></div>{loading ? <p className="soft-copy">Loading employee trend...</p> : error ? <p className="form-error">{error}</p> : !employeeId ? <p className="soft-copy">There are no employees in your department yet.</p> : <><div className="metrics-grid"><Card label="Selected employee" value={employee?.name || selected?.name || "--"} /><Card label="Average score" value={average(filtered, "wellbeingScore")} /><Card label="Average mood" value={average(filtered, "mood")} /><Card label="Average stress" value={average(filtered, "stress")} /></div><div className="section-heading trend-subheading"><h3>{employee?.name || selected?.name}'s check-ins</h3><div className="segmented trend-range">{[7, 30, 90].map((days) => <button key={days} className={range === days ? "selected" : ""} onClick={() => setRange(days)}>Last {days} days</button>)}</div></div>{filtered.length ? <div className="trend-grid"><TrendChart checkins={filtered} metric="score" title="Daily wellbeing score" chartType={chartType} /><TrendChart checkins={filtered} metric="mood" title="Mood: morning and evening" chartType={chartType} /><TrendChart checkins={filtered} metric="stress" title="Stress: morning and evening" chartType={chartType} /><TrendChart checkins={filtered} metric="workload" title="Workload: morning and evening" chartType={chartType} /></div> : <p className="soft-copy">No check-ins were recorded in this period.</p>}<p className="soft-copy">This information is self-reported and supports a respectful conversation. It is not a performance rating or diagnosis.</p></>}</section></section>;
}

function Card({ label, value }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>; }
