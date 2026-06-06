import { useState } from "react";
import type { Entry } from "../types";
import { updateEntry } from "../api/entries";

type Props = {
  entry: Entry;
  onSaved: (updated: Entry) => void;
};

/**
 * Lets the user record what they actually wore and how they felt.
 * Saves via PATCH and shows a brief "Saved" confirmation.
 */
export default function ReflectionEditor({ entry, onSaved }: Props) {
  const [outfitWorn, setOutfitWorn] = useState(entry.outfit_worn ?? "");
  const [reflection, setReflection] = useState(entry.reflection ?? "");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await updateEntry(entry.id, {
        outfit_worn: outfitWorn.trim() || null,
        reflection: reflection.trim() || null,
      });
      onSaved(updated);
      // Show confirmation for 2 seconds
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>Reflection</h2>

      {error && (
        <div style={styles.errorBox} role="alert">
          {error}
        </div>
      )}

      <div style={styles.field}>
        <label htmlFor="outfit_worn" style={styles.label}>
          What I actually wore
        </label>
        <textarea
          id="outfit_worn"
          rows={3}
          placeholder="What did you end up wearing?"
          value={outfitWorn}
          onChange={(e) => setOutfitWorn(e.target.value)}
          disabled={saving}
          style={styles.textarea}
        />
      </div>

      <div style={styles.field}>
        <label htmlFor="reflection" style={styles.label}>
          How it felt
        </label>
        <textarea
          id="reflection"
          rows={4}
          placeholder="Was the outfit a good fit for the weather and your mood?"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          disabled={saving}
          style={styles.textarea}
        />
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveBtn,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {savedMsg && (
          <span style={styles.savedMsg}>Saved</span>
        )}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "20px 24px",
    textAlign: "left",
  },
  heading: {
    margin: "0 0 20px",
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-h)",
    letterSpacing: "-0.2px",
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
    gap: "12px",
  },
  saveBtn: {
    padding: "8px 20px",
    fontSize: "14px",
    fontWeight: 500,
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
  },
  savedMsg: {
    fontSize: "14px",
    color: "var(--accent)",
    fontWeight: 500,
  },
};
