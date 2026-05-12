"use client";

import AkmindLogo from "@/components/AkmindLogo";
import { normalizeClientDemoToken } from "@/lib/demo-token-client";
import type { DemoUser } from "@/types/demo";
import {
  ArrowLeft,
  Award,
  Bot,
  Check,
  Home,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function isAdminTester(user: DemoUser | null): boolean {
  if (!user) return false;
  return (
    user.email?.toLowerCase() === "admin@akmind.com" || user.name === "Admin"
  );
}

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )demo_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const PROGRAMS = [
  {
    id: "AI Explorers",
    title: "AI Explorers",
    emoji: "🔭",
    tagline: "Ages 8–12 · No coding required",
    description:
      "A story-driven journey through AI history and concepts. Students explore how AI works through games, timelines, and interactive challenges.",
    color: "indigo" as const,
  },
  {
    id: "AI Builders",
    title: "AI Builders",
    emoji: "🏗️",
    tagline: "Ages 12+ · Intro to Python",
    description:
      "Hands-on Python coding lessons where students build real logic and train AI models. Ideal for curious learners ready to write their first programs.",
    color: "cyan" as const,
  },
] as const;

function DemoProgramsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedCourse, setSavedCourse] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [bottomActive, setBottomActive] = useState<
    "home" | "badges" | "nova" | "programs"
  >("programs");

  const load = useCallback(async (t: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setAuthIssue(null);
    try {
      const res = await fetch(
        `/api/demo/user?token=${encodeURIComponent(t)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setAuthIssue((j as { error?: string }).error ?? "Access denied");
        return;
      }
      const j = (await res.json()) as { user: DemoUser };
      setUser(j.user);
      setSavedCourse(j.user.course ?? null);
    } catch {
      setAuthIssue("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t =
      normalizeClientDemoToken(tokenFromUrl ?? "") ?? readCookieToken() ?? null;
    if (!t) {
      setLoading(false);
      setAuthIssue("No demo token found.");
      return;
    }
    setToken(t);
    void load(t);
  }, [tokenFromUrl, load]);

  const handleSelectProgram = useCallback(
    async (course: "AI Explorers" | "AI Builders") => {
      if (!token) return;
      setSaving(course);
      try {
        const res = await fetch("/api/demo/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course }),
        });
        if (!res.ok) throw new Error("Failed");
        setSavedCourse(course);
        setToast(`Switched to ${course} ✓`);
        setTimeout(() => setToast(null), 2800);
        await load(token, { silent: true });
      } catch {
        setToast("Error saving — please try again");
        setTimeout(() => setToast(null), 3000);
      } finally {
        setSaving(null);
      }
    },
    [token, load]
  );

  const adminMode = isAdminTester(user);

  useEffect(() => {
    if (!loading && user && !adminMode) {
      router.replace(
        token ? `/demo?token=${encodeURIComponent(token)}` : "/demo"
      );
    }
  }, [loading, user, adminMode, token, router]);

  const xp = user?.xp ?? 0;
  const heroLevel = Math.max(1, Math.floor(xp / 300) + 1);
  const parentInitial =
    (user?.name || "?").trim().charAt(0).toUpperCase() || "?";

  const dashboardHref = token
    ? `/demo?token=${encodeURIComponent(token)}`
    : "/demo";
  const badgesHref = token
    ? `/demo/badges?token=${encodeURIComponent(token)}`
    : "/demo/badges";
  const programsHref = token
    ? `/demo/programs?token=${encodeURIComponent(token)}`
    : "/demo/programs";

  const isDemoHome = pathname === "/demo" || pathname === "/demo/";
  const isBadgesRoute = pathname.startsWith("/demo/badges");
  const isProgramsRoute = pathname.startsWith("/demo/programs");

  const showShell = !loading && user && token && adminMode;

  if (!loading && authIssue) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-400">{authIssue}</p>
          <Link href="/demo" className="mt-4 inline-block text-sm text-indigo-400 hover:underline">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {showShell ? (
        <aside
          className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-[rgba(99,102,241,0.12)] bg-[rgba(6,8,15,0.95)] backdrop-blur-[20px] md:flex"
          style={{ boxShadow: "4px 0 32px rgba(0,0,0,0.5)" }}
        >
          <div className="flex w-full min-w-0 flex-col items-center border-b border-[rgba(99,102,241,0.1)] px-4 py-5">
            <AkmindLogo
              variant="wordmark"
              priority
              className="h-auto max-h-24 w-full max-w-[200px] object-contain object-center"
            />
            <span className="mt-3 rounded-full bg-indigo-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
              Demo
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            <Link
              href={dashboardHref}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              <LayoutDashboard className="h-5 w-5 text-slate-500" />
              Dashboard
            </Link>
            <Link
              href={badgesHref}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              <Award className="h-5 w-5 shrink-0 text-slate-500" />
              Badges
            </Link>
            <Link
              href={`${dashboardHref}#demo-nova`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              <Bot className="h-5 w-5 text-slate-500" />
              NOVA
            </Link>
            <Link
              href={programsHref}
              className="flex items-center gap-3 rounded-lg bg-indigo-500/15 px-3 py-2.5 text-sm font-medium text-white"
            >
              <Layers className="h-5 w-5 text-indigo-400" />
              Programs
            </Link>
          </nav>

          <div className="mt-auto border-t border-[rgba(99,102,241,0.1)] p-4">
            <div className="demo-ak-glass-surface rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-sm font-bold text-indigo-100">
                  {parentInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user?.childName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setXpModalOpen(true)}
                className="mt-3 w-full text-left"
              >
                <p className="text-lg font-bold text-indigo-300">{xp} XP</p>
              </button>
              <span className="mt-2 inline-flex rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                Admin
              </span>
            </div>
          </div>
        </aside>
      ) : null}

      <div className={showShell ? "md:ml-[260px]" : ""}>
        <main className="relative z-10 min-h-screen px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-10">
          {loading && (
            <div className="mx-auto max-w-2xl space-y-6 animate-pulse">
              <div className="h-8 rounded-lg bg-[#1a2235]" />
              <div className="h-4 max-w-xs rounded bg-[#1a2235]" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="h-48 rounded-xl bg-[#1a2235]" />
                <div className="h-48 rounded-xl bg-[#1a2235]" />
              </div>
            </div>
          )}

          {!loading && user && token && adminMode && (
            <div className="mx-auto max-w-2xl">
              <Link
                href={dashboardHref}
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>

              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Programs
              </h1>
              <p className="mt-2 text-sm text-slate-400 md:text-base">
                Select the active program for this demo session. Only admins can
                change this.
              </p>

              {savedCourse && (
                <p className="mt-3 text-xs font-semibold text-indigo-300">
                  Current track:{" "}
                  <span className="text-white">{savedCourse}</span>
                </p>
              )}

              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {PROGRAMS.map((p) => {
                  const isActive = savedCourse === p.id;
                  const isSaving = saving === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!!saving}
                      onClick={() =>
                        handleSelectProgram(
                          p.id as "AI Explorers" | "AI Builders"
                        )
                      }
                      className={`group relative flex flex-col items-start rounded-2xl border p-6 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isActive
                          ? "border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_24px_rgba(99,102,241,0.15)]"
                          : "border-white/10 bg-white/[0.03] hover:border-indigo-500/30 hover:bg-indigo-500/5"
                      } ${saving && !isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isActive && (
                        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                      <span className="text-3xl">{p.emoji}</span>
                      <h2 className="mt-3 text-lg font-bold text-white">
                        {p.title}
                      </h2>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-400">
                        {p.tagline}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {p.description}
                      </p>
                      <span
                        className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? "bg-indigo-500/25 text-indigo-200"
                            : "bg-white/5 text-slate-400 group-hover:bg-indigo-500/15 group-hover:text-indigo-300"
                        }`}
                      >
                        {isSaving
                          ? "Saving…"
                          : isActive
                          ? "Active"
                          : "Select"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-10 text-xs text-slate-600">
                Changes apply to the demo session immediately. The student view
                will reflect the new program on next load.
              </p>
            </div>
          )}
        </main>
      </div>

      {!loading && user && token && adminMode ? (
        <>
          <nav
            className="fixed bottom-0 left-0 z-30 flex h-16 w-full items-stretch border-t border-[rgba(99,102,241,0.15)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[20px] md:hidden"
            style={{ background: "rgba(8,10,22,0.95)" }}
          >
            <button
              type="button"
              onClick={() => {
                setBottomActive("home");
                router.push(dashboardHref);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isDemoHome ? "text-[#06B6D4]" : "text-slate-500"
              }`}
              aria-label="Dashboard home"
            >
              <Home className="h-5 w-5" strokeWidth={isDemoHome ? 2.5 : 2} />
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                setBottomActive("badges");
                router.push(badgesHref);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isBadgesRoute ? "text-[#06B6D4]" : "text-slate-500"
              }`}
              aria-label="Badges"
            >
              <Award
                className="h-5 w-5"
                strokeWidth={isBadgesRoute ? 2.5 : 2}
              />
              Badges
            </button>
            <button
              type="button"
              onClick={() => {
                setBottomActive("nova");
                router.push(`${dashboardHref}#demo-nova`);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                bottomActive === "nova" ? "text-[#06B6D4]" : "text-slate-500"
              }`}
              aria-label="NOVA"
            >
              <Bot
                className="h-5 w-5"
                strokeWidth={bottomActive === "nova" ? 2.5 : 2}
              />
              NOVA
            </button>
            <button
              type="button"
              onClick={() => {
                setBottomActive("programs");
                router.push(programsHref);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isProgramsRoute ? "text-[#06B6D4]" : "text-slate-500"
              }`}
              aria-label="Programs"
            >
              <Layers
                className="h-5 w-5"
                strokeWidth={isProgramsRoute ? 2.5 : 2}
              />
              Programs
            </button>
          </nav>

          {xpModalOpen ? (
            <div
              className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center"
              onClick={() => setXpModalOpen(false)}
              role="presentation"
            >
              <div
                className="demo-ak-glass-elevated w-full max-w-sm rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <h3 className="text-lg font-bold text-white">Your XP</h3>
                <p className="mt-2 text-3xl font-black text-indigo-300">
                  {xp} XP
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Level {heroLevel}
                </p>
                <button
                  type="button"
                  onClick={() => setXpModalOpen(false)}
                  className="mt-6 w-full rounded-xl bg-indigo-500/20 py-2.5 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/30"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-6">
          <div className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemoProgramsPage() {
  return (
    <Suspense>
      <DemoProgramsInner />
    </Suspense>
  );
}
