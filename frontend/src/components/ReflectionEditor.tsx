import { useState } from "react";
import type { Entry } from "../types";
import { updateEntry } from "../api/entries";

type Props = {
  entry: Entry;
  onSaved: (updated: Entry) => void;
};

/**
 * Lets the user record what they actually wore and how they felt.
 * Saves via PATCH and shows a brief "Saved" confirmation.
 */
export default function ReflectionEditor({ entry, onSaved }: Props) {
  const [outfitWorn,  setOutfitWorn]  = useState(entry.outfit_worn ?? "");
  const [reflection,  setReflection]  = useState(entry.reflection  ?? "");
  const [saving,      setSaving]      = useState(false);
  const [savedMsg,    setSavedMsg]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await updateEntry(entry.id, {
        outfit_worn: outfitWorn.trim() || null,
        reflection:  reflection.trim()  || null,
      });
      onSaved(updated);
      // Show "Saved" confirmation for 2 s
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  /* Shared textarea classes */
  const textareaCls =
    "px-3 py-2.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition disabled:opacity-60 w-full resize-y font-inherit leading-relaxed";

  return (
    <section className="bg-white border border-border rounded-2xl p-6 text-left">
      <h2 className="text-base font-semibold text-gray-900 tracking-tight mb-5">
        Reflection
      </h2>

      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5 mb-4">
        <label htmlFor="outfit_worn" className="text-sm font-medium text-gray-800">
          What I actually wore
        </label>
        <textarea
          id="outfit_worn"
          rows={3}
          placeholder="What did you end up wearing?"
          value={outfitWorn}
          onChange={(e) => setOutfitWorn(e.target.value)}
          disabled={saving}
          className={textareaCls}
        />
      </div>

      <div className="flex flex-col gap-1.5 mb-5">
        <label htmlFor="reflection" className="text-sm font-medium text-gray-800">
          How it felt
        </label>
        <textarea
          id="reflection"
          rows={4}
          placeholder="Was the outfit a good fit for the weather and your mood?"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          disabled={saving}
          className={textareaCls}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {savedMsg && (
          <span className="text-sm text-green-600 font-medium">Saved</span>
        )}
      </div>
    </section>
  );
}
