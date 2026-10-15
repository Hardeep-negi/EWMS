import React from "react";
import { BellRing, MailCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  return (
    <section className="page-stack">
      <section className="profile-header">
        <div className="avatar-large">{user.name?.slice(0, 1) || "E"}</div>
        <div>
          <p className="eyebrow">Employee profile</p>
          <h2>{user.name}</h2>
          <p>{user.jobTitle || "Employee"} · {user.department || "General"}</p>
        </div>
      </section>
      <section className="split-grid">
        <div className="content-band">
          <h3>Account details</h3>
          <dl className="detail-list">
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Role</dt><dd>{user.role || "employee"}</dd></div>
            <div><dt>Department</dt><dd>{user.department || "General"}</dd></div>
          </dl>
        </div>
        <div className="content-band">
          <h3>Preferences</h3>
          <label className="checkbox-row"><input type="checkbox" defaultChecked /> <BellRing size={17} /> Weekly check-in reminder</label>
          <label className="checkbox-row"><input type="checkbox" defaultChecked /> <MailCheck size={17} /> Personal trend summary email</label>
        </div>
      </section>
    </section>
  );
}
