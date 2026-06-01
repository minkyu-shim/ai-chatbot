import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sign in</h1>
        <p style={styles.subtitle}>LLM Chat — EPITA S4</p>

        {error && (
          <div style={styles.errorBox} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={styles.switchLink}>
          Don't have an account?{" "}
          <Link to="/signup" style={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

// ── Inline styles ─────────────────────────────────────────────────────────────
// Using inline styles to avoid adding a CSS file dependency; keeps the
// component self-contained and easy to swap out for a proper design system.

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100svh",
    padding: "24px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "40px 36px",
    boxShadow: "var(--shadow)",
  },
  title: {
    margin: "0 0 4px",
    fontSize: "28px",
    letterSpacing: "-0.5px",
    color: "var(--text-h)",
  },
  subtitle: {
    margin: "0 0 28px",
    fontSize: "14px",
    color: "var(--text)",
  },
  errorBox: {
    marginBottom: "16px",
    padding: "10px 14px",
    background: "rgba(220, 38, 38, 0.1)",
    border: "1px solid rgba(220, 38, 38, 0.4)",
    borderRadius: "6px",
    color: "#dc2626",
    fontSize: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "16px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-h)",
  },
  input: {
    padding: "9px 12px",
    fontSize: "15px",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    background: "var(--bg)",
    color: "var(--text-h)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    marginTop: "8px",
    padding: "10px",
    fontSize: "15px",
    fontWeight: 500,
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  switchLink: {
    marginTop: "20px",
    fontSize: "14px",
    textAlign: "center",
    color: "var(--text)",
  },
  link: {
    color: "var(--accent)",
    textDecoration: "none",
    fontWeight: 500,
  },
};
