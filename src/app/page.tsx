"use client";

import type { DemoUser } from "@/types/demo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL ?? "https://www.akmind.com";

const STAR_LAYOUT = Array.from({ length: 50 }, (_, i) => ({
  left: `${((i * 37) % 97) + 1}%`,
  top: `${((i * 59) % 94) + 3}%`,
  size: 1.5 + (i % 4) * 0.55,
  duration: 2.2 + (i % 5) * 0.35,
  delay: ((i * 0.21) % 2.8) + (i % 3) * 0.15,
}));

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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050510]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {starLayer}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="bg-indigo-600 p-8 text-center">
            <p className="text-3xl font-bold text-white">⚡ AKMIND</p>
            <p className="mt-1 text-sm text-indigo-200">
              Dream. Discover. Shine.
            </p>
          </div>

          <div className="p-8">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <p className="text-sm text-slate-500">Loading your demo…</p>
              </div>
            )}

            {!loading && error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-red-800">{error}</p>
                <Link
                  href={LANDING_URL}
                  className="mt-2 inline-block text-sm font-medium text-indigo-600 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book a free demo at akmind.com →
                </Link>
              </div>
            )}

            {!loading && user && token && (
              <>
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
                    {initials(user.childName)}
                  </div>
                </div>
                <h2 className="mt-4 text-center text-2xl font-bold text-slate-900">
                  Welcome, {user.childName}!
                </h2>
                <p className="mt-1 text-center text-slate-500">
                  Ready to explore AI?
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    "✅ Welcome to AI",
                    "🎮 History of AI + Game",
                    "🤖 AI vs Humans + Game",
                    "⚡ Types of AI + Game",
                  ].map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-indigo-600 py-4 text-lg font-bold text-white transition hover:bg-indigo-700"
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
                </button>
              </>
            )}

            {!loading && !user && (
              <>
                <h3 className="text-lg font-semibold text-slate-900">
                  Enter your demo token
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Check your email for your unique token
                </p>
                <input
                  type="text"
                  className="mt-4 w-full rounded-xl border border-slate-200 p-3 font-mono text-slate-900 outline-none ring-indigo-500 focus:border-indigo-300 focus:ring-2"
                  placeholder="e.g. abc123xyz456"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void validateManualAndGo();
                  }}
                />
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700"
                  onClick={() => void validateManualAndGo()}
                >
                  Access Demo →
                </button>
                <p className="mt-6 text-center text-sm text-slate-400">
                  Don&apos;t have a token?
                </p>
                <div className="mt-2 text-center">
                  <Link
                    href={LANDING_URL}
                    className="font-medium text-indigo-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Book a free demo at akmind.com →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050510]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
