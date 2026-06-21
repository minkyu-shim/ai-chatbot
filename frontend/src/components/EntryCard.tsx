import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { EntrySummary } from "../types";

type Props = {
  entry: EntrySummary;
};

/** Per-item entrance animation (driven by parent stagger) */
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

/**
 * Fashion card representing a single diary entry.
 * Lifts on hover, entrance via stagger from EntryFeed parent.
 */
export default function EntryCard({ entry }: Props) {
  // Parse date with explicit local midnight to avoid UTC-offset day shifts
  const displayDate = new Date(entry.entry_date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const weatherChip =
    entry.weather && entry.weather.temp !== null && entry.weather.condition
      ? `${Math.round(entry.weather.temp)}°C · ${entry.weather.condition}`
      : null;

  return (
    <motion.article
      variants={itemVariants}
      whileHover={{
        y: -3,
        boxShadow:
          "0 8px 24px -4px rgba(62,124,177,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Link to={`/diary/${entry.id}`} className="no-underline block">
        <div className="flex items-start justify-between gap-4 p-5 bg-white rounded-2xl border border-border cursor-pointer transition-colors hover:border-primary/40">
          {/* Left: text content */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Date row */}
            <p className="text-sm text-text-muted">{displayDate}</p>

            {/* City + mood row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* City with pin prefix */}
              <span className="text-sm font-medium text-primary">
                📍 {entry.city}
              </span>

              {/* Mood badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-light text-accent border border-accent/30">
                {entry.mood}
              </span>
            </div>

            {/* Weather chip */}
            {weatherChip && (
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs rounded-full bg-primary-light text-primary border border-primary/30 w-fit">
                {weatherChip}
              </span>
            )}

            {/* AI preview — 2-line clamp */}
            {entry.ai_preview && (
              <p className="text-sm text-text-muted italic line-clamp-2 leading-relaxed">
                {entry.ai_preview}
              </p>
            )}
          </div>

          {/* Right: outfit photo thumbnail (72×96 portrait ratio) */}
          {entry.photo_url && (
            <img
              src={entry.photo_url}
              alt="Outfit reference"
              className="w-[72px] h-24 object-cover rounded-xl shadow-sm flex-shrink-0"
            />
          )}
        </div>
      </Link>
    </motion.article>
  );
}
