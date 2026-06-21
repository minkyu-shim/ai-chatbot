import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import NavBar from "../components/NavBar";
import { listAllEntries } from "../api/admin";
import type { AdminEntrySummary } from "../types";

/**
 * Admin-only page that lists all users' entries in a table.
 * Access is gated by role on the backend; a 403 is surfaced as a friendly message.
 */
export default function AdminPage() {
  const [entries, setEntries] = useState<AdminEntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAllEntries({ limit: 50 })
      .then((data) => {
        setEntries(data);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Access denied";
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

      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <ShieldCheck size={22} className="text-primary" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Panel</h1>
            {!loading && !error && (
              <p className="text-sm text-text-muted mt-0.5">
                {entries.length} {entries.length === 1 ? "entry" : "entries"} total
              </p>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-center py-12 text-sm text-text-muted">Loading…</p>
        )}

        {/* Error / access denied */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-base text-text-muted">You don't have access to this page.</p>
            <Link
              to="/diary"
              className="text-sm font-medium text-primary no-underline hover:underline"
            >
              Back to diary
            </Link>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "User", "City", "Mood", "Weather", "Created at"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e, i) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-primary-light transition-colors ${i % 2 === 1 ? "bg-surface" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                      {new Date(e.entry_date + "T00:00:00").toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-[180px] truncate">
                      {e.user_email}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{e.city}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-light text-accent border border-accent/30">
                        {e.mood}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.weather ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs rounded-full bg-primary-light text-primary border border-primary/30 whitespace-nowrap">
                          {e.weather.temp !== null ? `${Math.round(e.weather.temp)}°C` : "?°C"}
                          {e.weather.condition ? ` · ${e.weather.condition}` : ""}
                        </span>
                      ) : (
                        <span className="text-border">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                      No entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
