import ReactMarkdown from "react-markdown";
import type { StreamState } from "../hooks/useSuggestionStream";

type Props = {
  state: StreamState;
  text: string;
  error: string | null;
  persistedAssistantContent?: string | null;
};

/**
 * Renders the AI outfit suggestion.
 *
 * State transitions:
 *   idle + persisted content → show persisted markdown
 *   idle + no content        → "Waiting to start…"
 *   meta                     → "Thinking…" spinner text
 *   streaming                → live markdown with blinking cursor appended
 *   done                     → final markdown (cursor removed)
 *   error                    → red error banner, partial text below if any
 */
export default function SuggestionPanel({ state, text, error, persistedAssistantContent }: Props) {
  return (
    <section style={styles.panel}>
      <h2 style={styles.heading}>AI Suggestion</h2>

      {/* ── Error state ──────────────────────────────────────────── */}
      {state === "error" && (
        <>
          <div style={styles.errorBox} role="alert">
            Could not generate suggestion: {error}
          </div>
          {text && (
            <div style={styles.markdownWrap}>
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          )}
        </>
      )}

      {/* ── Meta state (waiting for first token) ─────────────────── */}
      {state === "meta" && (
        <p style={styles.status}>Thinking…</p>
      )}

      {/* ── Streaming state ──────────────────────────────────────── */}
      {state === "streaming" && (
        <div style={styles.markdownWrap}>
          {/* The "▍" cursor is appended inline; ReactMarkdown renders the full text */}
          <ReactMarkdown>{text + "▍"}</ReactMarkdown>
        </div>
      )}

      {/* ── Done state ───────────────────────────────────────────── */}
      {state === "done" && (
        <div style={styles.markdownWrap}>
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      )}

      {/* ── Idle state ───────────────────────────────────────────── */}
      {state === "idle" && (
        persistedAssistantContent ? (
          <div style={styles.markdownWrap}>
            <ReactMarkdown>{persistedAssistantContent}</ReactMarkdown>
          </div>
        ) : (
          <p style={styles.status}>Waiting to start…</p>
        )
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "20px 24px",
    textAlign: "left",
  },
  heading: {
    margin: "0 0 16px",
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-h)",
    letterSpacing: "-0.2px",
  },
  status: {
    margin: 0,
    fontSize: "14px",
    color: "var(--text)",
    fontStyle: "italic",
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
  markdownWrap: {
    fontSize: "15px",
    lineHeight: "1.65",
    color: "var(--text-h)",
    // Ensure markdown content is left-aligned and flows naturally
    textAlign: "left",
  },
};
