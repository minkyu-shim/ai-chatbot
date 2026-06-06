import { apiFetch } from "./client";
import type { Entry, EntrySummary, EntryCreate, EntryUpdate } from "../types";

export function listEntries(opts?: { limit?: number; offset?: number }): Promise<EntrySummary[]> {
  const params = new URLSearchParams();
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiFetch<EntrySummary[]>(`/api/entries${qs ? "?" + qs : ""}`);
}

export function getEntry(id: number): Promise<Entry> {
  return apiFetch<Entry>(`/api/entries/${id}`);
}

export function createEntry(body: EntryCreate): Promise<Entry> {
  return apiFetch<Entry>("/api/entries", { method: "POST", body });
}

export function updateEntry(id: number, body: EntryUpdate): Promise<Entry> {
  return apiFetch<Entry>(`/api/entries/${id}`, { method: "PATCH", body });
}

export function deleteEntry(id: number): Promise<void> {
  return apiFetch<void>(`/api/entries/${id}`, { method: "DELETE" });
}

// NEVER use EventSource — it cannot send Authorization headers (ADR-4).
// Always use fetch + ReadableStream for SSE endpoints that require auth.
export function streamSuggestion(entryId: number, token: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`/api/entries/${entryId}/suggest/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    signal,
  });
}
