"use client";

import AkmindLogo from "@/components/AkmindLogo";
import NOVAChat from "@/components/NOVAChat";
import NOVACharacter from "@/components/NOVACharacter";
import { DEMO_BADGES } from "@/lib/demo-badges";
import { applyDemoCoursePreference } from "@/lib/demo-course-preference-client";
import { normalizeClientDemoToken } from "@/lib/demo-token-client";
import type { DemoUser } from "@/types/demo";
import {
  Award,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  Flame,
  Home,
  Layers,
  LayoutDashboard,
  Lock,
  Zap,
} from "lucide-react";
import { animate, motion, useMotionValue } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const LESSONS_EXPLORERS = [
  {
    id: 1,
    title: "History of AI — From Dreams to Machines",
    type: "Self-Paced + Game",
    description: "Timeline from ancient myths to ChatGPT. Key AI milestones.",
    duration: "6+ min",
    xpReward: 300,
    color: "purple" as const,
    hasGame: true,
  },
  {
    id: 2,
    title: "AI vs Humans: What Can AI Do?",
    type: "Self-Paced + Game",
    description: "Strengths and limits of AI vs human intelligence.",
    duration: "6+ min",
    xpReward: 300,
    color: "cyan" as const,
    hasGame: true,
  },
  {
    id: 3,
    title: "Types of AI: Narrow, General & Super",
    type: "Self-Paced + Game",
    description:
      "Different levels of AI with fun examples. Where are we today?",
    duration: "6+ min",
    xpReward: 300,
    color: "amber" as const,
    hasGame: true,
  },
] as const;

const LESSONS_BUILDERS = [
  {
    id: 11,
    title: "Variable Machine",
    type: "Self-Paced + Game",
    description:
      "Power the Terminal City grid — define five Python variables to restore the towers.",
    duration: "6+ min",
    xpReward: 150,
    color: "purple" as const,
    hasGame: true,
  },
  {
    id: 12,
    title: "Decision Tower",
    type: "Self-Paced + Game",
    description:
      "Route three passengers with if / elif / else — the same branching idea behind classifiers.",
    duration: "6+ min",
    xpReward: 175,
    color: "cyan" as const,
    hasGame: true,
  },
  {
    id: 13,
    title: "Loop Engine",
    type: "Self-Paced + Game",
    description:
      "Repair towers with for-loops and range() — repetition like training over many examples.",
    duration: "6+ min",
    xpReward: 175,
    color: "amber" as const,
    hasGame: true,
  },
] as const;

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )demo_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isUnlocked(
  lessonId: number,
  lessonsComplete: number[],
  lessons: readonly { id: number }[],
): boolean {
  const ids = lessons.map((l) => l.id);
  const idx = ids.indexOf(lessonId);
  if (idx === -1) return false;
  if (idx === 0) return true;
  return lessonsComplete.includes(ids[idx - 1]!);
}

function streakFromStart(
  lessonsComplete: number[],
  lessons: readonly { id: number }[],
): number {
  const ids = lessons.map((l) => l.id);
  let s = 0;
  for (const id of ids) {
    if (lessonsComplete.includes(id)) s++;
    else break;
  }
  return s;
}

function isAdminTester(user: DemoUser | null): boolean {
  if (!user) return false;
  return (
    user.email?.toLowerCase() === "admin@akmind.com" || user.name === "Admin"
  );
}

// Count-up animation using useMotionValue
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [mv, value]);

  return <span className={className}>{display}</span>;
}

const lessonContainerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const lessonCardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

function DemoDashboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState<string | null>(null);
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [bottomActive, setBottomActive] = useState<
    "home" | "badges" | "nova" | "programs"
  >("home");

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
      const data = (await res.json()) as DemoUser;
      setAuthIssue(null);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash === "#demo-lessons") {
      requestAnimationFrame(() => {
        document
          .getElementById("demo-lessons")
          ?.scrollIntoView({ behavior: "smooth" });
        setBottomActive("home");
      });
    }
  }, [loading, user]);

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

  const heroEarnedBadges = useMemo(() => {
    const slugs = user?.earnedBadges;
    if (!slugs?.length) return [];
    return slugs
      .map((slug) => DEMO_BADGES.find((b) => b.slug === slug))
      .filter((b): b is (typeof DEMO_BADGES)[number] => Boolean(b));
  }, [user?.earnedBadges]);

  const lessons =
    user?.course === "AI Builders" ? LESSONS_BUILDERS : LESSONS_EXPLORERS;

  const lessonsDone = user
    ? lessons.filter((l) => user.lessonsComplete.includes(l.id)).length
    : 0;
  const badgesEarnedCount = user?.earnedBadges?.length ?? 0;
  const xp = user?.xp ?? 0;
  const userName = user?.name || "";
  const heroLevel = Math.max(1, Math.floor(xp / 300) + 1);
  const xpHeroPct = Math.min(100, (xp / 900) * 100);
  const streak = user ? streakFromStart(user.lessonsComplete, lessons) : 0;
  const adminMode = isAdminTester(user);
  const parentInitial = (user?.name || "?").trim().charAt(0).toUpperCase() || "?";

  const nextLessonId = user
    ? lessons.find(
        (l) =>
          !user.lessonsComplete.includes(l.id) &&
          (adminMode || isUnlocked(l.id, user.lessonsComplete, lessons))
      )?.id
    : undefined;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const showShell = !loading && user && token;

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
              className="flex items-center gap-3 rounded-lg bg-[#1E2235] px-3 py-2.5 text-sm font-bold text-[#c0c1ff] border-r-2 border-[#c0c1ff]"
              scroll={pathname === "/demo" || pathname === "/demo/" ? false : undefined}
              onClick={() => {
                if (pathname === "/demo" || pathname === "/demo/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              <LayoutDashboard className="h-5 w-5 text-[#c0c1ff]" />
              Dashboard
            </Link>
            <Link
              href={badgesHref}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#c7c4d7] transition hover:bg-[#1E2235]"
            >
              <Award className="h-5 w-5 shrink-0 text-[#908fa0]" />
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span>Badges</span>
                {badgesEarnedCount > 0 ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">
                    {badgesEarnedCount}
                  </span>
                ) : null}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection("demo-nova")}
              className="cursor-pointer flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#c7c4d7] transition hover:bg-[#1E2235]"
            >
              <Bot className="h-5 w-5 text-slate-500" />
              NOVA
            </button>
            {adminMode && (
              <Link
                href={programsHref}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#c7c4d7] transition hover:bg-[#1E2235]"
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
                <p className="font-display text-lg font-bold text-indigo-300">{xp} XP</p>
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
            <div className="h-10 rounded-lg bg-[#1d1f2b]" />
            <div className="h-40 rounded-xl bg-[#1d1f2b]" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-[#1d1f2b]" />
              ))}
            </div>
            <div className="h-56 rounded-xl bg-[#1d1f2b]" />
          </div>
        )}

        {!loading && user && token && (
          <>
            <header
              id="dashboard-top"
              className="sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-4 py-3.5 backdrop-blur-[20px] md:-mx-8 md:px-6"
              style={{ background: "rgba(13,15,30,0.88)" }}
            >
              <nav
                className="flex items-center gap-3 text-sm text-slate-300"
                aria-label="Breadcrumb"
              >
                <AkmindLogo
                  variant="wordmark"
                  className="h-8 w-auto max-w-[120px] object-contain md:hidden"
                />
                <span className="font-medium text-white">Dashboard</span>
              </nav>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  aria-label="Notifications"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                >
                  <Bell className="h-5 w-5" />
                </button>
                <span className="font-mono rounded-full border border-indigo-500/40 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">
                  {xp} XP
                </span>
              </div>
            </header>

            <section className="relative mx-auto max-w-4xl overflow-hidden rounded-xl p-6 md:p-8 bg-[#1d1f2b] border border-[rgba(255,255,255,0.08)]" style={{ backgroundImage: "radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(6,182,212,0.04) 0%, transparent 60%)" }}>
              <div className="pointer-events-none absolute right-4 top-4 sm:pointer-events-auto md:right-8 md:top-6">
                <div className="drop-shadow-[0_0_14px_rgba(99,102,241,0.35)]">
                  <NOVACharacter size="sm" emotion="happy" animate />
                </div>
              </div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {user.course.toUpperCase()} PROGRAM · DEMO
              </p>
              <h1 className="font-display mt-3 max-w-[85%] text-2xl font-extrabold tracking-tight text-white md:text-3xl lg:max-w-xl">
                {user.childName}&apos;s Learning Journey
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {user.course} · Demo
              </p>

              {/* Animated XP bar — 4px, Stitch spec */}
              <div className="max-w-sm">
                <div className="stitch-progress-track mt-6">
                  <motion.div
                    className="stitch-progress-fill"
                    initial={{ width: "0%" }}
                    animate={{ width: `${xpHeroPct}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
                  />
                </div>
              </div>

              {heroEarnedBadges.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {heroEarnedBadges.map((b) => (
                    <span
                      key={b.slug}
                      title={b.name}
                      className="demo-ak-glass-surface flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-amber-400/70 text-lg leading-none"
                    >
                      {b.icon}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="font-mono mt-2 text-xs text-slate-500">
                {xp} XP · Level {heroLevel}
              </p>
            </section>

            {/* Stats grid with count-up */}
            <div className="mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
              <div className="stat-card group bg-[#161929] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-indigo-500/25 hover:bg-[#1a1d2e]">
                <div className="stat-card-icon flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                  <Zap className="h-5 w-5" />
                </div>
                <p className="font-mono mt-3 text-xl font-bold tabular-nums text-white sm:text-2xl">
                  <AnimatedNumber value={xp} />
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  POINTS EARNED
                </p>
              </div>
              <div className="stat-card group bg-[#161929] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-orange-500/25 hover:bg-[#1a1d2e]">
                <div className="stat-card-icon flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
                  <Flame className="h-5 w-5" />
                </div>
                <p className="font-mono mt-3 text-xl font-bold tabular-nums text-white sm:text-2xl">
                  <AnimatedNumber value={streak} />
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  LESSON STREAK
                </p>
              </div>
              <div className="stat-card group bg-[#161929] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-emerald-500/25 hover:bg-[#1a1d2e]">
                <div className="stat-card-icon flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="font-mono mt-3 text-xl font-bold tabular-nums text-white sm:text-2xl">
                  <AnimatedNumber value={lessonsDone} />
                  <span className="text-slate-500">/{lessons.length}</span>
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  LESSONS DONE
                </p>
              </div>
              <div className="stat-card group bg-[#161929] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-amber-500/25 hover:bg-[#1a1d2e]">
                <div className="stat-card-icon flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                  <Award className="h-5 w-5" />
                </div>
                <p className="font-mono mt-3 text-xl font-bold tabular-nums text-white sm:text-2xl">
                  <AnimatedNumber value={badgesEarnedCount} />
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  BADGES EARNED
                </p>
              </div>
            </div>

            <section
              id="demo-badges"
              className="mx-auto mt-10 max-w-4xl scroll-mt-28"
            >
              <h2 className="font-display demo-ak-section-heading mb-4 text-lg font-bold text-white">
                Badges
              </h2>
              <div className="demo-ak-glass-surface rounded-xl p-5">
                {user.badgeEarned ? (
                  <p className="text-sm font-medium text-emerald-400">
                    Demo explorer badge earned — great work!
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Complete all three lessons to earn your demo badge.
                  </p>
                )}
              </div>
            </section>

            <section
              id="demo-lessons"
              className="mx-auto mt-10 max-w-4xl scroll-mt-28"
            >
              <h2 className="font-display demo-ak-section-heading mb-4 text-lg font-bold text-white">
                Your Learning Path
              </h2>

              {/* Staggered lesson cards */}
              <motion.div
                className="flex flex-col gap-4"
                variants={lessonContainerVariants}
                initial="hidden"
                animate="show"
              >
                {lessons.map((lesson) => {
                  const done = user.lessonsComplete.includes(lesson.id);
                  const unlocked =
                    adminMode ||
                    isUnlocked(lesson.id, user.lessonsComplete, lessons);
                  const active =
                    unlocked && !done && lesson.id === nextLessonId;
                  const quizScore = user.quizScores[String(lesson.id)];

                  return (
                    <motion.div
                      key={lesson.id}
                      variants={lessonCardVariants}
                      className={`lesson-card-hover relative rounded-xl p-5 transition-colors duration-200 ${
                        done
                          ? "bg-[#161929] border border-[rgba(255,255,255,0.08)] border-l-2 border-l-[#10B981] hover:bg-[#1b1d2d] hover:border-[rgba(255,255,255,0.12)]"
                          : active
                            ? "bg-[#1E2235] border border-[rgba(192,193,255,0.4)] border-l-2 border-l-[#c0c1ff] hover:bg-[#222540] hover:border-[rgba(192,193,255,0.55)] hover:shadow-[0_0_28px_rgba(99,102,241,0.12)]"
                            : "bg-[#161929] border border-[rgba(255,255,255,0.08)] opacity-60"
                      }`}
                    >
                      {/* XP chip — Stitch tertiary/gold */}
                      <span
                        className="font-mono absolute right-4 top-4 rounded px-2 py-0.5 text-[10px] font-bold"
                        style={{ color: '#ffb95f', background: 'rgba(255,185,95,0.1)', border: '1px solid rgba(255,185,95,0.2)' }}
                      >
                        +{lesson.xpReward} XP
                      </span>

                      <div className="flex gap-4 pr-16">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                          style={
                            done
                              ? { background: "var(--cn-primary-container)", color: "#fff" }
                              : unlocked
                                ? { border: "2px solid var(--cn-primary-container)", color: "#fff" }
                                : { border: "2px solid var(--cn-outline-variant)", color: "var(--cn-outline)" }
                          }
                        >
                          {done ? (
                            <Check className="h-6 w-6" strokeWidth={3} />
                          ) : unlocked ? (
                            lesson.id
                          ) : (
                            <Lock className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                              done
                                ? "bg-[rgba(255,185,95,0.1)] text-[#ffb95f] border border-[rgba(255,185,95,0.2)]"
                                : active
                                  ? "bg-[rgba(93,230,255,0.1)] text-[#5de6ff] border border-[rgba(93,230,255,0.2)]"
                                  : "bg-[#323440] text-[#c7c4d7] border border-[rgba(255,255,255,0.08)] uppercase"
                            }`}
                          >
                            {done
                              ? "Completed"
                              : active
                                ? "In Progress"
                                : "Locked"}
                          </span>
                          <h3 className="font-display mt-2 text-base font-bold text-white md:text-lg">
                            {lesson.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {lesson.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="font-mono rounded-full bg-slate-800/80 px-2.5 py-1 text-xs text-slate-400">
                              {lesson.duration}
                            </span>
                            {lesson.hasGame ? (
                              <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300">
                                Includes Game
                              </span>
                            ) : null}
                            {done && quizScore != null ? (
                              <span className="font-mono rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                                Quiz: {quizScore}%
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="hidden shrink-0 flex-col items-end justify-center gap-2 sm:flex">
                          {!unlocked ? (
                            <span className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-500">
                              Locked
                            </span>
                          ) : done ? (
                            <div className="flex flex-col items-end gap-2">
                              <span className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                                Completed ✓
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/demo/lesson/${lesson.id}?token=${encodeURIComponent(token)}`
                                  )
                                }
                                className="cursor-pointer text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-150"
                              >
                                Review →
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/demo/lesson/${lesson.id}?token=${encodeURIComponent(token)}`
                                )
                              }
                              className="cursor-pointer px-4 py-1.5 bg-[#c0c1ff] text-[#0d0096] rounded-lg font-bold text-[12px] flex items-center gap-2 hover:bg-[#d4d5ff] active:scale-95 transition-all duration-150 shadow-[0_0_16px_rgba(192,193,255,0.2)]"
                            >
                              Continue →
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end sm:hidden">
                        {!unlocked ? (
                          <span className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-500">
                            Locked
                          </span>
                        ) : done ? (
                          <div className="flex w-full flex-col gap-2">
                            <span className="flex items-center justify-center gap-1 text-sm font-semibold text-emerald-400">
                              Completed ✓
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/demo/lesson/${lesson.id}?token=${encodeURIComponent(token)}`
                                )
                              }
                              className="cursor-pointer w-full rounded-lg border border-indigo-500/30 py-2 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors duration-150"
                            >
                              Review →
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/demo/lesson/${lesson.id}?token=${encodeURIComponent(token)}`
                              )
                            }
                            className="cursor-pointer w-full px-4 py-2.5 bg-[#c0c1ff] text-[#0d0096] rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#d4d5ff] active:scale-95 transition-all duration-150 shadow-[0_0_16px_rgba(192,193,255,0.2)]"
                          >
                            Continue →
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </section>

          </>
        )}

        {!loading && (!user || !token) && (
          <div className="flex min-h-[60vh] items-center justify-center py-16">
            <div className="demo-ak-glass-elevated w-full max-w-sm rounded-xl p-8 text-center">
              <div className="text-5xl">{authIssue ? "⚠️" : "🔑"}</div>
              <h2 className="font-display mt-4 text-xl font-bold text-white">
                {authIssue ? "Could not load demo" : "Session Expired"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {authIssue ? (
                  <>
                    <span className="font-mono text-xs text-slate-300">{authIssue}</span>
                    <span className="mt-3 block text-slate-400">
                      Use the full link{" "}
                      <code className="rounded bg-black/30 px-1 py-0.5 text-[11px] text-cyan-200">
                        /demo?token=…
                      </code>{" "}
                      from your email, or the admin dev token if you are testing locally.
                      Clear site cookies for this host if an old token keeps loading.
                    </span>
                  </>
                ) : (
                  <>
                    Your demo session has expired. Please use your original demo link from
                    your email to continue.
                  </>
                )}
              </p>
              <a
                href={
                  process.env.NEXT_PUBLIC_LANDING_URL ??
                  "https://www.akmind.com"
                }
                className="mt-6 block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white no-underline transition hover:bg-indigo-500"
              >
                Back to AKMIND →
              </a>
              <p className="mt-3 text-xs text-slate-500">
                Need help? Email hello@akmind.com
              </p>
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
                if (isDemoHome) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  router.push(dashboardHref);
                }
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
                scrollToSection("demo-nova");
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
                  className="cursor-pointer mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
                  onClick={() => {
                    setXpModalOpen(false);
                    setBottomActive("home");
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {!loading && user && token ? (
        <div id="demo-nova" className="scroll-mt-32">
          <NOVAChat
            userName={userName}
            childName={user?.childName}
            userKey={user?.email || userName || undefined}
            xp={xp}
            lessonsComplete={user?.lessonsComplete ?? []}
            quizScores={user?.quizScores}
            badgeEarned={user?.badgeEarned}
            currentModule={1}
            lessonOrder={nextLessonId ?? lessons[0]?.id ?? 1}
            currentLesson="Demo Dashboard"
            course={user?.course}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function DemoDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen overflow-x-hidden">
          <div className="h-16 border-b border-indigo-300/20 bg-black/20" />
          <div className="mx-auto max-w-3xl animate-pulse space-y-6 px-6 py-8">
            <div className="h-8 w-2/3 rounded-lg bg-indigo-300/20" />
            <div className="h-4 max-w-md rounded bg-indigo-300/20" />
          </div>
        </div>
      }
    >
      <DemoDashboardInner />
    </Suspense>
  );
}
