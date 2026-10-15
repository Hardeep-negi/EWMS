import React, { useState } from "react";
import { Save } from "lucide-react";
import { api } from "../services/api";

export default function HRCheckIn() {
  const [form, setForm] = useState({ mood: 3, stress: 3, workload: 3, note: "" }); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event) { event.preventDefault(); setError(""); try { await api.createHrCheckin(form); setMessage("Your personal HR check-in is saved privately."); setForm({ mood: 3, stress: 3, workload: 3, note: "" }); } catch (err) { setError(err.message); } }
  return <section className="form-surface"><div className="section-heading"><div><p className="eyebrow">Private HR check-in</p><h2>Your own wellbeing</h2><p className="soft-copy">HR personal check-ins are stored separately and are not visible to other HR users.</p></div></div><form onSubmit={submit}>{["mood", "stress", "workload"].map((key) => <label className="slider-row" key={key}><strong>{key}</strong><input type="range" min="1" max="5" value={form[key]} onChange={(event) => update(key, Number(event.target.value))} /><output>{form[key]}</output></label>)}<label>Optional note<textarea rows="5" value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Anything affecting your wellbeing?" /></label>{error && <p className="form-error">{error}</p>}{message && <p className="success-message">{message}</p>}<button className="primary-button"><Save size={18} /> Save private check-in</button></form></section>;
}
