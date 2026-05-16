"use client";

import AkmindLogo from "@/components/AkmindLogo";
import type { DemoUser } from "@/types/demo";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL ?? "https://www.akmind.com";

const STAR_LAYOUT = Array.from({ length: 60 }, (_, i) => ({
  left: `${((i * 37) % 97) + 1}%`,
  top: `${((i * 59) % 94) + 3}%`,
  size: 1.2 + (i % 4) * 0.5,
  duration: 2.5 + (i % 5) * 0.4,
  delay: ((i * 0.21) % 2.8) + (i % 3) * 0.15,
}));

const LANDING_CHIPS_EXPLORERS = [
  "✅ Welcome to AI",
  "🎮 History of AI + Game",
  "🤖 AI vs Humans + Game",
  "⚡ Types of AI + Game",
] as const;

const LANDING_CHIPS_BUILDERS = [
  "🐍 Python Basics",
  "📦 Variables + Sim",
  "🔀 Decisions + Sim",
  "🔁 Loops + Sim",
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");
  const urlError = searchParams.get("error");

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(!!urlToken);
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tryLoadUser = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    setUser(null);
    setToken(t);
    try {
      const res = await fetch(`/api/demo/user?token=${encodeURIComponent(t)}`);
      if (!res.ok) {
        setError("Invalid or expired token");
        setToken(null);
        setUser(null);
        return;
      }
      const data = (await res.json()) as DemoUser;
      setUser(data);
      setToken(t);
    } catch {
      setError("Invalid or expired token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlError === "no-token") {
      setError("A demo token is required to open the demo.");
    }
  }, [urlError]);

  useEffect(() => {
    if (!urlToken) {
      setLoading(false);
      setToken(null);
      setUser(null);
      if (urlError !== "no-token") setError(null);
      return;
    }
    void tryLoadUser(urlToken);
  }, [urlToken, tryLoadUser, urlError]);

  const validateManualAndGo = async () => {
    const t = manualToken.trim();
    if (!t) {
      setError("Enter your demo token");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/demo/user?token=${encodeURIComponent(t)}`);
      if (!res.ok) {
        setError("Invalid or expired token");
        setLoading(false);
        return;
      }
      setUser(await res.json());
      setToken(t);
      const returnTo = searchParams.get("returnTo");
      router.push(
        returnTo
          ? `${returnTo}?token=${encodeURIComponent(t)}`
          : `/demo?token=${encodeURIComponent(t)}`
      );
    } catch {
      setError("Invalid or expired token");
    } finally {
      setLoading(false);
    }
  };

  const starLayer = useMemo(
    () =>
      STAR_LAYOUT.map((s, i) => (
        <span
          key={i}
          className="star-field-dot"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      )),
    []
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "var(--bg-space, #080c1e)" }}>
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-500/8 blur-[120px]" />
      </div>

      {/* Star field */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {starLayer}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-md overflow-hidden rounded-2xl border"
          style={{
            background: "rgba(13,15,30,0.88)",
            borderColor: "rgba(99,102,241,0.22)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.05) inset, 0 32px 96px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)",
          }}
        >
          {/* Header */}
          <div
            className="flex flex-col items-center gap-2 px-8 py-7"
            style={{
              background: "linear-gradient(135deg, rgba(79,70,229,0.4) 0%, rgba(99,102,241,0.18) 60%, rgba(6,182,212,0.08) 100%)",
              borderBottom: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <AkmindLogo
              variant="wordmark"
              priority
              className="h-10 w-auto max-w-[180px] object-contain"
            />
            <p className="text-xs font-semibold tracking-widest text-indigo-300/70 uppercase">
              Dream · Discover · Shine
            </p>
          </div>

          {/* Body */}
          <div className="px-7 py-7">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-10"
                >
                  <div
                    className="h-9 w-9 animate-spin rounded-full border-2"
                    style={{ borderColor: "rgba(99,102,241,0.25)", borderTopColor: "#6366f1" }}
                  />
                  <p className="text-sm text-slate-500">Loading your demo…</p>
                </motion.div>
              )}

              {!loading && user && token && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-center">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-indigo-200"
                      style={{ background: "rgba(99,102,241,0.2)", border: "2px solid rgba(99,102,241,0.4)" }}
                    >
                      {initials(user.childName)}
                    </div>
                  </div>
                  <h2 className="font-display mt-4 text-center text-2xl font-bold text-white">
                    Welcome, {user.childName}!
                  </h2>
                  <p className="mt-1 text-center text-sm text-slate-400">
                    {user.course === "AI Builders"
                      ? "Ready to build with AI?"
                      : "Ready to explore AI?"}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {(user.course === "AI Builders"
                      ? LANDING_CHIPS_BUILDERS
                      : LANDING_CHIPS_EXPLORERS
                    ).map((label) => (
                      <span
                        key={label}
                        className="rounded-full px-3 py-1 text-xs font-medium text-indigo-300"
                        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-6 w-full rounded-xl py-3.5 text-base font-bold text-white transition cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #4338ca 100%)",
                      boxShadow: "0 0 28px rgba(99,102,241,0.35), 0 4px 12px rgba(0,0,0,0.3)",
                    }}
                    onClick={() => {
                      const returnTo = searchParams.get("returnTo");
                      router.push(
                        returnTo
                          ? `${returnTo}?token=${encodeURIComponent(token)}`
                          : `/demo?token=${encodeURIComponent(token)}`
                      );
                    }}
                  >
                    Start Demo →
                  </motion.button>
                </motion.div>
              )}

              {!loading && !user && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-5 overflow-hidden rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center"
                      >
                        <p className="text-sm font-semibold text-red-400">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <h3 className="font-display text-lg font-bold text-white">
                    Enter your demo token
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Check your email for your unique token
                  </p>
                  <input
                    type="text"
                    className="font-mono mt-4 w-full rounded-xl p-3.5 text-sm text-slate-200 outline-none transition-all duration-150 placeholder:text-slate-600 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.35)] focus:border-indigo-500/50"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(99,102,241,0.2)",
                      caretColor: "#6366f1",
                    }}
                    placeholder="e.g. abc123xyz456"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void validateManualAndGo();
                    }}
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-3 w-full rounded-xl py-3.5 text-sm font-bold text-white cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #4338ca 100%)",
                      boxShadow: "0 0 24px rgba(99,102,241,0.3), 0 4px 12px rgba(0,0,0,0.3)",
                    }}
                    onClick={() => void validateManualAndGo()}
                  >
                    Access Demo →
                  </motion.button>

                  <p className="mt-6 text-center text-xs text-slate-600">
                    Don&apos;t have a token?
                  </p>
                  <div className="mt-2 text-center">
                    <Link
                      href={LANDING_URL}
                      className="text-sm font-medium text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Book a free demo at akmind.com →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ background: "#080c1e" }}>
          <div
            className="h-9 w-9 animate-spin rounded-full border-2"
            style={{ borderColor: "rgba(99,102,241,0.2)", borderTopColor: "#6366f1" }}
          />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
