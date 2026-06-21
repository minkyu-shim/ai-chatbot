import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shirt } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

/**
 * Top navigation bar.
 * - Brand: "Weathering with You" with Shirt icon (left)
 * - Right: admin link (if applicable), truncated email, pill sign-out button
 * - Glassmorphism sticky header with Framer Motion mount animation
 */
export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <motion.nav
      initial={{ y: -4, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 bg-white/80 backdrop-blur-md border-b border-border"
    >
      {/* Brand */}
      <Link
        to="/diary"
        className="flex items-center gap-2 text-primary font-bold text-base tracking-tight no-underline"
      >
        <Shirt size={20} />
        <span>Weathering with You</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {user?.role === "admin" && (
          <Link
            to="/admin"
            className="text-xs font-semibold text-primary no-underline hover:underline"
          >
            Admin
          </Link>
        )}
        {user && (
          <span className="text-xs text-text-muted max-w-[180px] truncate hidden sm:inline">
            {user.email}
          </span>
        )}
        <button
          onClick={handleLogout}
          type="button"
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-white hover:bg-surface transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </motion.nav>
  );
}
