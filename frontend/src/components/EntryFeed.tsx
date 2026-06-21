import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CloudSun, PenLine } from "lucide-react";
import type { EntrySummary } from "../types";
import EntryCard from "./EntryCard";

type Props = {
  entries: EntrySummary[];
  loading: boolean;
  error: string | null;
};

/** Container animation: staggers child cards in */
const listVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

/**
 * Renders the full list of diary entry cards, or skeleton/empty/error states.
 */
export default function EntryFeed({ entries, loading, error }: Props) {
  /* ── Skeleton loader ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  /* ── Error state ─────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div
        role="alert"
        className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg"
      >
        {error}
      </div>
    );
  }

  /* ── Empty state ─────────────────────────────────────────────────────────── */
  if (entries.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <CloudSun size={64} className="text-primary opacity-40" />
          <div>
            <p className="text-lg font-semibold text-gray-900">No entries yet</p>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">
              Start tracking your daily outfit by adding your first entry.
            </p>
          </div>
          <Link
            to="/diary/new"
            className="flex items-center gap-1.5 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg no-underline transition-colors"
          >
            <PenLine size={14} />
            Add your first entry
          </Link>
        </div>
      </div>
    );
  }

  /* ── Entry list ──────────────────────────────────────────────────────────── */
  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-3"
    >
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </motion.div>
  );
}

/** Shimmer skeleton card — mirrors EntryCard dimensions */
function SkeletonCard() {
  return (
    <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-border">
      {/* Left: text lines */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="h-3.5 w-1/3 rounded-full animate-shimmer" />
        <div className="h-3 w-1/4 rounded-full animate-shimmer" />
        <div className="h-3 w-3/4 rounded-full animate-shimmer" />
        <div className="h-3 w-2/3 rounded-full animate-shimmer" />
      </div>
      {/* Right: thumbnail placeholder */}
      <div className="w-[72px] h-24 rounded-xl flex-shrink-0 animate-shimmer" />
    </div>
  );
}
