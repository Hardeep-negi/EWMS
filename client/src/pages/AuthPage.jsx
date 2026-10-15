import React, { useState } from "react";
import { ArrowLeft, Building2, HeartPulse, LockKeyhole, Mail, ShieldCheck, UserRound, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const departments = ["Development", "Marketing", "Sales"];

export default function AuthPage() {
  const { authenticate, loading } = useAuth();
  const [portal, setPortal] = useState(() => sessionStorage.getItem("wellbeing-portal"));
  const [mode, setMode] = useState("login");
  const [showPasswords, setShowPasswords] = useState({ password: false, confirmPassword: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", department: "Development", jobTitle: "" });

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function changePortal(nextPortal) {
    sessionStorage.setItem("wellbeing-portal", nextPortal);
    setPortal(nextPortal); setMode("login"); setError(""); setSuccess("");
  }
  function returnToLanding() {
    sessionStorage.removeItem("wellbeing-portal");
    setPortal(null); setError(""); setSuccess("");
  }
  function togglePassword(field) {
    setShowPasswords((current) => ({ ...current, [field]: !current[field] }));
  }

  async function submit(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (mode === "signup" && form.password !== form.confirmPassword) return setError("Passwords do not match.");
    const result = await authenticate(mode, { ...form, portal });
    if (!result.ok) return setError(result.message);
    if (mode === "signup") {
      sessionStorage.setItem("wellbeing-portal", portal);
      setSuccess(result.message); setMode("login");
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    }
  }

  if (!portal) return <main className="portal-landing">
    <div className="landing-nav"><div className="brand"><span className="brand-mark"><HeartPulse size={22} /></span><div><strong>Wellbeing Monitor</strong><small>Employee wellbeing system</small></div></div></div>
    <section className="landing-content"><p className="eyebrow">Private. Department-aware. Supportive.</p><h1>Wellbeing, with the right boundaries.</h1><p>Choose your workspace to securely manage your check-ins, goals, and department support activity.</p>
      <div className="portal-options"><button className="portal-option" onClick={() => changePortal("employee")}><span className="portal-icon employee"><UserRound size={27} /></span><strong>Employee Portal</strong><small>Personal check-ins, concerns, and wellbeing history.</small><span className="portal-link">Continue</span></button><button className="portal-option" onClick={() => changePortal("hr")}><span className="portal-icon hr"><Building2 size={27} /></span><strong>HR Portal</strong><small>Department-based support for your assigned team.</small><span className="portal-link">Continue</span></button></div>
    </section><footer className="landing-footer"><ShieldCheck size={17} /> Wellbeing indicators are not medical diagnoses or employment decisions.</footer>
  </main>;

  const isHR = portal === "hr";
  return <main className="auth-page" data-theme={form.department.toLowerCase()}>
    {success && <div className="toast-message" role="status">{success}</div>}
    <section className="auth-intro"><button className="back-button" onClick={returnToLanding}><ArrowLeft size={18} /> All portals</button><div className="brand large"><span className="brand-mark"><HeartPulse size={25} /></span><div><strong>Wellbeing Monitor</strong><small>{isHR ? "HR portal" : "Employee portal"}</small></div></div><div className="auth-copy"><p className="eyebrow">{isHR ? "Department support workspace" : "Your personal wellbeing space"}</p><h1>{isHR ? "Care begins with responsible access." : "A calmer view of your workday."}</h1><p>{isHR ? "Department support is available within your assigned workspace." : "Your check-ins and concerns stay private, with controls designed for meaningful support."}</p></div><div className="theme-note"><span /><div><strong>{form.department} theme</strong><small>Your department is verified again by the server when you sign in.</small></div></div></section>
    <section className="auth-card"><div className="segmented"><button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>Log in</button><button className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")}>Sign up</button></div><div className="auth-heading"><p className="eyebrow">{isHR ? "HR portal" : "Employee portal"}</p><h2>{mode === "login" ? "Welcome back" : `Create ${isHR ? "HR" : "employee"} account`}</h2></div>
      <form onSubmit={submit}>{mode === "signup" && <><label>Full name<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" required /></label><label>Phone number<input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Your phone number" required /></label></>}<label>Department<select value={form.department} onChange={(e) => update("department", e.target.value)}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>{mode === "signup" && !isHR && <label>Job title<input value={form.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} placeholder="e.g. Frontend developer" required /></label>}<label>Email<div className="input-icon"><Mail size={18} /><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@company.com" required /></div></label><label>Password<div className="input-icon password-field"><LockKeyhole size={18} /><input type={showPasswords.password ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Minimum 6 characters" required minLength="6" /><button type="button" className={form.password ? "password-toggle visible" : "password-toggle"} onClick={() => togglePassword("password")}>{showPasswords.password ? "Hide" : "Show"}</button></div></label>{mode === "signup" && <label>Confirm password<div className="input-icon password-field"><LockKeyhole size={18} /><input type={showPasswords.confirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter your password" required minLength="6" /><button type="button" className={form.confirmPassword ? "password-toggle visible" : "password-toggle"} onClick={() => togglePassword("confirmPassword")}>{showPasswords.confirmPassword ? "Hide" : "Show"}</button></div></label>}{mode === "login" && <a className="forgot-link" href="mailto:hr@company.com?subject=Password%20reset%20request">Forgot password?</a>}{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={loading}><UserPlus size={18} />{loading ? "Please wait" : mode === "login" ? "Log in securely" : "Create account"}</button></form>
    </section>
  </main>;
}
