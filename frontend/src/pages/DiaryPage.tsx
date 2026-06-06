import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import EntryFeed from "../components/EntryFeed";
import { listEntries } from "../api/entries";
import type { EntrySummary } from "../types";

/**
 * Main diary listing page — shows all entries in reverse-chronological order.
 */
export default function DiaryPage() {
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEntries({ limit: 30 })
      .then((data) => {
        setEntries(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load entries");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div style={styles.page}>
      <NavBar />

      <div style={styles.header}>
        <h1 style={styles.title}>Your diary</h1>
        <Link to="/diary/new" style={styles.newButton}>
          New entry
        </Link>
      </div>

      <EntryFeed entries={entries} loading={loading} error={error} />
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "28px 24px 20px",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    fontWeight: 600,
    letterSpacing: "-0.4px",
    color: "var(--text-h)",
  },
  newButton: {
    padding: "9px 18px",
    background: "var(--accent)",
    color: "#fff",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
  },
};
