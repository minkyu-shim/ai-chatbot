import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main style={styles.page}>
      {/* Header bar */}
      <header style={styles.header}>
        <span style={styles.appName}>LLM Chat</span>
        <div style={styles.headerRight}>
          <span style={styles.emailLabel}>{user?.email}</span>
          <span
            style={{
              ...styles.roleBadge,
              background:
                user?.role === "admin"
                  ? "rgba(234, 88, 12, 0.15)"
                  : "var(--accent-bg)",
              color: user?.role === "admin" ? "#ea580c" : "var(--accent)",
              borderColor:
                user?.role === "admin"
                  ? "rgba(234, 88, 12, 0.4)"
                  : "var(--accent-border)",
            }}
          >
            {user?.role}
          </span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Log out
          </button>
        </div>
      </header>

      {/* Chat stub panel */}
      <section style={styles.chatPanel}>
        <div style={styles.stubContent}>
          <p style={styles.stubTitle}>Chat coming in M3</p>
          <p style={styles.stubSubtitle}>
            The streaming chat interface will be implemented here.
          </p>
        </div>
      </section>
    </main>
  );
}

// ── Inline styles ─────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100svh",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg)",
    flexShrink: 0,
  },
  appName: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-h)",
    fontFamily: "var(--heading)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  emailLabel: {
    fontSize: "14px",
    color: "var(--text)",
  },
  roleBadge: {
    padding: "2px 10px",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "999px",
    border: "1px solid",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  logoutButton: {
    padding: "6px 14px",
    fontSize: "14px",
    fontWeight: 500,
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    cursor: "pointer",
    color: "var(--text-h)",
  },
  chatPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stubContent: {
    textAlign: "center",
    padding: "48px 24px",
    border: "1px dashed var(--border)",
    borderRadius: "12px",
    maxWidth: "400px",
  },
  stubTitle: {
    fontSize: "20px",
    fontWeight: 500,
    color: "var(--text-h)",
    marginBottom: "8px",
  },
  stubSubtitle: {
    fontSize: "14px",
    color: "var(--text)",
    margin: 0,
  },
};
