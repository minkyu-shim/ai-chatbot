import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shirt,
  CloudSun,
  Sparkles,
  BookOpen,
  ChevronDown,
} from "lucide-react";

// ── Animation variants ────────────────────────────────────────────────────────

/** Stagger container: each child gets a slight delay */
const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.25,
    },
  },
};

/** Fade + slide up entrance for individual words / blocks */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

/** Feature card entrance: scale in from slightly below */
const cardEntrance = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// ── Floating blob config ──────────────────────────────────────────────────────

const blobs = [
  { color: "#3e7cb1", size: 520, top: "5%", left: "10%", delay: 0, duration: 14 },
  { color: "#f17300", size: 380, top: "55%", left: "70%", delay: 2, duration: 18 },
  { color: "#3e7cb1", size: 300, top: "70%", left: "5%", delay: 5, duration: 16 },
  { color: "#f17300", size: 440, top: "15%", left: "65%", delay: 3, duration: 20 },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

/** Slowly drifting blurred circle for the hero background */
function FloatingBlob({
  color,
  size,
  top,
  left,
  delay,
  duration,
}: (typeof blobs)[number]) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: color,
        filter: "blur(120px)",
        opacity: 0.18,
      }}
      animate={{ y: [0, -40, 0, 30, 0] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut" as const,
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const featureRef = useRef<HTMLDivElement>(null);

  function scrollToFeatures() {
    featureRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="overflow-x-hidden">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO SECTION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="relative min-h-svh flex flex-col overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0d1b2a 0%, #1a2e45 50%, #0d1b2a 100%)" }}
      >
        {/* Animated background blobs */}
        {blobs.map((b, i) => (
          <FloatingBlob key={i} {...b} />
        ))}

        {/* ── Landing navbar ── */}
        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 h-16">
          {/* Brand */}
          <div className="flex items-center gap-2 text-white font-bold text-base tracking-tight">
            <Shirt size={22} className="text-primary" style={{ color: "#3e7cb1" }} />
            <span>Weathering with You</span>
          </div>

          {/* Nav actions */}
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-white/80 hover:text-white px-4 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors no-underline"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold text-white px-4 py-2 rounded-full transition-colors no-underline"
              style={{ background: "#f17300" }}
            >
              Get started
            </Link>
          </nav>
        </header>

        {/* ── Hero center content ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-1.5 rounded-full border px-4 py-1 text-sm"
            style={{
              background: "rgba(255,255,255,0.07)",
              borderColor: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.75)",
            }}
          >
            <span>☀️</span>
            <span>Weather-aware fashion</span>
          </motion.div>

          {/* Staggered headline */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center gap-1 mb-6"
          >
            <motion.h1
              variants={fadeUp}
              className="font-bold leading-tight"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", color: "#ffffff" }}
            >
              Dress for the
            </motion.h1>
            <motion.h1
              variants={fadeUp}
              className="font-bold leading-tight"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", color: "#3e7cb1" }}
            >
              weather.
            </motion.h1>
            <motion.h2
              variants={fadeUp}
              className="font-light leading-tight mt-2"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 3rem)",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Dress for the mood.
            </motion.h2>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            className="max-w-xl text-center text-lg mb-10"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Get AI-powered outfit recommendations tailored to your city's weather
            and how you feel today.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/signup"
              className="font-semibold px-8 py-3.5 rounded-full text-white no-underline transition-opacity hover:opacity-90"
              style={{ background: "#f17300" }}
            >
              Get started free
            </Link>
            <Link
              to="/login"
              className="px-8 py-3.5 rounded-full no-underline transition-colors hover:bg-white/10"
              style={{
                border: "1px solid rgba(255,255,255,0.28)",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              Sign in
            </Link>
          </motion.div>
        </div>

        {/* ── Scroll hint chevron ── */}
        <div className="relative z-10 flex justify-center pb-8">
          <motion.button
            type="button"
            onClick={scrollToFeatures}
            aria-label="Scroll to features"
            className="cursor-pointer border-0 bg-transparent p-0"
            style={{ color: "rgba(255,255,255,0.28)" }}
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" as const }}
          >
            <ChevronDown size={32} />
          </motion.button>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEATURE STRIP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section ref={featureRef} className="bg-white py-24 px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-5xl mx-auto"
        >
          {/* Section title */}
          <motion.h2
            variants={fadeUp}
            className="text-center text-3xl md:text-4xl font-bold mb-3"
            style={{ color: "#1a202c" }}
          >
            Everything you need to dress well
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-center text-base mb-14"
            style={{ color: "#5a6272" }}
          >
            Three features, zero effort, infinitely stylish.
          </motion.p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <CloudSun size={28} />,
                iconColor: "#3e7cb1",
                title: "Live weather",
                body: "Real-time conditions from your city, updated every 10 minutes.",
              },
              {
                icon: <Sparkles size={28} />,
                iconColor: "#f17300",
                title: "AI outfit picks",
                body: "Groq-powered recommendations that match your vibe and the forecast.",
              },
              {
                icon: <BookOpen size={28} />,
                iconColor: "#3e7cb1",
                title: "Outfit journal",
                body: "Save every look. Track your mood and style over time.",
              },
            ].map(({ icon, iconColor, title, body }) => (
              <motion.div
                key={title}
                variants={cardEntrance}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="bg-white rounded-2xl border p-8 shadow-sm flex flex-col gap-4"
                style={{ borderColor: "#dde1e7" }}
              >
                <span style={{ color: iconColor }}>{icon}</span>
                <div>
                  <h3 className="font-semibold text-lg mb-1" style={{ color: "#1a202c" }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#5a6272" }}>
                    {body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="py-24 px-6"
        style={{ background: "linear-gradient(160deg, #0d1b2a 0%, #1a2e45 50%, #0d1b2a 100%)" }}
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-4xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="text-center text-3xl md:text-4xl font-bold mb-16"
            style={{ color: "#ffffff" }}
          >
            How it works
          </motion.h2>

          {/* Steps row */}
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-0">
            {/* Connector line — visible on md+ */}
            <div
              className="hidden md:block absolute top-6 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px"
              style={{
                background: "linear-gradient(90deg, rgba(62,124,177,0.6) 0%, rgba(241,115,0,0.6) 50%, rgba(62,124,177,0.6) 100%)",
              }}
            />

            {[
              { num: "1", title: "Tell us your city & mood", body: "Enter where you are and how you're feeling right now." },
              { num: "2", title: "We fetch live weather", body: "Our backend pulls real-time conditions from OpenWeatherMap." },
              { num: "3", title: "Get your outfit suggestion", body: "A personalized look streams back in seconds, with a photo." },
            ].map(({ num, title, body }) => (
              <motion.div
                key={num}
                variants={fadeUp}
                className="relative flex-1 flex flex-col items-center text-center px-4"
              >
                {/* Number bubble */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg mb-5 flex-shrink-0"
                  style={{ background: "#f17300" }}
                >
                  {num}
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: "#ffffff" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {body}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="py-28 px-6 text-center"
        style={{ background: "linear-gradient(135deg, #3e7cb1 0%, #2a5a8a 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" as const }}
          className="max-w-xl mx-auto flex flex-col items-center gap-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Ready to dress smarter?
          </h2>
          <p className="text-white/70 text-base">
            Join today and let the weather guide your wardrobe.
          </p>
          <Link
            to="/signup"
            className="font-semibold px-10 py-3.5 rounded-full text-white no-underline transition-opacity hover:opacity-90 text-base"
            style={{ background: "#f17300" }}
          >
            Create your account
          </Link>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Already have an account?{" "}
            <Link
              to="/login"
              className="no-underline hover:underline font-medium"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </section>

    </div>
  );
}
