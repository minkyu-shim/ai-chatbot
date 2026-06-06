import { Link } from "react-router-dom";
import type { EntrySummary } from "../types";
import EntryCard from "./EntryCard";

type Props = {
  entries: EntrySummary[];
  loading: boolean;
  error: string | null;
};

/**
 * Renders the full list of diary entry cards, or appropriate loading/empty/error states.
 */
export default function EntryFeed({ entries, loading, error }: Props) {
  if (loading) {
    return <p style={styles.status}>Loading entries…</p>;
  }

  if (error) {
    return (
      <div style={styles.errorBox} role="alert">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={styles.emptyWrap}>
        <div style={styles.emptyCard}>
          <p style={styles.emptyTitle}>No entries yet</p>
          <p style={styles.emptyHint}>Start tracking your daily outfit by adding your first entry.</p>
          <Link to="/diary/new" style={styles.emptyLink}>
            Add your first entry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.feed}>
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  status: {
    textAlign: "center",
    padding: "48px 0",
    color: "var(--text)",
    fontSize: "15px",
  },
  errorBox: {
    margin: "24px",
    padding: "12px 16px",
    background: "rgba(220, 38, 38, 0.1)",
    border: "1px solid rgba(220, 38, 38, 0.4)",
    borderRadius: "8px",
    color: "#dc2626",
    fontSize: "14px",
  },
  emptyWrap: {
    display: "flex",
    justifyContent: "center",
    padding: "48px 24px",
  },
  emptyCard: {
    maxWidth: "360px",
    textAlign: "center",
    padding: "40px 32px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    boxShadow: "var(--shadow)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "center",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-h)",
  },
  emptyHint: {
    margin: 0,
    fontSize: "14px",
    color: "var(--text)",
    lineHeight: "1.5",
  },
  emptyLink: {
    marginTop: "8px",
    display: "inline-block",
    padding: "9px 20px",
    background: "var(--accent)",
    color: "#fff",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
  },
  feed: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "0 24px 40px",
  },
};
