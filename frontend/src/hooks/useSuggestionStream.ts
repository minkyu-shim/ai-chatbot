import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherSnapshot } from "../types";
import { streamSuggestion } from "../api/entries";
import { parseSSEStream } from "../api/sse";

export type StreamState = "idle" | "meta" | "streaming" | "done" | "error";

export type UseSuggestionStreamResult = {
  state: StreamState;
  weather: WeatherSnapshot | null;
  photoUrl: string | null;
  text: string;
  messageId: number | null;
  error: string | null;
  start: (entryId: number) => void;
  abort: () => void;
};

/**
 * Hook that manages the full lifecycle of an SSE suggestion stream.
 *
 * - Call `start(entryId)` to begin streaming.
 * - `state` progresses: idle → meta → streaming → done (or error).
 * - Aborting mid-stream is safe — does not set error state.
 * - Cleaned up automatically on unmount.
 */
export function useSuggestionStream(token: string | null): UseSuggestionStreamResult {
  const [state, setState] = useState<StreamState>("idle");
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [messageId, setMessageId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AbortController ref — persists across renders without causing re-renders
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback((entryId: number) => {
    if (!token) {
      setState("error");
      setError("Not authenticated");
      return;
    }

    // Cancel any in-flight stream before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Reset all output state, set initial phase
    setState("meta");
    setWeather(null);
    setPhotoUrl(null);
    setText("");
    setMessageId(null);
    setError(null);

    (async () => {
      try {
        const resp = await streamSuggestion(entryId, token, controller.signal);

        for await (const ev of parseSSEStream(resp)) {
          // Check abort between each event — the generator may have buffered several
          if (controller.signal.aborted) return;

          switch (ev.event) {
            case "meta":
              setWeather((ev.data.weather ?? null) as WeatherSnapshot | null);
              setPhotoUrl(ev.data.photo_url);
              break;

            case "token":
              // Transition to streaming on first token
              setState("streaming");
              // Append token to existing text — do NOT replace
              setText((prev) => prev + ev.data);
              break;

            case "done":
              setMessageId(ev.data.message_id);
              setState("done");
              return;

            case "error":
              setError(ev.data.detail);
              setState("error");
              return;
          }
        }
      } catch (err: unknown) {
        // Abort is not an error — silently return
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Stream failed");
        setState("error");
      }
    })();
  }, [token]);

  // Abort any active stream on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { state, weather, photoUrl, text, messageId, error, start, abort };
}
