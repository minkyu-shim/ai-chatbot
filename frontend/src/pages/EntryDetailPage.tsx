import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, RefreshCw } from "lucide-react";
import NavBar from "../components/NavBar";
import WeatherCard from "../components/WeatherCard";
import SuggestionPanel from "../components/SuggestionPanel";
import ReflectionEditor from "../components/ReflectionEditor";
import { getEntry, deleteEntry } from "../api/entries";
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
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const stream = useSuggestionStream(token);

  // Guard: only start the stream once even in React Strict Mode (double-effect fire)
  const didStartRef = useRef(false);

  // Load entry on mount
  useEffect(() => {
    if (isNaN(entryId)) {
      Promise.resolve().then(() => setNotFound(true));
      return;
    }
    getEntry(entryId)
      .then(setEntry)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          const msg = err instanceof Error ? err.message : "Failed to load entry";
          setLoadError(
            msg.includes("Failed to fetch")
              ? "Could not connect to server. Is the backend running?"
              : msg
          );
        }
      });
  }, [entryId]);

  // Auto-start stream if entry has no assistant message yet
  useEffect(() => {
    if (!entry) return;
    if (didStartRef.current) return;
    const hasAssistant = entry.messages.some((m) => m.role === "assistant");
    if (!hasAssistant) {
      didStartRef.current = true;
      stream.start(entry.id);
    }
  }, [entry, stream]);

  const persistedAssistantContent =
    entry?.messages.find((m) => m.role === "assistant")?.content ?? null;

  // ── Delete handler ────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!entry) return;
    const confirmed = window.confirm("Delete this entry? This cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEntry(entry.id);
      navigate("/diary", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete entry";
      setDeleteError(
        msg.includes("Failed to fetch")
          ? "Could not connect to server. Is the backend running?"
          : msg
      );
      setDeleting(false);
    }
  }

  // ── Re-generate handler ───────────────────────────────────────────────────

  function handleRegenerate() {
    if (!entry) return;
    stream.start(entry.id);
  }

  // ── Error / not-found / loading states ───────────────────────────────────

  if (notFound) {
    return (
      <div className="flex flex-col min-h-svh bg-surface">
        <NavBar />
        <div className="flex flex-col items-center gap-4 py-20 px-6">
          <p className="text-base text-text-muted">Entry not found.</p>
          <Link to="/diary" className="text-sm font-medium text-primary no-underline hover:underline">
            Back to diary
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col min-h-svh bg-surface">
        <NavBar />
        <div
          role="alert"
          className="mx-6 mt-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg"
        >
          {loadError}
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col min-h-svh bg-surface">
        <NavBar />
        <p className="text-center py-12 text-sm text-text-muted">Loading entry…</p>
      </div>
    );
  }

  const displayDate = new Date(entry.entry_date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // During/after streaming → use stream data; otherwise use persisted entry data
  const weatherToShow = stream.state !== "idle" ? (stream.weather ?? entry.weather) : entry.weather;
  const photoToShow   = stream.state !== "idle" ? (stream.photoUrl ?? entry.photo_url) : entry.photo_url;

  // Show re-generate button only when stream is idle/done/error
  const canRegenerate = stream.state === "done" || stream.state === "error" || stream.state === "idle";

  return (
    <div className="flex flex-col min-h-svh bg-surface">
      <NavBar />

      <div className="max-w-3xl mx-auto w-full px-6 py-6 flex flex-col gap-5">
        {/* Back link */}
        <Link
          to="/diary"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors no-underline w-fit"
        >
          <ChevronLeft size={15} />
          Back
        </Link>

        {/* Entry header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {displayDate}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-primary">📍 {entry.city}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-light text-accent border border-accent/30">
              {entry.mood}
            </span>
          </div>
        </motion.div>

        {/* Weather card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.07 }}
        >
          <WeatherCard weather={weatherToShow} photoUrl={photoToShow} />
        </motion.div>

        {/* Suggestion panel with optional re-generate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.14 }}
          className="relative"
        >
          {/* Re-generate button next to heading — positioned via absolute */}
          {canRegenerate && (persistedAssistantContent || stream.state === "done" || stream.state === "error") && (
            <button
              type="button"
              onClick={handleRegenerate}
              className="absolute top-5 right-5 flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:border-primary hover:text-primary text-text-muted transition-colors cursor-pointer bg-white z-10"
            >
              <RefreshCw size={12} />
              Re-generate
            </button>
          )}
          <SuggestionPanel
            state={stream.state}
            text={stream.text}
            error={stream.error}
            persistedAssistantContent={persistedAssistantContent}
          />
        </motion.div>

        {/* Reflection editor */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.21 }}
        >
          <ReflectionEditor entry={entry} onSaved={(updated) => setEntry(updated)} />
        </motion.div>

        {/* Delete zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="flex flex-col items-start gap-2 pt-4 border-t border-border"
        >
          {deleteError && (
            <p role="alert" className="text-sm text-red-600">
              {deleteError}
            </p>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete entry"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
