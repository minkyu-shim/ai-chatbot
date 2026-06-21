import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, PenLine } from "lucide-react";
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
        const msg = err instanceof Error ? err.message : "Failed to load entries";
        setError(
          msg.includes("Failed to fetch")
            ? "Could not connect to server. Is the backend running?"
            : msg
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-svh bg-surface">
      <NavBar />

      {/* Page header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-5 max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <BookOpen size={22} className="text-primary" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
              Your Outfit Journal
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Track your daily look, weather and mood.
            </p>
          </div>
        </div>

        <Link
          to="/diary/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg no-underline transition-colors"
        >
          <PenLine size={15} />
          New entry
        </Link>
      </div>

      {/* Feed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 px-6 pb-12 max-w-3xl w-full mx-auto"
      >
        <EntryFeed entries={entries} loading={loading} error={error} />
      </motion.div>
    </div>
  );
}
