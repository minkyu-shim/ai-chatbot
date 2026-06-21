import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

type FormValues = {
  city: string;
  mood: string;
  outfit_worn: string;
};

type Props = {
  onSubmit: (values: FormValues) => void;
  submitting: boolean;
  error: string | null;
};

/**
 * Form to create a new diary entry.
 * Fields: city (required), mood (required), outfit_worn (optional).
 */
export default function EntryForm({ onSubmit, submitting, error }: Props) {
  const [city, setCity] = useState("");
  const [mood, setMood] = useState("");
  const [outfitWorn, setOutfitWorn] = useState("");

  const canSubmit = city.trim() !== "" && mood.trim() !== "" && !submitting;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ city: city.trim(), mood: mood.trim(), outfit_worn: outfitWorn.trim() });
  }

  /* Shared input classes */
  const inputCls =
    "px-3 py-2.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition disabled:opacity-60 w-full";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-0">
      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg"
        >
          {error}
        </div>
      )}

      {/* City */}
      <div className="flex flex-col gap-1.5 mb-4">
        <label htmlFor="city" className="text-sm font-medium text-gray-800">
          City <span className="text-red-500">*</span>
        </label>
        <input
          id="city"
          type="text"
          required
          placeholder="e.g. Paris"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={submitting}
          className={inputCls}
        />
      </div>

      {/* Mood */}
      <div className="flex flex-col gap-1.5 mb-4">
        <label htmlFor="mood" className="text-sm font-medium text-gray-800">
          Mood <span className="text-red-500">*</span>
        </label>
        <input
          id="mood"
          type="text"
          required
          placeholder="e.g. tired, energetic, anxious"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          disabled={submitting}
          className={inputCls}
        />
        <span className="text-xs text-text-muted">e.g. tired, energetic, anxious</span>
      </div>

      {/* Outfit worn */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label htmlFor="outfit_worn" className="text-sm font-medium text-gray-800">
          What I plan to wear{" "}
          <span className="font-normal text-text-muted text-xs">(optional)</span>
        </label>
        <textarea
          id="outfit_worn"
          rows={3}
          placeholder="Describe your planned outfit…"
          value={outfitWorn}
          onChange={(e) => setOutfitWorn(e.target.value)}
          disabled={submitting}
          className={`${inputCls} resize-y font-inherit leading-relaxed`}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-6 py-2.5 text-sm font-medium bg-accent hover:bg-accent/90 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? "Creating entry…" : "Create entry"}
        </button>
        <Link
          to="/diary"
          className="text-sm text-text-muted no-underline hover:text-gray-800 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

// Re-export FormValues type for page use
export type { FormValues as EntryFormValues };
