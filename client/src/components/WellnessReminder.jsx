import React, { useEffect, useState } from "react";
import { BellRing, Clock3, X } from "lucide-react";
import { api } from "../services/api";

const copy = { break: "Consider taking a short break when practical.", water: "Take a moment to hydrate if you need to.", stretch: "A gentle stretch may help you take a pause from your task." };

export default function WellnessReminder() {
  const [reminder, setReminder] = useState(null);
  useEffect(() => { let active = true; const load = () => api.getReminderStatus().then((data) => { if (active) setReminder(data); }).catch(() => {}); load(); const interval = window.setInterval(load, 60000); return () => { active = false; window.clearInterval(interval); }; }, []);
  async function act(action) { await api.actOnReminder(action); setReminder((current) => current ? { ...current, status: { ...current.status, due: false } } : current); }
  if (!reminder?.status?.due) return null;
  return <aside className="wellness-reminder" role="status"><BellRing size={19} /><div><strong>Wellness reminder</strong><span>{copy[reminder.status.type]}</span></div><button className="secondary-button" onClick={() => act("snooze")}><Clock3 size={16} /> Snooze</button><button className="secondary-button" onClick={() => act("done")}>Done</button><button className="plain-icon-button" aria-label="Dismiss wellness reminder" onClick={() => act("dismiss")}><X size={17} /></button></aside>;
}
