import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import NavBar from "../components/NavBar";
import EntryForm, { type EntryFormValues } from "../components/EntryForm";
import { createEntry } from "../api/entries";
import { ApiError } from "../api/client";

/**
 * Page for creating a new diary entry.
 * On success, redirects to the entry detail page to start streaming the suggestion.
 */
export default function NewEntryPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: EntryFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      const entry = await createEntry({
        city: values.city,
        mood: values.mood,
        outfit_worn: values.outfit_worn || null,
      });
      navigate(`/diary/${entry.id}`, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 502) {
        const detail = err.message;
        if (detail.toLowerCase().includes("city not found")) {
          setError(`Could not find city: ${values.city}`);
        } else {
          setError(detail);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to create entry");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-surface">
      <NavBar />

      <div className="flex justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-sm p-8"
        >
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-1">
            New entry
          </h1>
          <p className="text-sm text-text-muted mb-7">
            Tell us where you are and how you feel today.
          </p>

          <EntryForm onSubmit={handleSubmit} submitting={submitting} error={error} />
        </motion.div>
      </div>
    </div>
  );
}
