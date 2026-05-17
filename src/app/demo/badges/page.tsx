"use client";

import AkmindLogo from "@/components/AkmindLogo";
import { DEMO_BADGES } from "@/lib/demo-badges";
import { applyDemoCoursePreference } from "@/lib/demo-course-preference-client";
import { normalizeClientDemoToken } from "@/lib/demo-token-client";
import type { DemoUser } from "@/types/demo";
import {
  ArrowLeft,
  Award,
  Bot,
  Home,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function isAdminTester(user: import("@/types/demo").DemoUser | null): boolean {
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

function streakFromStart(lessonsComplete: number[]): number {
  let s = 0;
  for (let i = 1; i <= 3; i++) {
    if (lessonsComplete.includes(i)) s++;
    else break;
  }
  return s;
}

type DemoBadgeDisplayRow = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
};

function demoBadgesForUser(user: DemoUser): DemoBadgeDisplayRow[] {
  const lc = user.lessonsComplete ?? [];
  if (user.course === "AI Builders") {
    const anyLesson = lc.length > 0;
    const allBuilders = [11, 12, 13].every((id) => lc.includes(id));
    return [
      {
        slug: "first-step",
        name: "First Step",
        description: "Complete your first lesson",
        icon: "🚀",
        earned: anyLesson,
      },
      {
        slug: "variable-master",
        name: "Variable Master",
        description: "Complete the Variables lesson",
        icon: "📦",
        earned: lc.includes(11),
      },
      {
        slug: "logic-builder",
        name: "Logic Builder",
        description: "Complete the Decisions lesson",
        icon: "🔀",
        earned: lc.includes(12),
      },
      {
        slug: "loop-champion",
        name: "Loop Champion",
        description: "Complete the Loops lesson",
        icon: "🔁",
        earned: lc.includes(13),
      },
      {
        slug: "python-pioneer",
        name: "Python Pioneer",
        description: "Complete all 3 AI Builders lessons",
        icon: "🐍",
        earned: allBuilders,
      },
    ];
  }
  return DEMO_BADGES.map((b) => ({
    slug: b.slug,
    name: b.name,
    description: b.description,
    icon: b.icon,
    earned: b.condition(user),
  }));
}

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

function DemoBadgesInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [authIssue, setAuthIssue] = useState<string | null>(null);
  const [bottomActive, setBottomActive] = useState<
    "home" | "badges" | "nova" | "programs"
  >("badges");

  const load = useCallback(async (t: string) => {
    setLoading(true);
    setAuthIssue(null);
    try {
      const res = await fetch(`/api/demo/user?token=${encodeURIComponent(t)}`);
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) detail = `${detail}: ${body.error}`;
        } catch {
          /* ignore */
        }
        setAuthIssue(detail);
        setUser(null);
        return;
      }
      setAuthIssue(null);
      const data = (await res.json()) as DemoUser;
      const merged = applyDemoCoursePreference(t, {
        ...data,
        earnedBadges: data.earnedBadges ?? [],
      });
      setUser(merged);
    } catch {
      setAuthIssue("Network error — check that the dev server is running.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sessionToken =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("demo_token")
        : null;
    const raw = tokenFromUrl ?? readCookieToken() ?? sessionToken;
    const t = raw ? normalizeClientDemoToken(raw) : null;
    setToken(t);
    if (!t) {
      setLoading(false);
      setUser(null);
      setAuthIssue(null);
      return;
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("demo_token", t);
    }
    if (!tokenFromUrl && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("token", t);
      window.history.replaceState({}, "", url.toString());
    }
    void load(t);
  }, [tokenFromUrl, load]);

  const xp = user?.xp ?? 0;
  const streak = user ? streakFromStart(user.lessonsComplete) : 0;
  const parentInitial =
    (user?.name || "?").trim().charAt(0).toUpperCase() || "?";
  const heroLevel = Math.max(1, Math.floor(xp / 300) + 1);

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
  const adminMode = isAdminTester(user);

  const showShell = !loading && user && token;
  const displayBadges = useMemo(
    () => (user ? demoBadgesForUser(user) : []),
    [user]
  );
  const earnedForProgress = useMemo(() => {
    if (!user || user.course !== "AI Builders") {
      return displayBadges.filter((b) => b.earned).length;
    }
    return displayBadges
      .filter((b) => b.slug !== "python-pioneer")
      .filter((b) => b.earned).length;
  }, [user, displayBadges]);
  const badgeTotal = 4;
  const progressPct = (earnedForProgress / badgeTotal) * 100;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {showShell ? (
        <aside
          className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-[rgba(255,255,255,0.08)] backdrop-blur-[20px] md:flex"
          style={{ background: "var(--cn-surface-container-min)", boxShadow: "1px 0 0 rgba(255,255,255,0.06)" }}
        >
          <div className="flex w-full min-w-0 flex-col items-center border-b border-[rgba(255,255,255,0.08)] px-4 py-5">
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
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              <LayoutDashboard className="h-5 w-5 text-slate-500" />
              Dashboard
            </Link>
            <Link
              href={badgesHref}
              className="flex items-center gap-3 rounded-lg bg-[#1E2235] px-3 py-2.5 text-left text-sm font-bold text-[#c0c1ff] border-r-2 border-[#c0c1ff]"
            >
              <Award className="h-5 w-5 text-[#c0c1ff]" />
              Badges
            </Link>
            <Link
              href={`${dashboardHref}#demo-nova`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              <Bot className="h-5 w-5 text-slate-500" />
              NOVA
            </Link>
            {adminMode && (
              <Link
                href={programsHref}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                <Layers className="h-5 w-5 text-slate-500" />
                Programs
              </Link>
            )}
          </nav>

          <div className="mt-auto border-t border-[rgba(255,255,255,0.08)] p-4">
            <div className="demo-ak-glass-surface rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-sm font-bold text-indigo-100">
                  {parentInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.childName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setXpModalOpen(true)}
                className="mt-3 w-full text-left"
              >
                <p className="font-mono text-lg font-bold text-indigo-300">{xp} XP</p>
              </button>
              <span className="mt-2 inline-flex rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                {streak}d streak
              </span>
            </div>
          </div>
        </aside>
      ) : null}

      <div className={showShell ? "md:ml-[260px]" : ""}>
        <main className="relative z-10 min-h-screen px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-10">
          {loading && (
            <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
              <div className="h-8 rounded-lg bg-[#1d1f2b]" />
              <div className="h-6 max-w-md rounded bg-[#1d1f2b]" />
              <div className="h-3 max-w-sm rounded-full bg-[#1d1f2b]" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 rounded-xl bg-[#1d1f2b]" />
                ))}
              </div>
            </div>
          )}

          {!loading && user && token && (
            <div className="mx-auto max-w-4xl">
              <Link
                href={dashboardHref}
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Badges
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400 md:text-base">
                Collect badges by completing lessons and games
              </p>

              <div className="mt-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-300">Progress</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {earnedForProgress} / {badgeTotal}
                  </span>
                </div>
                <div className="h-1.5 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden mt-2 shadow-inner">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #22d3ee 0%, #818cf8 50%, #c0c1ff 100%)" }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.85, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
                {earnedForProgress === badgeTotal && (
                  <p className="mt-2 text-xs font-semibold text-amber-400">All badges earned!</p>
                )}
              </div>

              <section className="mt-10">
                <h2 className="font-display demo-ak-section-heading mb-4 text-lg font-bold text-white">
                  Demo Badges
                </h2>
                <motion.div
                  className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                >
                  {displayBadges.map((badge) => {
                    const earned = badge.earned;
                    return (
                      <motion.div
                        key={badge.slug}
                        variants={cardVariants}
                        className={`relative rounded-xl p-6 flex flex-col items-center text-center transition-all duration-200 group ${
                          earned
                            ? "badge-earned-glow bg-[#161929] border border-[rgba(192,193,255,0.15)] hover:bg-[#1a1d2e] hover:border-[rgba(192,193,255,0.25)]"
                            : "bg-[#161929] border border-[rgba(255,255,255,0.06)] opacity-45 hover:opacity-55"
                        }`}
                      >
                        {earned && (
                          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(192,193,255,0.07) 0%, transparent 70%)" }} />
                        )}
                        <div className={`badge-icon-glow w-16 h-16 rounded-xl flex items-center justify-center mb-4 text-3xl ${
                          earned
                            ? "bg-[rgba(192,193,255,0.1)] border border-[rgba(192,193,255,0.25)]"
                            : "bg-[#1d1f2b] border border-[rgba(255,255,255,0.05)]"
                        }`}>
                          {badge.icon}
                        </div>
                        <p className={`font-display text-sm font-bold leading-snug md:text-base ${earned ? "text-white" : "text-[#c7c4d7]"}`}>
                          {badge.name}
                        </p>
                        <p className="mt-1 flex-1 text-center text-xs leading-relaxed text-[#908fa0]">
                          {badge.description}
                        </p>
                        <div className="mt-4 flex justify-center">
                          {earned ? (
                            <span className="px-3 py-1 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)] text-[#10B981] font-mono text-[11px] font-bold tracking-wide">
                              EARNED
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-[#1d1f2b] border border-[rgba(255,255,255,0.08)] text-[#c7c4d7] font-mono text-[11px]">
                              LOCKED
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </section>
            </div>
          )}

          {!loading && (!user || !token) && (
            <div className="flex min-h-[60vh] items-center justify-center py-16">
              <div className="demo-ak-glass-elevated w-full max-w-sm rounded-xl p-8 text-center">
                <div className="text-5xl">{authIssue ? "⚠️" : "🔑"}</div>
                <h2 className="mt-4 text-xl font-bold text-white">
                  {authIssue ? "Could not load demo" : "Session Expired"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {authIssue ? (
                    <>
                      <span className="font-mono text-xs text-slate-300">{authIssue}</span>
                      <span className="mt-3 block">
                        Try opening{" "}
                        <Link
                          href="/demo"
                          className="text-cyan-400 underline"
                        >
                          /demo
                        </Link>{" "}
                        with your token in the URL, or clear cookies for this site.
                      </span>
                    </>
                  ) : (
                    <>
                      Your demo session has expired. Please use your original demo
                      link from your email to continue.
                    </>
                  )}
                </p>
                <Link
                  href={
                    process.env.NEXT_PUBLIC_LANDING_URL ??
                    "https://www.akmind.com"
                  }
                  className="mt-6 block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white no-underline transition hover:bg-indigo-500"
                >
                  Back to AKMIND →
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>

      {!loading && user && token ? (
        <>
          <nav
            className="fixed bottom-0 left-0 z-30 flex h-16 w-full items-stretch border-t border-[rgba(255,255,255,0.08)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[20px] md:hidden"
            style={{ background: "var(--cn-surface-container-min)" }}
          >
            <button
              type="button"
              onClick={() => {
                setBottomActive("home");
                router.push(dashboardHref);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isDemoHome ? "text-[#5de6ff]" : "text-slate-500"
              }`}
              aria-label="Dashboard home"
            >
              <Home
                className="h-5 w-5"
                strokeWidth={isDemoHome ? 2.5 : 2}
              />
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                setBottomActive("badges");
                router.push(badgesHref);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isBadgesRoute ? "text-[#5de6ff]" : "text-slate-500"
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
                bottomActive === "nova" && isDemoHome
                  ? "text-[#5de6ff]"
                  : "text-slate-500"
              }`}
              aria-label="NOVA"
            >
              <Bot
                className="h-5 w-5"
                strokeWidth={
                  bottomActive === "nova" && isDemoHome ? 2.5 : 2
                }
              />
              NOVA
            </button>
            {adminMode && (
              <button
                type="button"
                onClick={() => {
                  setBottomActive("programs");
                  router.push(programsHref);
                }}
                className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                  isProgramsRoute ? "text-[#5de6ff]" : "text-slate-500"
                }`}
                aria-label="Programs"
              >
                <Layers
                  className="h-5 w-5"
                  strokeWidth={isProgramsRoute ? 2.5 : 2}
                />
                Programs
              </button>
            )}
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
                <h3 className="font-display text-lg font-bold text-white">Your XP</h3>
                <p className="font-mono mt-2 text-3xl font-black text-indigo-300">
                  {user.xp} XP
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Level {heroLevel}
                </p>
                <p className="mt-4 text-sm text-slate-400">
                  Complete lessons and quizzes to earn more XP. Reach the next
                  level at {heroLevel * 300} total XP.
                </p>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500"
                  onClick={() => {
                    setXpModalOpen(false);
                    setBottomActive("badges");
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function DemoBadgesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="mx-auto max-w-4xl animate-pulse space-y-6 px-4 py-8">
            <div className="h-10 rounded-lg bg-[#1d1f2b]" />
            <div className="h-6 max-w-sm rounded bg-[#1d1f2b]" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-xl bg-[#1d1f2b]" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <DemoBadgesInner />
    </Suspense>
  );
}
