import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")));
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api.getProfile().then((data) => {
      if (data.user) {
        setUser(data.user);
      }
    }).catch(() => {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [token]);

  async function authenticate(mode, payload) {
    setLoading(true);
    setAuthMessage("");
    try {
      const data = mode === "signup" ? await api.signup(payload) : await api.login(payload);

      if (mode === "signup") {
        setAuthMessage("Sign up successful. Please login.");
        return { ok: true, message: data.message || "Sign up successful. Please login.", verificationRequired: data.verificationRequired, email: data.email };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("token", data.token);
      setAuthMessage(mode === "signup" ? "Sign up successful" : "Login successful");
      return { ok: true, message: "Login successful" };
    } catch (error) {
      return { ok: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmail(payload) {
    setLoading(true);
    try {
      const data = await api.verifyEmail(payload);
      setUser(data.user); setToken(data.token); localStorage.setItem("token", data.token);
      setAuthMessage(data.message || "Email verified.");
      return { ok: true };
    } catch (error) { return { ok: false, message: error.message }; }
    finally { setLoading(false); }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("wellbeing-theme");
    setUser(null);
    setToken(null);
    setAuthMessage("");
  }

  function clearAuthMessage() {
    setAuthMessage("");
  }

  function updateCurrentUser(nextUser) {
    setUser(nextUser);
  }

  const value = useMemo(
    () => ({ user, token, loading, authMessage, authenticate, verifyEmail, logout, clearAuthMessage, updateCurrentUser }),
    [user, token, loading, authMessage]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
