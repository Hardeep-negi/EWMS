import React, { useEffect, useState } from "react";
import { ArrowLeft, Building2, HeartPulse, LockKeyhole, Mail, ShieldCheck, UserRound, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const departments = ["Development", "Marketing", "Sales"];
const pendingOtpEmailKey = "wellbeing-pending-otp-email";
const pendingOtpPortalKey = "wellbeing-pending-otp-portal";
const pendingOtpExpiryKey = "wellbeing-pending-otp-expiry";

function secondsUntil(expiry) {
  return expiry ? Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / 1000)) : 0;
}

export default function AuthPage() {
  const { authenticate, verifyEmail, loading } = useAuth();
  const [portal, setPortal] = useState(() => sessionStorage.getItem(pendingOtpPortalKey) || sessionStorage.getItem("wellbeing-portal"));
  const [mode, setMode] = useState("login");
  const [showPasswords, setShowPasswords] = useState({ password: false, confirmPassword: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verificationEmail, setVerificationEmail] = useState(() => sessionStorage.getItem(pendingOtpEmailKey) || "");
  const [otp, setOtp] = useState("");
  const [otpMode, setOtpMode] = useState(() => Boolean(sessionStorage.getItem(pendingOtpEmailKey)));
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState(() => sessionStorage.getItem(pendingOtpExpiryKey) || "");
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(() => secondsUntil(sessionStorage.getItem(pendingOtpExpiryKey)));
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", department: "Development", jobTitle: "" });

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function changePortal(nextPortal) {
    sessionStorage.removeItem(pendingOtpEmailKey);
    sessionStorage.removeItem(pendingOtpPortalKey);
    sessionStorage.removeItem(pendingOtpExpiryKey);
    sessionStorage.setItem("wellbeing-portal", nextPortal);
    setPortal(nextPortal); setMode("login"); setError(""); setSuccess("");
  }
  function returnToLanding() {
    sessionStorage.removeItem(pendingOtpEmailKey);
    sessionStorage.removeItem(pendingOtpPortalKey);
    sessionStorage.removeItem(pendingOtpExpiryKey);
    sessionStorage.removeItem("wellbeing-portal");
    setPortal(null); setError(""); setSuccess("");
  }
  function togglePassword(field) {
    setShowPasswords((current) => ({ ...current, [field]: !current[field] }));
  }
  function openOtp(email, message, expiry) {
    const expiresAt = expiry || new Date(Date.now() + 5 * 60_000).toISOString();
    sessionStorage.setItem(pendingOtpEmailKey, email);
    sessionStorage.setItem(pendingOtpPortalKey, portal);
    sessionStorage.setItem(pendingOtpExpiryKey, expiresAt);
    setVerificationEmail(email);
    setOtpMode(true);
    setOtpExpiresAt(expiresAt);
    setOtpSecondsLeft(secondsUntil(expiresAt));
    setResendSeconds(60);
    setSuccess(message);
  }
  useEffect(() => {
    if (!otpMode || resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [otpMode, resendSeconds]);
  useEffect(() => {
    if (!otpMode || !otpExpiresAt) return undefined;
    const update = () => setOtpSecondsLeft(secondsUntil(otpExpiresAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [otpMode, otpExpiresAt]);
  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(""), 60_000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function submit(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (mode === "signup" && form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (mode === "signup" && portal === "super-admin" && form.password.length < 8) return setError("Password must be at least 8 characters.");
    let result;
    if (mode === "signup" && portal === "super-admin") {
      try { const data = await api.superAdminSignup(form); openOtp(data.email, data.message, data.otpExpiresAt); return; }
      catch (err) { return setError(err.message); }
    }
    result = await authenticate(mode, { ...form, portal });
    if (!result.ok) {
      if (mode === "login" && /verify your email/i.test(result.message)) {
        openOtp(form.email.trim().toLowerCase(), "Enter the verification code sent to your email.");
        return;
      }
      return setError(result.message);
    }
    if (mode === "signup") {
      if (result.verificationRequired) { openOtp(result.email || form.email, result.message, result.otpExpiresAt); return; }
      sessionStorage.setItem("wellbeing-portal", portal);
      setSuccess(result.message); setMode("login");
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    }
  }

  async function submitOtp(event) {
    event.preventDefault(); setError("");
    if (otpSecondsLeft <= 0) return setError("This verification code has expired. Request a new code.");
    const result = await verifyEmail({ email: verificationEmail, code: otp });
    if (!result.ok) setError(result.message);
    else {
      sessionStorage.removeItem(pendingOtpEmailKey);
      sessionStorage.removeItem(pendingOtpPortalKey);
      sessionStorage.removeItem(pendingOtpExpiryKey);
    }
  }
  async function resendOtp() {
    if (resendSeconds > 0) return;
    setError("");
    try {
      const data = await api.resendOtp({ email: verificationEmail });
      if (data.otpExpiresAt) openOtp(verificationEmail, "A new code has been sent.", data.otpExpiresAt);
      else setSuccess(data.message);
      setOtp("");
    } catch (err) { setError(err.message); }
  }

  if (!portal) return <main className="portal-landing">
    <div className="landing-nav"><div className="brand"><span className="brand-mark"><HeartPulse size={22} /></span><div><strong>Wellbeing Monitor</strong><small>Employee wellbeing system</small></div></div><button className="secondary-button" onClick={() => changePortal("super-admin")}>Super Admin</button></div>
    <section className="landing-content"><p className="eyebrow">Private. Department-aware. Supportive.</p><h1>Wellbeing, with the right boundaries.</h1><p>Choose your workspace to securely manage your check-ins, goals, and department support activity.</p>
      <div className="portal-options"><button className="portal-option" onClick={() => changePortal("employee")}><span className="portal-icon employee"><UserRound size={27} /></span><strong>Employee Portal</strong><small>Personal check-ins, concerns, and wellbeing history.</small><span className="portal-link">Continue</span></button><button className="portal-option" onClick={() => changePortal("hr")}><span className="portal-icon hr"><Building2 size={27} /></span><strong>HR Portal</strong><small>Department-based support for your assigned team.</small><span className="portal-link">Continue</span></button></div>
    </section><footer className="landing-footer"><ShieldCheck size={17} /> Wellbeing indicators are not medical diagnoses or employment decisions.</footer>
  </main>;

  const isHR = portal === "hr"; const isAdmin = portal === "super-admin";
  return <main className="auth-page" data-theme={form.department.toLowerCase()}>
    {success && <div className="toast-message" role="status">{success}</div>}
    <section className="auth-intro"><button className="back-button" onClick={returnToLanding}><ArrowLeft size={18} /> All portals</button><div className="brand large"><span className="brand-mark"><HeartPulse size={25} /></span><div><strong>Wellbeing Monitor</strong><small>{isAdmin ? "Super Admin portal" : isHR ? "HR portal" : "Employee portal"}</small></div></div><div className="auth-copy"><p className="eyebrow">{isHR ? "Department support workspace" : isAdmin ? "Department administration" : "Your personal wellbeing space"}</p><h1>{isHR ? <>Care begins with responsible<br />access.</> : <>A calmer view of your<br />workday.</>}</h1><p>{isHR ? "Department support is available within your assigned workspace." : isAdmin ? "Manage HR approvals and employee records for your department." : "Your check-ins and concerns stay private, with controls designed for meaningful support."}</p></div><div className="theme-note"><span /><div><strong>{form.department} theme</strong><small>Your department is verified again by the server when you sign in.</small></div></div></section>
    <section className="auth-card">{otpMode ? <><div className="auth-heading"><p className="eyebrow">Email verification</p><h2>Enter your six-digit code</h2><p className="soft-copy">We sent a code to {verificationEmail}.</p><p className={otpSecondsLeft > 0 ? "otp-countdown" : "otp-countdown expired"}>{otpSecondsLeft > 0 ? `Code expires in ${Math.floor(otpSecondsLeft / 60)}:${String(otpSecondsLeft % 60).padStart(2, "0")}` : "This code has expired. Request a new code."}</p></div><form onSubmit={submitOtp}><label>Verification code<input inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={loading}>Verify email</button><button type="button" className="secondary-button" onClick={resendOtp} disabled={resendSeconds > 0}>{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}</button></form></> : <><div className="segmented"><button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>Log in</button><button className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")}>Sign up</button></div><div className="auth-heading"><p className="eyebrow">{isAdmin ? "Super Admin portal" : isHR ? "HR portal" : "Employee portal"}</p><h2>{mode === "login" ? "Welcome back" : `Create ${isAdmin ? "Super Admin" : isHR ? "HR" : "employee"} account`}</h2></div>
      <form onSubmit={submit}>{mode === "signup" && <><label>Full name<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" required /></label>{!isAdmin && <label>Phone number<input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Your phone number" required /></label>}</>}<label>Department<select value={form.department} onChange={(e) => update("department", e.target.value)}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>{mode === "signup" && !isHR && !isAdmin && <label>Job title<input value={form.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} placeholder="e.g. Frontend developer" required /></label>}<label>Email<div className="input-icon"><Mail size={18} /><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@company.com" required /></div></label><label>Password<div className="input-icon password-field"><LockKeyhole size={18} /><input type={showPasswords.password ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder={isAdmin ? "Minimum 8 characters" : "Minimum 6 characters"} required minLength={isAdmin ? 8 : 6} /><button type="button" className={form.password ? "password-toggle visible" : "password-toggle"} onClick={() => togglePassword("password")}>{showPasswords.password ? "Hide" : "Show"}</button></div></label>{mode === "signup" && <label>Confirm password<div className="input-icon password-field"><LockKeyhole size={18} /><input type={showPasswords.confirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter your password" required minLength={isAdmin ? 8 : 6} /><button type="button" className={form.confirmPassword ? "password-toggle visible" : "password-toggle"} onClick={() => togglePassword("confirmPassword")}>{showPasswords.confirmPassword ? "Hide" : "Show"}</button></div></label>}{mode === "login" && <a className="forgot-link" href="mailto:hr@company.com?subject=Password%20reset%20request">Forgot password?</a>}{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={loading}><UserPlus size={18} />{loading ? "Please wait" : mode === "login" ? "Log in securely" : "Create account"}</button></form></>}
    </section>
  </main>;
}
