import { Navigate, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { CloudSun } from "lucide-react";
import { useAuth } from "./AuthContext";

/**
 * Route guard — wraps protected routes.
 *
 * - While the initial token validation is in flight, shows a full-screen
 *   centred loader to avoid a flash-redirect to /login with a valid token.
 * - Once loading is done, redirects to /login if no authenticated user.
 * - Otherwise renders the nested route via <Outlet />.
 */
export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-3 bg-surface">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <CloudSun size={40} className="text-primary" />
        </motion.div>
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
