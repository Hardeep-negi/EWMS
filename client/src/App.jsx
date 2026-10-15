import React, { useEffect, useState } from "react";
import { Activity, Bell, CalendarDays, ClipboardCheck, HandHeart, HeartPulse, LayoutDashboard, LogOut, MessageSquareText, MessageSquareWarning, ShieldCheck, Target, UserRound, Users } from "lucide-react";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import Trends from "./pages/Trends";
import Concern from "./pages/Concern";
import Profile from "./pages/Profile";
import HRHome from "./pages/HRHome";
import Goals from "./pages/Goals";
import WeeklyReport from "./pages/WeeklyReport";
import Employees from "./pages/Employees";
import HRTrends from "./pages/HRTrends";
import HRCheckIn from "./pages/HRCheckIn";
import SupportActions from "./pages/SupportActions";
import WellnessCalendar from "./pages/WellnessCalendar";
import Feedback from "./pages/Feedback";
import { useAuth } from "./context/AuthContext";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "checkin", label: "Check-in", icon: ClipboardCheck },
  { id: "trends", label: "Trends", icon: Activity },
  { id: "goals", label: "Goals", icon: Target },
  { id: "report", label: "Weekly report", icon: ClipboardCheck },
  { id: "calendar", label: "Wellness calendar", icon: CalendarDays },
  { id: "concern", label: "Concern", icon: MessageSquareWarning },
  { id: "feedback", label: "Anonymous feedback", icon: MessageSquareText },
  { id: "profile", label: "Profile", icon: UserRound }
];

export default function App() {
  const { user, loading, authMessage, clearAuthMessage, logout } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkInType, setCheckInType] = useState("morning");
  const [supportEmployee, setSupportEmployee] = useState(null);

  useEffect(() => {
    if (!user) setActivePage("dashboard");
  }, [user]);

  useEffect(() => {
    if (!authMessage) return;
    const timer = window.setTimeout(clearAuthMessage, 3000);
    return () => window.clearTimeout(timer);
  }, [authMessage, clearAuthMessage]);

  useEffect(() => {
    if (user?.department) localStorage.setItem("wellbeing-theme", user.department.toLowerCase());
  }, [user]);

  if (loading && !user) {
    return (
      <main className="loading-screen">
        <div className="brand">
          <span className="brand-mark"><HeartPulse size={23} /></span>
          <div>
            <strong>Wellbeing</strong>
            <small>Loading your profile</small>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const isHR = user.role === "hr" || user.role === "admin";
  const availableNav = isHR
    ? [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "employees", label: "Employees", icon: Users },
        { id: "support-actions", label: "Support actions", icon: HandHeart },
        { id: "calendar", label: "Wellness calendar", icon: CalendarDays },
        { id: "feedback", label: "Feedback analysis", icon: MessageSquareText },
        { id: "trends", label: "Trends", icon: Activity },
        { id: "hr-checkin", label: "My check-in", icon: ClipboardCheck },
        { id: "profile", label: "Profile", icon: UserRound }
      ]
    : navItems.filter((item) => item.id !== "checkin");
  const pages = {
    dashboard: isHR ? <HRHome onEmployees={() => setActivePage("employees")} onOfferSupport={(employee) => { setSupportEmployee(employee); setActivePage("support-actions"); }} /> : <Dashboard refreshKey={refreshKey} onCheckIn={(type) => { setCheckInType(type); setActivePage("checkin"); }} />,
    checkin: <CheckIn type={checkInType} onSaved={() => { setRefreshKey((key) => key + 1); setActivePage("dashboard"); }} />,
    trends: isHR ? <HRTrends /> : <Trends refreshKey={refreshKey} />,
    goals: <Goals />,
    report: <WeeklyReport />,
    employees: <Employees onOfferSupport={(employee) => { setSupportEmployee(employee); setActivePage("support-actions"); }} />,
    "support-actions": <SupportActions preselectedEmployee={supportEmployee} onClearSelection={() => setSupportEmployee(null)} />,
    calendar: <WellnessCalendar />,
    feedback: <Feedback />,
    "hr-checkin": <HRCheckIn />,
    concern: <Concern />,
    profile: <Profile />
  };

  return (
    <div className="app-shell" data-theme={user.department?.toLowerCase()}>
      {authMessage && <div className="toast-message" role="status">{authMessage}</div>}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><HeartPulse size={23} /></span>
          <div>
            <strong>Wellbeing</strong>
            <small>{isHR ? "HR portal" : "Employee portal"}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label={isHR ? "HR navigation" : "Employee navigation"}>
          {availableNav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => setActivePage(item.id)} title={item.label}>
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="trust-note">
          <ShieldCheck size={18} />
          <span>{isHR ? "Employee records are scoped to your assigned department." : "Your dashboard shows your personal history. HR/admin views are separate and aggregated."}</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Employee wellbeing monitoring system</p>
            <h1>{availableNav.find((item) => item.id === activePage)?.label || "Dashboard"}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" title="Notifications"><Bell size={19} /></button>
            <div className="user-chip">
              <span>{user.name?.slice(0, 1) || "E"}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.department || "Department"}</small>
              </div>
            </div>
            <button className="icon-button" onClick={logout} title="Log out"><LogOut size={19} /></button>
          </div>
        </header>
        {pages[activePage]}
      </main>
    </div>
  );
}
