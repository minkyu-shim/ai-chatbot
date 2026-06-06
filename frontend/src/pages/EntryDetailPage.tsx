import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import WeatherCard from "../components/WeatherCard";
import SuggestionPanel from "../components/SuggestionPanel";
import ReflectionEditor from "../components/ReflectionEditor";
import { getEntry } from "../api/entries";
import { ApiError } from "../api/client";
import { useSuggestionStream } from "../hooks/useSuggestionStream";
import { useAuth } from "../auth/AuthContext";
import type { Entry } from "../types";

/**
 * Detail view for a single diary entry.
 *
 * Auto-starts the SSE suggestion stream if no assistant message exists yet.
 * Uses a ref guard (didStartRef) to prevent double-firing in React 19 Strict Mode.
 */
export default function EntryDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const entryId = idParam ? parseInt(idParam, 10) : NaN;

  const { token } = useAuth();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const stream = useSuggestionStream(token);

  // Guard: only start the stream once even in React Strict Mode (double-effect fire)
  const didStartRef = useRef(false);

  // Load entry on mount
  useEffect(() => {
    if (isNaN(entryId)) {
      // Defer setState out of synchronous effect body
      Promise.resolve().then(() => setNotFound(true));
      return;
    }
    getEntry(entryId)
      .then(setEntry)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setLoadError(err instanceof Error ? err.message : "Failed to load entry");
        }
      });
  }, [entryId]);

  // Auto-start stream if entry has no assistant message yet.
  // stream.start is memoised with useCallback so it's safe to include in deps.
  useEffect(() => {
    if (!entry) return;
    if (didStartRef.current) return;
    const hasAssistant = entry.messages.some((m) => m.role === "assistant");
    if (!hasAssistant) {
      didStartRef.current = true;
      stream.start(entry.id);
    }
  }, [entry, stream]);

  // When a persisted assistant message already exists, extract its content
  const persistedAssistantContent = entry?.messages.find((m) => m.role === "assistant")?.content ?? null;

  // ── Error / not found states ─────────────────────────────────────────────────

  if (notFound) {
    return (
      <div style={styles.page}>
        <NavBar />
        <div style={styles.centeredMsg}>
          <p style={styles.notFoundText}>Entry not found.</p>
          <Link to="/diary" style={styles.backLink}>Back to diary</Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.page}>
        <NavBar />
        <div style={styles.errorBox} role="alert">{loadError}</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={styles.page}>
        <NavBar />
        <p style={styles.loading}>Loading entry…</p>
      </div>
    );
  }

  const displayDate = new Date(entry.entry_date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Determine which weather/photo to show:
  // During/after streaming → use stream data; otherwise use persisted entry data
  const weatherToShow = stream.state !== "idle" ? (stream.weather ?? entry.weather) : entry.weather;
  const photoToShow = stream.state !== "idle" ? (stream.photoUrl ?? entry.photo_url) : entry.photo_url;

  return (
    <div style={styles.page}>
      <NavBar />

      {/* ── Entry header ─────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <Link to="/diary" style={styles.backLink}>&larr; Back to diary</Link>
        <h1 style={styles.title}>{displayDate}</h1>
        <div style={styles.metaRow}>
          <span style={styles.metaItem}>{entry.city}</span>
          <span style={styles.metaSep}>·</span>
          <span style={styles.moodBadge}>{entry.mood}</span>
        </div>
      </div>

      {/* ── Content layout ───────────────────────────────────────────────────── */}
      <div style={styles.content}>
        {/* Weather card (shows streaming data or persisted data) */}
        <WeatherCard weather={weatherToShow} photoUrl={photoToShow} />

        {/* AI suggestion panel */}
        <SuggestionPanel
          state={stream.state}
          text={stream.text}
          error={stream.error}
          persistedAssistantContent={persistedAssistantContent}
        />

        {/* Reflection editor — save updates local entry state */}
        <ReflectionEditor
          entry={entry}
          onSaved={(updated) => setEntry(updated)}
        />
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
  header: {
    padding: "24px 24px 0",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  backLink: {
    fontSize: "13px",
    color: "var(--text)",
    textDecoration: "none",
    display: "inline-block",
    marginBottom: "4px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 600,
    letterSpacing: "-0.3px",
    color: "var(--text-h)",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  metaItem: {
    fontSize: "14px",
    color: "var(--text)",
  },
  metaSep: {
    fontSize: "14px",
    color: "var(--border)",
  },
  moodBadge: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--accent)",
    background: "var(--accent-bg)",
    border: "1px solid var(--accent-border)",
    borderRadius: "20px",
    padding: "2px 10px",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "0 24px 40px",
  },
  centeredMsg: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "80px 24px",
  },
  notFoundText: {
    margin: 0,
    fontSize: "16px",
    color: "var(--text)",
  },
  loading: {
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
};
