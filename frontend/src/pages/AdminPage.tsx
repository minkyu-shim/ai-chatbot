import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { listAllEntries } from "../api/admin";
import type { AdminEntrySummary } from "../types";

/**
 * Admin-only page that lists all users' entries in a simple table.
 * Access is gated by role on the backend; a 403 is surfaced as a friendly message.
 */
export default function AdminPage() {
  const [entries, setEntries] = useState<AdminEntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAllEntries({ limit: 50 })
      .then((data) => {
        setEntries(data);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Access denied";
        // 403 or any error: show a friendly access-denied message
        setError(msg.includes("Failed to fetch") ? "Could not connect to server. Is the backend running?" : msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div style={styles.page}>
      <NavBar />

      <div style={styles.header}>
        <h1 style={styles.title}>Admin — All Entries</h1>
      </div>

      {loading && <p style={styles.status}>Loading…</p>}

      {!loading && error && (
        <div style={styles.errorWrap}>
          <p style={styles.errorMsg}>You don't have access to this page.</p>
          <Link to="/diary" style={styles.backLink}>Back to diary</Link>
        </div>
      )}

      {!loading && !error && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>City</th>
                <th style={styles.th}>Mood</th>
                <th style={styles.th}>Weather</th>
                <th style={styles.th}>Created at</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={styles.tr}>
                  <td style={styles.td}>
                    {new Date(e.entry_date + "T00:00:00").toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td style={styles.td}>{e.user_email}</td>
                  <td style={styles.td}>{e.city}</td>
                  <td style={styles.td}>{e.mood}</td>
                  <td style={styles.td}>
                    {e.weather ? (
                      <span style={styles.weatherChip}>
                        {e.weather.temp !== null ? `${Math.round(e.weather.temp)}°C` : "?°C"}
                        {e.weather.condition ? ` · ${e.weather.condition}` : ""}
                      </span>
                    ) : (
                      <span style={styles.na}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {new Date(e.created_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>No entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100svh",
    textAlign: "left",
  },
  header: {
    padding: "28px 24px 20px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 600,
    letterSpacing: "-0.3px",
    color: "var(--text-h)",
  },
  status: {
    textAlign: "center",
    padding: "48px 0",
    color: "var(--text)",
    fontSize: "15px",
  },
  errorWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "80px 24px",
  },
  errorMsg: {
    margin: 0,
    fontSize: "16px",
    color: "var(--text)",
  },
  backLink: {
    fontSize: "14px",
    color: "var(--accent)",
    textDecoration: "none",
    fontWeight: 500,
  },
  tableWrap: {
    overflowX: "auto",
    padding: "0 24px 40px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "2px solid var(--border)",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "12px",
    color: "var(--text-h)",
    verticalAlign: "middle",
    overflowWrap: "anywhere",
  },
  weatherChip: {
    display: "inline-block",
    fontSize: "12px",
    color: "var(--text)",
    background: "var(--accent-bg)",
    border: "1px solid var(--accent-border)",
    borderRadius: "20px",
    padding: "2px 10px",
    whiteSpace: "nowrap",
  },
  na: {
    color: "var(--border)",
  },
  emptyCell: {
    padding: "24px 12px",
    textAlign: "center",
    color: "var(--text)",
  },
};
