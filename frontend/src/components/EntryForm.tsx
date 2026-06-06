import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

type FormValues = {
  city: string;
  mood: string;
  outfit_worn: string;
};

type Props = {
  onSubmit: (values: FormValues) => void;
  submitting: boolean;
  error: string | null;
};

/**
 * Form to create a new diary entry.
 * Fields: city (required), mood (required), outfit_worn (optional).
 */
export default function EntryForm({ onSubmit, submitting, error }: Props) {
  const [city, setCity] = useState("");
  const [mood, setMood] = useState("");
  const [outfitWorn, setOutfitWorn] = useState("");

  const canSubmit = city.trim() !== "" && mood.trim() !== "" && !submitting;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ city: city.trim(), mood: mood.trim(), outfit_worn: outfitWorn.trim() });
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={styles.form}>
      {error && (
        <div style={styles.errorBox} role="alert">
          {error}
        </div>
      )}

      <div style={styles.field}>
        <label htmlFor="city" style={styles.label}>
          City <span style={styles.required}>*</span>
        </label>
        <input
          id="city"
          type="text"
          required
          placeholder="e.g. Paris"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={submitting}
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label htmlFor="mood" style={styles.label}>
          Mood <span style={styles.required}>*</span>
        </label>
        <input
          id="mood"
          type="text"
          required
          placeholder="e.g. tired, energetic, anxious"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          disabled={submitting}
          style={styles.input}
        />
        <span style={styles.helper}>e.g. tired, energetic, anxious</span>
      </div>

      <div style={styles.field}>
        <label htmlFor="outfit_worn" style={styles.label}>
          What I plan to wear <span style={styles.optional}>(optional)</span>
        </label>
        <textarea
          id="outfit_worn"
          rows={3}
          placeholder="Describe your planned outfit…"
          value={outfitWorn}
          onChange={(e) => setOutfitWorn(e.target.value)}
          disabled={submitting}
          style={styles.textarea}
        />
      </div>

      <div style={styles.actions}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...styles.submitBtn,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Creating entry…" : "Create entry"}
        </button>

        <Link to="/diary" style={styles.cancelLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

// Re-export FormValues type for page use
export type { FormValues as EntryFormValues };

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  errorBox: {
    marginBottom: "12px",
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
  required: {
    color: "#dc2626",
  },
  optional: {
    fontWeight: 400,
    color: "var(--text)",
    fontSize: "13px",
  },
  helper: {
    fontSize: "12px",
    color: "var(--text)",
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
  textarea: {
    padding: "9px 12px",
    fontSize: "15px",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    background: "var(--bg)",
    color: "var(--text-h)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: "1.5",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginTop: "8px",
  },
  submitBtn: {
    padding: "10px 24px",
    fontSize: "15px",
    fontWeight: 500,
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
  },
  cancelLink: {
    fontSize: "14px",
    color: "var(--text)",
    textDecoration: "none",
  },
};
