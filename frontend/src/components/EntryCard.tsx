import { Link } from "react-router-dom";
import type { EntrySummary } from "../types";

type Props = {
  entry: EntrySummary;
};

/**
 * Card representing a single diary entry in the feed.
 * Clicking navigates to the detail page.
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
    <Link to={`/diary/${entry.id}`} style={styles.link}>
      <article style={styles.card}>
        {/* Left: text content */}
        <div style={styles.body}>
          {/* Top row: date + location + mood */}
          <div style={styles.meta}>
            <span style={styles.date}>{displayDate}</span>
            <span style={styles.separator}>·</span>
            <span style={styles.city}>{entry.city}</span>
            <span style={styles.separator}>·</span>
            <span style={styles.mood}>{entry.mood}</span>
          </div>

          {/* Weather chip */}
          {weatherChip && (
            <span style={styles.weatherChip}>{weatherChip}</span>
          )}

          {/* AI preview — italic, single line, ellipsis */}
          {entry.ai_preview && (
            <p style={styles.preview}>{entry.ai_preview}</p>
          )}
        </div>

        {/* Right: outfit photo thumbnail */}
        {entry.photo_url && (
          <img
            src={entry.photo_url}
            alt="Outfit reference"
            style={styles.thumbnail}
          />
        )}
      </article>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  link: {
    textDecoration: "none",
    display: "block",
  },
  card: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    padding: "20px 24px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    boxShadow: "var(--shadow)",
    transition: "border-color 0.15s",
    cursor: "pointer",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  body: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  date: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-h)",
  },
  separator: {
    fontSize: "14px",
    color: "var(--border)",
  },
  city: {
    fontSize: "14px",
    color: "var(--text)",
    overflowWrap: "anywhere",
  },
  mood: {
    fontSize: "14px",
    color: "var(--accent)",
    fontWeight: 500,
    overflowWrap: "anywhere",
  },
  weatherChip: {
    display: "inline-block",
    fontSize: "12px",
    color: "var(--text)",
    background: "var(--accent-bg)",
    border: "1px solid var(--accent-border)",
    borderRadius: "20px",
    padding: "2px 10px",
    width: "fit-content",
  },
  preview: {
    margin: 0,
    fontSize: "14px",
    fontStyle: "italic",
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  thumbnail: {
    width: "64px",
    height: "64px",
    objectFit: "cover",
    borderRadius: "8px",
    flexShrink: 0,
  },
};
