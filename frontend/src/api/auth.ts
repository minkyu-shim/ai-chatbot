// Auth API — thin wrappers around the /api/auth/* endpoints.
// Uses apiFetch for token injection and error handling.

import { apiFetch } from "./client";
import type { TokenResponse, UserPublic } from "../types";

/**
 * Register a new user.
 * Returns a TokenResponse (including the new JWT and user data) on success.
 */
export function signup(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: { email, password },
  });
}

/**
 * Log in with email + password.
 * Returns a TokenResponse on success; throws ApiError(401) on bad credentials.
 */
export function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

/**
 * Fetch the currently authenticated user's profile.
 * The token is injected automatically by apiFetch.
 * Throws ApiError(401) if the token is missing, invalid, or expired.
 */
export function me(): Promise<UserPublic> {
  return apiFetch<UserPublic>("/api/auth/me");
}

/**
 * Log out — best-effort server-side invalidation.
 * Errors are intentionally swallowed; the caller handles client-side cleanup.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/api/auth/logout", { method: "POST" });
  } catch {
    // Logout is stateless on the backend; ignore failures
  }
}
