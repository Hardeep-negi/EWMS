import React, { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { api } from "../services/api";

const sliders = [
  { key: "mood", label: "Mood", low: "Low", high: "Great" },
  { key: "stress", label: "Stress", low: "Calm", high: "High" },
  { key: "workload", label: "Workload", low: "Light", high: "Heavy" }
];

export default function CheckIn({ type, onSaved }) {
  const [form, setForm] = useState({ mood: 3, stress: 3, workload: 3, plannedOvertime: false, plannedOvertimeHours: 0, expectedCompensation: 0, comment: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEvening = type === "evening";

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError("");
    try { await api.createCheckin({ ...form, type }); onSaved(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return <section className="form-surface checkin-surface">
    <div className="section-heading"><div><p className="eyebrow">{isEvening ? "End of shift" : "Start of shift"}</p><h2>{isEvening ? "How did your day finish?" : "How are you starting today?"}</h2><p className="soft-copy">{isEvening ? "This captures planned overtime, not overtime already worked or paid." : "Saving this starts your working-time clock at the actual check-in timestamp."}</p></div><button className="plain-icon-button" title="Back to dashboard" onClick={onSaved}><ArrowLeft size={19} /></button></div>
    <form onSubmit={submit} className="checkin-form">
      {sliders.map((slider) => <label className="slider-row" key={slider.key}><div><strong>{slider.label}</strong><small>{slider.low} to {slider.high}</small></div><input type="range" min="1" max="5" value={form[slider.key]} onChange={(event) => update(slider.key, Number(event.target.value))} /><output>{form[slider.key]}</output></label>)}
      {isEvening && <section className="overtime-panel"><label className="checkbox-row"><input type="checkbox" checked={form.plannedOvertime} onChange={(event) => update("plannedOvertime", event.target.checked)} /> Are you planning to work overtime today?</label>{form.plannedOvertime && <div className="form-grid"><label>Planned additional hours<input type="number" min="0" max="12" step="0.5" value={form.plannedOvertimeHours} onChange={(event) => update("plannedOvertimeHours", Number(event.target.value))} /></label><label>Expected compensation (INR)<input type="number" min="0" value={form.expectedCompensation} onChange={(event) => update("expectedCompensation", Number(event.target.value))} /></label></div>}</section>}
      <label>Optional note<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} placeholder="Anything affecting your wellbeing?" rows="5" /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={saving}><Save size={18} /> {saving ? "Saving" : `Save ${isEvening ? "evening" : "morning"} check-in`}</button>
    </form>
  </section>;
}
