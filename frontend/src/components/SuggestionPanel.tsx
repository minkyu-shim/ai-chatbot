import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import type { StreamState } from "../hooks/useSuggestionStream";

type Props = {
  state: StreamState;
  text: string;
  error: string | null;
  persistedAssistantContent?: string | null;
};

/**
 * Renders the AI outfit suggestion panel.
 *
 * State transitions:
 *   idle + persisted content → show persisted markdown
 *   idle + no content        → "Waiting to start…"
 *   meta                     → animated thinking dots
 *   streaming                → live markdown with blinking orange cursor
 *   done                     → final markdown (cursor removed, fadeIn)
 *   error                    → red error banner + partial text if any
 */
export default function SuggestionPanel({
  state,
  text,
  error,
  persistedAssistantContent,
}: Props) {
  return (
    <section className="bg-white border border-border rounded-2xl p-6 text-left">
      {/* Heading */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-accent" />
        <h2 className="text-base font-semibold text-gray-900 tracking-tight">
          Outfit Suggestion
        </h2>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {state === "error" && (
        <>
          <div
            role="alert"
            className="mb-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg"
          >
            Could not generate suggestion: {error}
          </div>
          {text && (
            <MarkdownBody text={text} streaming={false} />
          )}
        </>
      )}

      {/* ── Meta state: thinking dots ────────────────────────────────────────── */}
      {state === "meta" && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-text-muted italic">Thinking</span>
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.span
              key={i}
              className="inline-block w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* ── Streaming state ──────────────────────────────────────────────────── */}
      {state === "streaming" && (
        <MarkdownBody text={text} streaming={true} />
      )}

      {/* ── Done state ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {state === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <MarkdownBody text={text} streaming={false} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Idle state ───────────────────────────────────────────────────────── */}
      {state === "idle" && (
        persistedAssistantContent ? (
          <MarkdownBody text={persistedAssistantContent} streaming={false} />
        ) : (
          <p className="text-sm text-text-muted italic">Waiting to start…</p>
        )
      )}
    </section>
  );
}

/**
 * Shared markdown renderer.
 * In streaming mode the orange blinking cursor "▍" is appended inline.
 */
function MarkdownBody({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <div className="border-l-4 border-primary bg-surface rounded-r-xl px-4 py-3">
      <div className="suggestion-markdown text-sm leading-relaxed text-gray-800">
        <ReactMarkdown>{streaming ? text + " " : text}</ReactMarkdown>
        {streaming && (
          <span className="streaming-cursor ml-0.5">▍</span>
        )}
      </div>
    </div>
  );
}
