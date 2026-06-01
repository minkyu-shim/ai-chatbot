import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Route guard — wraps protected routes.
 *
 * - While the initial token validation is in flight, shows a loading placeholder
 *   to avoid a flash-redirect to /login on page refresh with a valid token.
 * - Once loading is done, redirects to /login if no authenticated user is present.
 * - Otherwise renders the nested route via <Outlet />.
 */
export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>
        Checking authentication…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
