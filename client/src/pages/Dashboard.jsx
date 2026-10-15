import React, { useEffect, useMemo, useState } from "react";
import { AlarmClock, CalendarCheck, ClipboardCheck, HandHeart, MoonStar, Sparkles, SunMedium, X } from "lucide-react";
import MetricCard from "../components/MetricCard";
import TrendChart from "../components/TrendChart";
import { api } from "../services/api";

function formatDuration(minutes) {
  const safe = Math.max(0, Number(minutes || 0));
  return `${Math.floor(safe / 60)}h ${safe % 60}m`;
}

function latestByType(checkins, type) {
  return checkins.find((item) => item.type === type) || null;
}

export default function Dashboard({ refreshKey, onCheckIn }) {
  const [checkins, setCheckins] = useState([]);
  const [status, setStatus] = useState(null);
  const [supportActions, setSupportActions] = useState([]);
  const [wellnessEvents, setWellnessEvents] = useState([]);
  const [reminderOpen, setReminderOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [checkinData, statusData, supportData, eventData] = await Promise.all([api.getCheckins(), api.getCheckinStatus(), api.getMySupportActions(), api.getWellnessEvents()]);
        if (!active) return;
        setCheckins(checkinData.checkins || []);
        setStatus(statusData.status);
        setSupportActions(supportData.actions || []);
        setWellnessEvents((eventData.events || []).filter((event) => event.status === "scheduled" && new Date(event.startsAt) >= new Date()).slice(0, 3));
        const dismissed = localStorage.getItem(`morning-reminder-${statusData.status.shiftDate}`);
        setReminderOpen(statusData.status.inShift && !statusData.status.morningComplete && !dismissed);
      } catch {
        if (active) { setCheckins([]); setStatus(null); setSupportActions([]); setWellnessEvents([]); }
      }
    }
    load();
    const interval = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(interval); };
  }, [refreshKey]);

  useEffect(() => {
    if (!status?.running) return undefined;
    const timer = window.setInterval(() => setStatus((current) => current ? { ...current, elapsedMinutes: current.elapsedMinutes + 1, remainingMinutes: Math.max(0, current.remainingMinutes - 1) } : current), 60000);
    return () => window.clearInterval(timer);
  }, [status?.running]);

  const latest = checkins[0];
  const morning = latestByType(checkins, "morning");
  const evening = latestByType(checkins, "evening");
  const average = useMemo(() => checkins.length ? Math.round(checkins.reduce((sum, item) => sum + Number(item.wellbeingScore || 0), 0) / checkins.length) : 0, [checkins]);
  const overtime = status?.evening?.plannedOvertimeHours || 0;
  const compensation = status?.evening?.expectedCompensation || 0;

  function dismissReminder() {
    if (status?.shiftDate) localStorage.setItem(`morning-reminder-${status.shiftDate}`, "true");
    setReminderOpen(false);
  }

  async function dismissSupportUpdate(actionId) {
    try {
      await api.dismissSupportAction(actionId);
      setSupportActions((current) => current.filter((action) => action.id !== actionId));
    } catch {
      // A failed dismissal leaves the update visible so the employee does not lose it.
    }
  }

  return <section className="page-stack">
    {reminderOpen && <div className="checkin-reminder" role="dialog" aria-label="Morning check-in reminder">
      <div><SunMedium size={20} /><div><strong>Start your shift with a quick check-in</strong><span>Your work timer starts from the saved check-in time.</span></div></div>
      <div className="reminder-actions"><button className="secondary-button" onClick={dismissReminder}>Later</button><button className="primary-button" onClick={() => { dismissReminder(); onCheckIn("morning"); }}>Open morning check-in</button><button className="plain-icon-button" aria-label="Dismiss reminder" onClick={dismissReminder}><X size={18} /></button></div>
    </div>}

    <div className="hero-band dashboard-intro">
      <div><p className="eyebrow">Personal wellbeing snapshot</p><h2>{latest ? riskMessage(latest.riskLevel) : "Start with your morning check-in"}</h2><p>Wellbeing scores summarize your own answers. They are not a medical assessment or employment decision.</p></div>
      <div className="checkin-actions">
        <button className={status?.morningComplete ? "completed-button" : "primary-button"} disabled={status?.morningComplete} onClick={() => onCheckIn("morning")}><SunMedium size={18} /> {status?.morningComplete ? "Morning complete" : "Morning check-in"}</button>
        <button className={status?.eveningComplete ? "completed-button" : "secondary-button"} disabled={status?.eveningComplete} onClick={() => onCheckIn("evening")}><MoonStar size={18} /> {status?.eveningComplete ? "Evening complete" : "Evening check-in"}</button>
      </div>
    </div>

    <section className="shift-clock"><div className="clock-icon"><AlarmClock size={26} /></div><div><p className="eyebrow">Today's working time</p><strong>{status?.morningComplete ? formatDuration(status.elapsedMinutes) : "Not started"}</strong><span>{status?.morningComplete ? `${status.running ? "Running" : "Stopped"} · Shift ends ${status.endLabel}` : `Check in to start your ${status?.startLabel || "9:00 AM"} shift`}</span></div><div className="clock-detail"><span>Remaining</span><strong>{status?.morningComplete ? formatDuration(status.remainingMinutes) : "--"}</strong></div></section>

    <div className="metrics-grid">
      <MetricCard label="Latest score" value={latest?.wellbeingScore ?? "--"} detail={latest ? `${latest.riskLevel.replace("-", " ")} status` : "No check-in yet"} tone={latest?.riskLevel || "neutral"} />
      <MetricCard label="Average score" value={average || "--"} detail={`${checkins.length} saved check-ins`} />
      <MetricCard label="Shift status" value={status?.morningComplete ? "Started" : "Pending"} detail={status?.morningComplete ? `Ends ${status.endLabel}` : "Morning check-in required"} />
      <MetricCard label="Planned overtime" value={overtime ? `${overtime}h` : "None"} detail={overtime ? `Expected INR ${compensation}` : "Set in evening check-in"} />
    </div>

    {supportActions.length > 0 && <section className="content-band support-updates">
      <div className="section-heading"><div><p className="eyebrow">HR follow-up</p><h3>Support updates</h3></div><span className="status-pill"><HandHeart size={15} /> {supportActions.length} update{supportActions.length === 1 ? "" : "s"}</span></div>
      <div className="support-update-list">{supportActions.map((action) => <article key={action.id}><HandHeart size={19} /><div><strong>{action.title}</strong><p>{action.employeeMessage || "HR has recorded a support update."}</p>{action.meetingAt && <small>Meeting scheduled for {new Date(action.meetingAt).toLocaleString()}</small>}{action.leaveDecision !== "not-applicable" && <small>Leave request: {action.leaveDecision}</small>}{action.assignedPerson && <small>Support contact: {action.assignedPerson}</small>}</div>{["completed", "closed"].includes(action.status) && <button className="plain-icon-button dismiss-support" aria-label="Remove resolved support update" title="Remove resolved update" onClick={() => dismissSupportUpdate(action.id)}><X size={18} /></button>}</article>)}</div>
    </section>}

    {wellnessEvents.length > 0 && <section className="content-band upcoming-events"><div className="section-heading"><div><p className="eyebrow">Wellness calendar</p><h3>Upcoming events</h3></div></div><div className="event-widget-list">{wellnessEvents.map((event) => <article key={event.id}><CalendarCheck size={19} /><div><strong>{event.title}</strong><small>{new Date(event.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}{event.registrationStatus === "registered" ? " · Registered" : ""}</small></div></article>)}</div></section>}

    <section className="comparison-grid">
      <div className="content-band"><div className="section-heading"><div><p className="eyebrow">Today</p><h3>Morning vs evening</h3></div><span className="status-pill"><ClipboardCheck size={15} /> {status?.morningComplete && status?.eveningComplete ? "Complete" : "In progress"}</span></div><div className="comparison-table"><header><span>Indicator</span><span>Morning</span><span>Evening</span></header>{["mood", "stress", "workload"].map((key) => <div key={key}><span>{key}</span><b>{morning ? `${morning[key]}/5` : "--"}</b><b>{evening ? `${evening[key]}/5` : "--"}</b></div>)}</div></div>
      <div className="content-band"><h3>Check-in status</h3><div className="status-list"><p><SunMedium size={17} /> Morning: <strong>{status?.morningComplete ? "Completed" : "Not completed"}</strong></p><p><MoonStar size={17} /> Evening: <strong>{status?.eveningComplete ? "Completed" : "Not completed"}</strong></p><p><CalendarCheck size={17} /> Shift: <strong>{status?.workingDay ? `${status.startLabel} - ${status.endLabel}` : "Non-working day"}</strong></p></div></div>
    </section>

    <section className="content-band"><div className="section-heading"><div><p className="eyebrow">Trend</p><h3>Wellbeing score history</h3></div><span className="status-pill"><Sparkles size={15} /> Rule-based score</span></div><TrendChart checkins={checkins} /></section>
  </section>;
}

function riskMessage(riskLevel) {
  if (riskLevel === "at-risk") return "Your signals show elevated pressure.";
  if (riskLevel === "watch") return "A few signals deserve attention.";
  return "Your recent wellbeing looks steady.";
}
