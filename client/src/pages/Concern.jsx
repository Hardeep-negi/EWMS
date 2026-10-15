import React, { useEffect, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { api } from "../services/api";

export default function Concern() {
  const [form, setForm] = useState({ category: "Workload", urgency: "Medium", message: "", anonymous: false });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [concerns, setConcerns] = useState([]);

  useEffect(() => {
    api.getConcerns()
      .then((data) => setConcerns(data.concerns || []))
      .catch(() => setConcerns([]));
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("");
    setError("");

    try {
      const data = await api.createConcern(form);
      setForm((current) => ({ ...current, message: "" }));
      setStatus("Concern submitted privately.");
      if (data.concern) {
        setConcerns((current) => [data.concern, ...current]);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="form-surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Private support channel</p>
          <h2>Raise a concern</h2>
        </div>
        <span className="status-pill"><ShieldCheck size={15} /> Employee-first</span>
      </div>
      <form onSubmit={submit} className="checkin-form">
        <div className="form-grid">
          <label>
            Category
            <select value={form.category} onChange={(e) => update("category", e.target.value)}>
              <option>Workload</option>
              <option>Manager support</option>
              <option>Leave request</option>
              <option>Team conflict</option>
              <option>Mental wellbeing</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Urgency
            <select value={form.urgency} onChange={(e) => update("urgency", e.target.value)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
        </div>
        <label>
          Message
          <textarea required value={form.message} onChange={(e) => update("message", e.target.value)} rows="7" placeholder="Describe what support would help." />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.anonymous} onChange={(e) => update("anonymous", e.target.checked)} />
          Submit anonymously to HR
        </label>
        {error && <p className="form-error">{error}</p>}
        {status && <p className="success-message">{status}</p>}
        <button className="primary-button"><Send size={18} /> Submit concern</button>
      </form>

      <div className="concern-history">
        <h3>Your submitted concerns</h3>
        {concerns.length === 0 ? (
          <p className="soft-copy">No concerns submitted yet.</p>
        ) : (
          concerns.map((concern) => (
            <article key={concern._id || concern.id}>
              <div>
                <strong>{concern.category}</strong>
                <small>{new Date(concern.createdAt).toLocaleString()} · {concern.anonymous ? "Anonymous" : "Identified"}</small>
              </div>
              <span>{concern.status.replaceAll("-", " ")}</span>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
