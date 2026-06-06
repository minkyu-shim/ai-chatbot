import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/**
 * Top navigation bar — brand name left, diary link centre-ish, user email + logout right.
 */
export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav style={styles.nav}>
      {/* Brand */}
      <Link to="/diary" style={styles.brand}>
        Weathering With You
      </Link>

      {/* Right side: email + logout */}
      <div style={styles.right}>
        {user && (
          <span style={styles.email}>{user.email}</span>
        )}
        <button onClick={handleLogout} style={styles.logoutBtn} type="button">
          Sign out
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: "56px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg)",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  brand: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--accent)",
    textDecoration: "none",
    letterSpacing: "-0.2px",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  email: {
    fontSize: "13px",
    color: "var(--text)",
  },
  logoutBtn: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-h)",
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "5px 12px",
    cursor: "pointer",
  },
};
