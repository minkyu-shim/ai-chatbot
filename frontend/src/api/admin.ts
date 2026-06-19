import { apiFetch } from "./client";
import type { AdminEntrySummary } from "../types";

export function listAllEntries(opts?: { limit?: number; offset?: number }): Promise<AdminEntrySummary[]> {
  const params = new URLSearchParams();
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiFetch<AdminEntrySummary[]>(`/api/admin/entries${qs ? "?" + qs : ""}`);
}
