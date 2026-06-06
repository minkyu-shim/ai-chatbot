import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import EntryForm, { type EntryFormValues } from "../components/EntryForm";
import { createEntry } from "../api/entries";
import { ApiError } from "../api/client";

/**
 * Page for creating a new diary entry.
 * On success, redirects to the entry detail page to start streaming the suggestion.
 */
export default function NewEntryPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: EntryFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      const entry = await createEntry({
        city: values.city,
        mood: values.mood,
        outfit_worn: values.outfit_worn || null,
      });
      navigate(`/diary/${entry.id}`, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 502) {
        // City lookup failed on the backend
        const detail = err.message;
        if (detail.toLowerCase().includes("city not found")) {
          setError(`Could not find city: ${values.city}`);
        } else {
          setError(detail);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to create entry");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <NavBar />

      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>New entry</h1>
          <p style={styles.subtitle}>Tell us where you are and how you feel today.</p>

          <EntryForm onSubmit={handleSubmit} submitting={submitting} error={error} />
        </div>
      </div>
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
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "40px 24px",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "36px 32px",
    boxShadow: "var(--shadow)",
  },
  title: {
    margin: "0 0 4px",
    fontSize: "24px",
    fontWeight: 600,
    letterSpacing: "-0.4px",
    color: "var(--text-h)",
  },
  subtitle: {
    margin: "0 0 28px",
    fontSize: "14px",
    color: "var(--text)",
  },
};
