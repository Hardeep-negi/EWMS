import React, { useEffect, useMemo, useState } from "react";
import { AlarmClock, CalendarCheck, ClipboardCheck, HandHeart, MoonStar, Sparkles, SunMedium, X } from "lucide-react";
import MetricCard from "../components/MetricCard";
import TrendChart from "../components/TrendChart";
import { api } from "../services/api";
import WellnessReminder from "../components/WellnessReminder";
import CheckinHeatmap from "../components/CheckinHeatmap";

function formatDuration(minutes) {
  const safe = Math.max(0, Number(minutes || 0));
  return `${Math.floor(safe / 60)}h ${safe % 60}m`;
}

function formatSubmittedAt(checkin) {
  const value = checkin?.checkInAt || checkin?.createdAt;
  return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not recorded";
}

function latestByType(checkins, type) {
  return checkins.find((item) => item.type === type) || null;
}

export default function Dashboard({ refreshKey, onCheckIn }) {
  const [checkins, setCheckins] = useState([]);
  const [status, setStatus] = useState(null);
  const [supportActions, setSupportActions] = useState([]);
  const [wellnessEvents, setWellnessEvents] = useState([]);
  const [reminderType, setReminderType] = useState("");

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
        const morningDismissed = localStorage.getItem(`morning-reminder-${statusData.status.shiftDate}`);
        const eveningDismissed = localStorage.getItem(`evening-reminder-${statusData.status.shiftDate}`);
        if (statusData.status.inShift && !statusData.status.morningComplete && !morningDismissed) setReminderType("morning");
        else if (statusData.status.eveningDue && !statusData.status.eveningComplete && !eveningDismissed) setReminderType("evening");
        else setReminderType("");
      } catch {
        if (active) { setCheckins([]); setStatus(null); setSupportActions([]); setWellnessEvents([]); }
      }
    }
    load();
    const interval = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(interval); };
  }, [refreshKey]);

  const latest = checkins[0];
  const morning = status?.morning || null;
  const evening = status?.evening || null;
  const average = useMemo(() => checkins.length ? Math.round(checkins.reduce((sum, item) => sum + Number(item.wellbeingScore || 0), 0) / checkins.length) : 0, [checkins]);
  const overtime = status?.evening?.plannedOvertimeHours || 0;
  const compensation = status?.evening?.expectedCompensation || 0;

  function dismissReminder() {
    if (status?.shiftDate && reminderType) localStorage.setItem(`${reminderType}-reminder-${status.shiftDate}`, "true");
    setReminderType("");
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
    <WellnessReminder />
    {reminderType && <div className="checkin-reminder" role="dialog" aria-label={`${reminderType} check-in reminder`}>
      <div>{reminderType === "morning" ? <SunMedium size={20} /> : <MoonStar size={20} />}<div><strong>{reminderType === "morning" ? "Start your shift with a quick check-in" : "Your evening check-in is due"}</strong><span>{reminderType === "morning" ? "Your time since check-in is calculated from the saved server timestamp." : "Record how your day finished when practical."}</span></div></div>
      <div className="reminder-actions"><button className="secondary-button" onClick={dismissReminder}>Later</button><button className="primary-button" onClick={() => { const current = reminderType; dismissReminder(); onCheckIn(current); }}>Open {reminderType} check-in</button><button className="plain-icon-button" aria-label="Dismiss reminder" onClick={dismissReminder}><X size={18} /></button></div>
    </div>}

    <div className="hero-band dashboard-intro">
      <div><p className="eyebrow">Personal wellbeing snapshot</p><h2>{latest ? riskMessage(latest.riskLevel) : "Start with your morning check-in"}</h2><p>Wellbeing scores summarize your own answers. They are not a medical assessment or employment decision.</p></div>
      <div className="checkin-actions">
        <button className={status?.morningComplete ? "completed-button" : "primary-button"} disabled={status?.morningComplete} onClick={() => onCheckIn("morning")}><SunMedium size={18} /> {status?.morningComplete ? "Morning complete" : "Morning check-in"}</button>
        <button className={status?.eveningComplete ? "completed-button" : "secondary-button"} disabled={status?.eveningComplete} onClick={() => onCheckIn("evening")}><MoonStar size={18} /> {status?.eveningComplete ? "Evening complete" : "Evening check-in"}</button>
      </div>
    </div>

    <section className="shift-clock"><div className="clock-icon"><AlarmClock size={26} /></div><div><p className="eyebrow">Time since morning check-in</p><strong>{status?.morningComplete ? formatDuration(status.elapsedMinutes) : "Not started"}</strong><span>{status?.morningComplete ? `${status.running ? "Within scheduled shift" : "Scheduled shift ended"} · ${status.startLabel} - ${status.endLabel}` : `Scheduled shift: ${status?.startLabel || "9:00 AM"} - ${status?.endLabel || "5:00 PM"}`}</span></div><div className="clock-detail"><span>Remaining scheduled time</span><strong>{status?.morningComplete ? formatDuration(status.remainingMinutes) : "--"}</strong></div></section>

    <div className="metrics-grid">
      <MetricCard label="Latest score" value={latest?.wellbeingScore ?? "--"} detail={latest ? `${latest.riskLevel.replace("-", " ")} status` : "No check-in yet"} tone={latest?.riskLevel || "neutral"} />
      <MetricCard label="Average score" value={average || "--"} detail={`${checkins.length} saved check-ins`} />
      <MetricCard label="Shift status" value={status?.inShift ? "In shift" : "Outside shift"} detail={`${status?.startLabel || "9:00 AM"} - ${status?.endLabel || "5:00 PM"}`} />
      <MetricCard label="Planned overtime" value={overtime ? `${overtime}h` : "None"} detail={overtime ? `Expected INR ${compensation}` : "Set in evening check-in"} />
    </div>

    <CheckinHeatmap checkins={checkins} />

    {supportActions.length > 0 && <section className="content-band support-updates">
      <div className="section-heading"><div><p className="eyebrow">HR follow-up</p><h3>Support updates</h3></div><span className="status-pill"><HandHeart size={15} /> {supportActions.length} update{supportActions.length === 1 ? "" : "s"}</span></div>
      <div className="support-update-list">{supportActions.map((action) => <article key={action.id}><HandHeart size={19} /><div><strong>{action.title}</strong><p>{action.employeeMessage || "HR has recorded a support update."}</p>{action.meetingAt && <small>Meeting scheduled for {new Date(action.meetingAt).toLocaleString()}</small>}{action.leaveDecision !== "not-applicable" && <small>Leave request: {action.leaveDecision}</small>}{action.assignedPerson && <small>Support contact: {action.assignedPerson}</small>}</div>{["completed", "closed"].includes(action.status) && <button className="plain-icon-button dismiss-support" aria-label="Remove resolved support update" title="Remove resolved update" onClick={() => dismissSupportUpdate(action.id)}><X size={18} /></button>}</article>)}</div>
    </section>}

    {wellnessEvents.length > 0 && <section className="content-band upcoming-events"><div className="section-heading"><div><p className="eyebrow">Wellness calendar</p><h3>Upcoming events</h3></div></div><div className="event-widget-list">{wellnessEvents.map((event) => <article key={event.id}><CalendarCheck size={19} /><div><strong>{event.title}</strong><small>{new Date(event.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}{event.registrationStatus === "registered" ? " · Registered" : ""}</small></div></article>)}</div></section>}

    <section className="comparison-grid">
      <div className="content-band"><div className="section-heading"><div><p className="eyebrow">Current shift</p><h3>Morning vs evening</h3></div><span className="status-pill"><ClipboardCheck size={15} /> {status?.shiftDate || "Today"}</span></div><div className="comparison-table"><header><span>Indicator</span><span>Morning</span><span>Evening</span></header>{["mood", "stress", "workload"].map((key) => <div key={key}><span>{key}</span><b>{morning ? `${morning[key]}/5` : "Pending"}</b><b>{evening ? `${evening[key]}/5` : "Pending"}</b></div>)}<div><span>Submitted</span><b>{formatSubmittedAt(morning)}</b><b>{formatSubmittedAt(evening)}</b></div><div><span>Planned overtime</span><b>Not recorded</b><b>{evening?.plannedOvertimeHours ? `${evening.plannedOvertimeHours}h · INR ${evening.expectedCompensation || 0}` : "None"}</b></div></div></div>
      <div className="content-band"><h3>Check-in status</h3><div className="status-list"><p><SunMedium size={17} /> Morning: <strong>{status?.morningStatus || "Pending"}</strong></p><p><MoonStar size={17} /> Evening: <strong>{status?.eveningStatus || "Not due"}</strong></p><p><CalendarCheck size={17} /> Current shift: <strong>{status?.inShift ? "In progress" : "Outside scheduled hours"}</strong></p></div></div>
    </section>

    <section className="content-band"><div className="section-heading"><div><p className="eyebrow">Trend</p><h3>Wellbeing score history</h3></div><span className="status-pill"><Sparkles size={15} /> Rule-based score</span></div><TrendChart checkins={checkins} /></section>
  </section>;
}

function riskMessage(riskLevel) {
  if (riskLevel === "at-risk") return "Your signals show elevated pressure.";
  if (riskLevel === "watch") return "A few signals deserve attention.";
  return "Your recent wellbeing looks steady.";
}
