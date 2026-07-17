"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={visible ? "text" : "password"}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{ paddingRight: 45 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        style={{ position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
      >
        <i className={visible ? "far fa-eye-slash" : "far fa-eye"}></i>
      </button>
    </div>
  );
}

export default function LoginSignupView() {
  const { setUser } = useAppState();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [signupForm, setSignupForm] = useState({ username: "", password: "", confirm_password: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; user: User; message?: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      setUser(res.user);
      if (res.user.role === "admin") {
        window.location.href = `${process.env.NEXT_PUBLIC_FLASK_ORIGIN || "http://127.0.0.1:5000"}/admin`;
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(signupForm),
      });
      setLoginForm({ username: signupForm.username, password: "" });
      setTab("login");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-body" style={{ background: "#FFFDF0", minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
      <div className="auth-container">
        <div className="auth-card">
          <Link href="/" className="brand-logo-auth">
            Luvt<span>ale</span>
          </Link>

          {error && (
            <div className="flash-messages">
              <div className="alert alert-error" style={{ marginBottom: 15, padding: 10, borderRadius: 8, fontSize: "0.9rem", background: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" }}>
                {error}
              </div>
            </div>
          )}

          <div className="auth-tabs">
            <div className={`auth-tab${tab === "login" ? " active" : ""}`} onClick={() => setTab("login")}>
              Login
            </div>
            <div className={`auth-tab${tab === "signup" ? " active" : ""}`} onClick={() => setTab("signup")}>
              Sign Up
            </div>
          </div>

          <form className={`auth-form${tab === "login" ? " active" : ""}`} onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <PasswordInput
                id="login-password"
                value={loginForm.password}
                onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              Sign In
            </button>
            <div className="auth-footer">
              <p>
                Forgot password? <a href="#">Reset it</a>
              </p>
            </div>
          </form>

          <form className={`auth-form${tab === "signup" ? " active" : ""}`} onSubmit={handleSignup}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Choose a username"
                required
                value={signupForm.username}
                onChange={(e) => setSignupForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <PasswordInput
                id="signup-password"
                value={signupForm.password}
                onChange={(v) => setSignupForm((f) => ({ ...f, password: v }))}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <PasswordInput
                id="signup-confirm-password"
                value={signupForm.confirm_password}
                onChange={(v) => setSignupForm((f) => ({ ...f, confirm_password: v }))}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              Create Account
            </button>
            <div className="auth-footer">
              <p>
                Already have an account?{" "}
                <a href="javascript:void(0)" onClick={() => setTab("login")}>
                  Login
                </a>
              </p>
            </div>
          </form>

          <Link href="/" className="back-home">
            <i className="fas fa-arrow-left"></i> Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}
