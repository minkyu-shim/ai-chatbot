import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CloudSun } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await signup(email, password);
      navigate("/diary", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-svh flex items-center justify-center p-6 bg-gradient-to-br from-primary-light via-white to-accent-light">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-border p-10"
      >
        {/* Brand icon */}
        <div className="flex flex-col items-center mb-6">
          <CloudSun size={48} className="text-primary mb-3" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
            Create account
          </h1>
          <p className="text-sm text-text-muted text-center">
            Weathering with You
          </p>
        </div>

        {/* Error box */}
        {error && (
          <div
            role="alert"
            className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-800">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="px-3 py-2.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition disabled:opacity-60 w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="px-3 py-2.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition disabled:opacity-60 w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-gray-800">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
              className="px-3 py-2.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition disabled:opacity-60 w-full"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full py-2.5 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium no-underline hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
