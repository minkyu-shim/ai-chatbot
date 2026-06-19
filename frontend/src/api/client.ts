// Thin fetch wrapper that automatically injects the JWT Bearer token
// from localStorage on every request, and throws on non-2xx responses.

const TOKEN_KEY = "token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Core fetch wrapper.
 * - Reads `localStorage.getItem("token")` and adds `Authorization: Bearer` header.
 * - Serializes `body` as JSON and sets `Content-Type: application/json` when a body is provided.
 * - Throws `ApiError` for non-2xx responses, including the parsed error detail if available.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  };

  // Inject auth token if present
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Serialize body and set content type for non-GET requests
  let serializedBody: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    serializedBody = JSON.stringify(body);
  }

  const response = await fetch(path, {
    ...rest,
    headers,
    body: serializedBody,
  });

  if (!response.ok) {
    // Auto-logout on 401: token is expired or invalid.
    // Cannot use useAuth() here (hooks are React-only), so we clear
    // localStorage directly and redirect — AuthProvider will re-read on next load.
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }

    // Try to extract a human-readable message from the backend error body
    let detail: string = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.detail) {
        detail = String(errorJson.detail);
      }
    } catch {
      // Ignore parse failures — keep the default message
    }
    throw new ApiError(response.status, detail);
  }

  // Handle 204 No Content — return undefined cast to T
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
