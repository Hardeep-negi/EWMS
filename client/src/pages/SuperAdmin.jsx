import React, { useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { api } from "../services/api";

function AccountStatus({ status }) {
  return <span className={`admin-status ${status}`}>{status}</span>;
}

export default function SuperAdmin({ section = "dashboard" }) {
  const [stats, setStats] = useState(null);
  const [hr, setHr] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [hrQuery, setHrQuery] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [dashboard, hrData, employeeData] = await Promise.all([
        api.getSuperAdminDashboard(), api.getSuperAdminHr(), api.getSuperAdminEmployees()
      ]);
      setStats(dashboard); setHr(hrData.hr || []); setEmployees(employeeData.employees || []); setError("");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function decide(person, action) {
    if (action === "reject" && !window.confirm(`Reject ${person.name}'s HR registration?`)) return;
    try {
      if (action === "approve") await api.approveHr(person.id);
      else await api.rejectHr(person.id);
      await load();
    } catch (err) { setError(err.message); }
  }

  const pending = hr.filter((person) => person.accessStatus === "pending");
  const filteredHr = useMemo(() => {
    const term = hrQuery.trim().toLowerCase();
    return term ? hr.filter((person) => `${person.name} ${person.email} ${person.phone}`.toLowerCase().includes(term)) : hr;
  }, [hr, hrQuery]);
  const filteredEmployees = useMemo(() => {
    const term = employeeQuery.trim().toLowerCase();
    return term ? employees.filter((person) => `${person.name} ${person.email} ${person.phone} ${person.jobTitle}`.toLowerCase().includes(term)) : employees;
  }, [employees, employeeQuery]);
  const actions = (person) => person.accessStatus === "pending" && <div className="admin-actions">
    <button className="approve-action" onClick={() => decide(person, "approve")}><Check size={16} /> Approve</button>
    <button className="reject-action" onClick={() => decide(person, "reject")}><X size={16} /> Reject</button>
  </div>;
  const hrTable = (people, empty) => <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Department</th><th>Check-in</th><th>Status</th><th>Actions</th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><td>{person.name}</td><td>{person.email}</td><td>{person.phone || "—"}</td><td>{person.department}</td><td>{person.checkin}</td><td><AccountStatus status={person.accessStatus} /></td><td>{actions(person) || "—"}</td></tr>)}{!loading && !people.length && <tr><td colSpan="7" className="admin-empty">{empty}</td></tr>}</tbody></table></div>;

  if (loading && !stats) return <section className="page-stack"><p className="soft-copy">Loading department records…</p></section>;
  if (section === "hr") return <section className="page-stack super-admin-page"><div className="section-heading"><div><p className="eyebrow">Department directory</p><h2>HR accounts</h2></div><label className="admin-search"><Search size={17} /><input aria-label="Search HR accounts" placeholder="Search name, email, or phone" value={hrQuery} onChange={(event) => setHrQuery(event.target.value)} /></label></div>{error && <p className="form-error">{error}</p>}{hrTable(filteredHr, "No HR accounts match your search.")}</section>;
  if (section === "employees") return <section className="page-stack super-admin-page"><div className="section-heading"><div><p className="eyebrow">Department directory</p><h2>Employees</h2></div><label className="admin-search"><Search size={17} /><input aria-label="Search employees" placeholder="Search name, email, phone, or role" value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} /></label></div>{error && <p className="form-error">{error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name / role</th><th>Email</th><th>Phone</th><th>Department</th><th>Wellbeing score</th><th>Check-in status</th><th>Account status</th></tr></thead><tbody>{filteredEmployees.map((person) => <tr key={person.id}><td><strong>{person.name}</strong><small>{person.jobTitle || "Employee"}</small></td><td>{person.email}</td><td>{person.phone || "—"}</td><td>{person.department}</td><td>{person.wellbeingScore ?? "Not available"}</td><td>{person.checkinStatus}</td><td><AccountStatus status={person.emailVerified ? person.accessStatus : "unverified"} /></td></tr>)}{!loading && !filteredEmployees.length && <tr><td colSpan="7" className="admin-empty">No employees match your search.</td></tr>}</tbody></table></div></section>;
  return <section className="page-stack super-admin-page"><section className="hero-band"><div><p className="eyebrow">Department Super Admin</p><h2>{stats?.department || "Department"} administration</h2><p>Review account totals and decide pending HR registrations.</p></div></section>{error && <p className="form-error">{error}</p>}{stats && <div className="metrics-grid admin-metrics">{[["Total employees", stats.employees], ["Total HR", stats.hrs], ["Pending HR approvals", stats.pendingHr], ["HR checked in today", `${stats.hrCheckedIn} / ${Math.max(0, stats.hrs - stats.pendingHr)}`]].map(([label, value]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}<section className="content-band"><div className="section-heading"><div><p className="eyebrow">Action required</p><h2>Pending HR approvals</h2></div></div>{hrTable(pending, "There are no pending HR approvals.")}</section></section>;
}
