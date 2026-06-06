import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth";
import { ApiError } from "../api/client";
import type { UserPublic } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthState = {
  user: UserPublic | null;
  token: string | null;
  /** True while the initial token-validation call is in flight */
  loading: boolean;
};

type AuthCtx = AuthState & {
  login(email: string, password: string): Promise<void>;
  signup(email: string, password: string): Promise<void>;
  logout(): void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthCtx | null>(null);

const TOKEN_KEY = "token";

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true, // start in loading state until we verify the stored token
  });

  // On mount: if a token exists in localStorage, validate it via GET /api/auth/me.
  // If the call returns 401 (expired/invalid), clear the token from storage.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      // Use a resolved promise to defer setState out of the synchronous effect body
      Promise.resolve().then(() => {
        setState({ user: null, token: null, loading: false });
      });
      return;
    }

    authApi
      .me()
      .then((user) => {
        setState({ user, token: stored, loading: false });
      })
      .catch((err: unknown) => {
        // Token is stale or invalid — remove it and continue as unauthenticated
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
        }
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  // ── Auth actions ─────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setState({ user: data.user, token: data.access_token, loading: false });
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const data = await authApi.signup(email, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setState({ user: data.user, token: data.access_token, loading: false });
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget — backend is stateless so we don't need to await
    authApi.logout();
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Access the auth context. Must be used inside <AuthProvider>.
 * eslint-disable-next-line react-refresh/only-export-components — intentional: context + hook co-located
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
