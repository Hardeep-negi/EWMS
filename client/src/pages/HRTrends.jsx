import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { api } from "../services/api";

export default function HRTrends() {
  const [range, setRange] = useState("daily");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.getHrTrends(range)
      .then((result) => { if (active) setData({ ...result, points: Array.isArray(result.points) ? result.points : [] }); })
      .catch((err) => { if (active) setError(err.message || "Unable to load department trends."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]);

  return <section className="page-stack"><section className="content-band"><div className="section-heading"><div><p className="eyebrow">Department analytics</p><h2>Trends</h2></div><div className="segmented trend-range"><button className={range === "daily" ? "selected" : ""} onClick={() => setRange("daily")}>Daily</button><button className={range === "weekly" ? "selected" : ""} onClick={() => setRange("weekly")}>Weekly</button><button className={range === "monthly" ? "selected" : ""} onClick={() => setRange("monthly")}>Monthly</button></div></div>{loading ? <p className="soft-copy">Loading department trends...</p> : error ? <p className="form-error">{error}</p> : data?.suppressed ? <div className="aggregate-notice"><BarChart3 size={25} /><div><strong>Aggregate view is protected</strong><p>This department has {data.contributorCount} contributing employees. At least {data.minimumGroupSize} are required before aggregate wellbeing trends are shown.</p></div></div> : <><div className="metrics-grid"><Card label="Average score" value={data?.summary?.score ?? "--"} /><Card label="Average mood" value={data?.summary?.mood ?? "--"} /><Card label="Average stress" value={data?.summary?.stress ?? "--"} /><Card label="Planned overtime" value={`${data?.summary?.overtime ?? 0}h`} /></div><div className="hr-chart">{data?.points?.length ? data.points.map((point) => <div key={point.date} title={`${point.date}: score ${point.score}`}><span style={{ height: `${Math.max(4, Number(point.score) || 0)}%` }} /><small>{String(point.date || "").slice(5)}</small></div>) : <p className="soft-copy">No department check-ins in this period.</p>}</div><p className="soft-copy">Completion rates and trends are shown only as department-level aggregates for {data?.contributorCount || 0} contributors.</p></>}</section></section>;
}
function Card({ label, value }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>; }
