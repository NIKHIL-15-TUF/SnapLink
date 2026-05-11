import { useState } from "react";
import { register } from "../api/AuthApi";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await register({ email, password });
      localStorage.setItem("token", result.token);
      localStorage.setItem("email", result.email);
      window.location.href = "/";
    } catch {
      setError("Registration failed. This email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-text">
            <span className="auth-logo-dot">Snap</span>Link
          </span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start shortening URLs in seconds — free forever</p>

        {error && (
          <div style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--error)", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label" htmlFor="reg-email">Email address</label>
          <input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            placeholder="Min. 6 characters"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            autoComplete="new-password"
          />
        </div>

        <button className="auth-btn" onClick={handleRegister} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <a href="/login" className="auth-link">Sign in</a>
        </p>
      </div>
    </div>
  );
}
