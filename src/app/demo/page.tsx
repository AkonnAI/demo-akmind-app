"use client";

import NOVAChat from "@/components/NOVAChat";
import NOVACharacter from "@/components/NOVACharacter";
import type { DemoUser } from "@/types/demo";
import { motion } from "framer-motion";
import { CheckCircle2, Flame, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

const LESSONS = [
  {
    id: 1,
    title: "Welcome to Artificial Intelligence",
    type: "Live recording + demo game",
    description:
      "Icebreaker, defining AI, real-world examples kids use daily.",
    duration: "15 min",
    xpReward: 100,
    color: "indigo" as const,
    hasGame: true,
  },
  {
    id: 2,
    title: "History of AI — From Dreams to Machines",
    type: "Self-Paced + Game",
    description: "Timeline from ancient myths to ChatGPT. Key AI milestones.",
    duration: "35 min",
    xpReward: 300,
    color: "purple" as const,
    hasGame: true,
  },
  {
    id: 3,
    title: "AI vs Humans: What Can AI Do?",
    type: "Self-Paced + Game",
    description: "Strengths and limits of AI vs human intelligence.",
    duration: "35 min",
    xpReward: 300,
    color: "cyan" as const,
    hasGame: true,
  },
  {
    id: 4,
    title: "Types of AI: Narrow, General & Super",
    type: "Self-Paced + Game",
    description:
      "Different levels of AI with fun examples. Where are we today?",
    duration: "35 min",
    xpReward: 300,
    color: "amber" as const,
    hasGame: true,
  },
] as const;

const TOP_BAR: Record<(typeof LESSONS)[number]["color"], string> = {
  indigo: "linear-gradient(90deg, #6366F1, #06B6D4)",
  purple: "linear-gradient(90deg, #8B5CF6, #EC4899)",
  cyan: "linear-gradient(90deg, #06B6D4, #10B981)",
  amber: "linear-gradient(90deg, #F59E0B, #EF4444)",
};

const DAILY_TIPS = [
  "AI systems learn from millions of examples — just like you learn from practice!",
  "The word 'robot' comes from a Czech word meaning 'forced labor'",
  "There are more possible chess moves than atoms in the observable universe",
  "The first computer bug was an actual bug — a moth found in a computer in 1947",
  "Alan Turing, the father of AI, was also a marathon runner",
  "Netflix saves $1 billion per year using AI recommendations",
];

const FLOATING_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: `${8 + i * 12}%`,
  delay: `${(i % 4) * 0.8}s`,
  duration: `${6 + (i % 3) * 2}s`,
  size: `${6 + (i % 3) * 4}px`,
  color:
    i % 3 === 0 ? "rgba(6,182,212,0.3)" : i % 3 === 1 ? "rgba(99,102,241,0.3)" : "rgba(168,85,247,0.3)",
}));

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )demo_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isUnlocked(lessonId: number, lessonsComplete: number[]): boolean {
  if (lessonId === 1) return true;
  return lessonsComplete.includes(lessonId - 1);
}

function streakFromStart(lessonsComplete: number[]): number {
  let s = 0;
  for (let i = 1; i <= 4; i++) {
    if (lessonsComplete.includes(i)) s++;
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

function DemoDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [bottomActive, setBottomActive] = useState<"home" | "lessons" | "xp">(
    "home"
  );

  const load = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/demo/user?token=${encodeURIComponent(t)}`);
      if (!res.ok) {
        setUser(null);
        return;
      }
      setUser(await res.json());
    } catch {
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
    const t = tokenFromUrl ?? readCookieToken() ?? sessionToken;
    setToken(t);
    if (!t) {
      setLoading(false);
      setUser(null);
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
        setBottomActive("lessons");
      });
    }
  }, [loading, user]);

  const lessonsDone = user?.lessonsComplete.length ?? 0;
  const xp = user?.xp ?? 0;
  const userName = user?.name || "";
  const progressPct = Math.min(100, (lessonsDone / 4) * 100);
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const xpBarPct = Math.min(100, (xp / 1000) * 100);
  const streak = user ? streakFromStart(user.lessonsComplete) : 0;
  const adminMode = isAdminTester(user);
  const tipIndex = new Date().getDate() % DAILY_TIPS.length;
  const tip = DAILY_TIPS[tipIndex] ?? DAILY_TIPS[0];

  const nextLessonId = user
    ? LESSONS.find(
        (l) =>
          !user.lessonsComplete.includes(l.id) &&
          (adminMode || isUnlocked(l.id, user.lessonsComplete))
      )?.id
    : undefined;

  return (
    <div className="min-h-screen overflow-x-hidden pb-24 md:pb-0">
      <div className="pointer-events-none fixed inset-0 z-0">
        {FLOATING_PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.left,
              bottom: "-20px",
              width: p.size,
              height: p.size,
              background: p.color,
              filter: "blur(0.5px)",
              animation: `particle-rise ${p.duration} ease-in-out ${p.delay} infinite`,
            }}
          />
        ))}
      </div>

      <header
        className="sticky top-0 z-20 border-b px-3 sm:px-6"
        style={{
          background: "rgba(6,8,20,0.9)",
          borderColor: "rgba(99,102,241,0.15)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white"
              style={{ background: "linear-gradient(135deg, #6366F1, #06B6D4)" }}
            >
              AK
            </div>
            <span className="text-sm font-bold text-[#F0F4FF] sm:text-base">
              MIND Demo
            </span>
          </div>
          <div className="hidden min-w-0 flex-1 flex-col items-center justify-center px-2 sm:flex">
            <p className="text-center text-xs text-[#64748B]">
              {lessonsDone} of 4 lessons complete
            </p>
            <div className="mx-auto mt-1 h-[6px] w-full max-w-[12rem] rounded-[3px] bg-white/10 sm:w-48">
              <div
                className="h-[6px] rounded-[3px]"
                style={{
                  width: `${progressPct}%`,
                  background:
                    "linear-gradient(90deg, #6366F1, #06B6D4, #6366F1)",
                  backgroundSize: "200% auto",
                  animation: "shimmer 2.6s linear infinite",
                }}
              />
            </div>
          </div>
          <div
            className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold sm:px-3 sm:text-sm"
            style={{
              background: "rgba(245,158,11,0.15)",
              borderColor: "rgba(245,158,11,0.3)",
              color: "#FCD34D",
              boxShadow: "0 0 12px rgba(245,158,11,0.2)",
            }}
          >
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            {xp} XP
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[820px] px-4 py-6 pb-20 sm:px-6 sm:py-8 md:pb-8">
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-8 w-2/3 rounded-lg bg-indigo-300/20" />
            <div className="h-4 w-full max-w-md rounded bg-indigo-300/20" />
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="h-24 rounded-2xl bg-indigo-300/20" />
              <div className="h-24 rounded-2xl bg-indigo-300/20" />
              <div className="h-24 rounded-2xl bg-indigo-300/20" />
            </div>
            <div className="h-40 rounded-2xl bg-indigo-300/20" />
            <div className="h-40 rounded-2xl bg-indigo-300/20" />
          </div>
        )}

        {!loading && user && token && (
          <>
            <section
              className="relative overflow-hidden rounded-[24px] border px-5 py-5 md:px-8 md:py-9 lg:px-11 lg:py-10"
              style={{
                background:
                  "linear-gradient(135deg, rgba(30,20,80,0.85) 0%, rgba(20,30,80,0.8) 40%, rgba(15,35,70,0.85) 100%)",
                borderColor: "rgba(99,102,241,0.25)",
                backdropFilter: "blur(20px)",
                animation: "border-cycle 6s ease-in-out infinite",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #06B6D4, transparent)",
                  animation: "scan-line 5s ease-in-out infinite",
                }}
              />
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-[200px] w-[200px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)",
                }}
              />
              <div
                className="pointer-events-none absolute -bottom-10 -left-10 h-[140px] w-[140px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(99,102,241,0.1) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="relative z-[1] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="max-w-full md:max-w-[85%]">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-cyan-400">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                      style={{ animation: "glow-pulse 1.8s ease-in-out infinite" }}
                    />
                    Welcome back!
                  </p>
                  <h1
                    className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[34px] lg:text-[40px]"
                    style={{
                      background:
                        "linear-gradient(135deg, #FFFFFF, #C7D2FE 50%, #67E8F9)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {user.childName}&apos;s Learning Journey
                  </h1>
                  <p className="mt-1 text-[13px] text-slate-500">
                    AI Explorers Program · Demo
                  </p>

                  <div className="mt-4 h-2 w-full max-w-md rounded bg-white/10">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${xpBarPct}%`,
                        background: "linear-gradient(90deg, #6366F1, #06B6D4)",
                        boxShadow: "var(--glow-indigo)",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {xp} XP · Level {level}
                  </p>
                </div>

                <div className="pointer-events-none hidden min-[380px]:block">
                  <div
                    style={{ filter: "drop-shadow(0 0 16px rgba(99,102,241,0.5))" }}
                  >
                    <NOVACharacter size="md" emotion="happy" animate />
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                {
                  icon: <Zap className="h-5 w-5 text-indigo-300" />,
                  value: user.xp,
                  label: "Points Earned",
                  iconBg: "rgba(99,102,241,0.2)",
                  accent: "linear-gradient(90deg, transparent, #6366F1, transparent)",
                  delay: 0,
                },
                {
                  icon: <Flame className="h-5 w-5 text-amber-300" />,
                  value: streak,
                  label: "Lesson Streak",
                  iconBg: "rgba(245,158,11,0.2)",
                  accent: "linear-gradient(90deg, transparent, #F59E0B, transparent)",
                  delay: 0.1,
                },
                {
                  icon: <CheckCircle2 className="h-5 w-5 text-emerald-300" />,
                  value: `${lessonsDone}/4`,
                  label: "Lessons Done",
                  iconBg: "rgba(16,185,129,0.2)",
                  accent: "linear-gradient(90deg, transparent, #10B981, transparent)",
                  delay: 0.2,
                },
              ].map((card) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: card.delay }}
                  className="group relative overflow-hidden rounded-[18px] border p-[14px] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] sm:p-5"
                  style={{
                    background: "rgba(15,20,50,0.7)",
                    borderColor: "rgba(99,102,241,0.12)",
                    backdropFilter: "blur(16px)",
                    animation: "slide-up 0.4s ease both",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-[10px]"
                    style={{ background: card.iconBg }}
                  >
                    {card.icon}
                  </div>
                  <p
                    className="mt-2 text-[24px] font-extrabold tracking-tight text-white sm:text-[30px]"
                    style={{ animation: "count-up 0.5s ease both" }}
                  >
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                    {card.label}
                  </p>
                  <div
                    className="absolute bottom-0 left-0 h-[2px] w-full"
                    style={{ background: card.accent }}
                  />
                </motion.div>
              ))}
            </div>

            <section className="mt-8" id="demo-lessons">
              <h2 className="mb-4 border-l-[3px] border-cyan-400 pl-3 text-lg font-bold text-white">
                Your Learning Path
              </h2>
              <div className="flex flex-col gap-4">
                {LESSONS.map((lesson) => {
                  const done = user.lessonsComplete.includes(lesson.id);
                  const unlocked =
                    adminMode || isUnlocked(lesson.id, user.lessonsComplete);
                  const active = unlocked && !done && lesson.id === nextLessonId;
                  const quizScore = user.quizScores[String(lesson.id)];

                  return (
                    <div
                      key={lesson.id}
                      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                        unlocked
                          ? "cursor-pointer hover:-translate-y-0.5"
                          : "cursor-not-allowed opacity-75"
                      }`}
                      style={{
                        background: "rgba(15,20,50,0.7)",
                        borderColor: "rgba(99,102,241,0.12)",
                        backdropFilter: "blur(16px)",
                        boxShadow: unlocked
                          ? "0 8px 24px rgba(0,0,0,0.18)"
                          : "none",
                      }}
                    >
                      <div
                        className="h-[3px] w-full"
                        style={{ background: TOP_BAR[lesson.color] }}
                      />
                      <div className="flex flex-row gap-4 p-5">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            done
                              ? "bg-green-600 text-white"
                              : active
                                ? "text-white"
                                : "bg-slate-900 text-slate-500"
                          }`}
                          style={
                            active
                              ? {
                                  background:
                                    "linear-gradient(135deg, #6366F1, #4F46E5)",
                                  boxShadow: "var(--glow-indigo)",
                                }
                              : undefined
                          }
                        >
                          {done ? "✓" : unlocked ? lesson.id : "🔒"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              done
                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                : active
                                  ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                                  : "border-slate-700 bg-slate-900 text-slate-500"
                            }`}
                          >
                            {done ? "Completed" : active ? "In Progress" : "Locked"}
                          </span>
                          <p className="mt-1 text-[15px] font-bold leading-snug text-slate-200">
                            {lesson.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500">
                            {lesson.description}
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <span className="w-fit rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400">
                              ⏱ {lesson.duration}
                            </span>
                            {lesson.hasGame ? (
                              <span className="w-fit rounded-full border border-violet-400/25 bg-violet-500/15 px-2 py-1 text-xs text-violet-300">
                                🎮 Includes Game
                              </span>
                            ) : null}
                            {done && quizScore != null ? (
                              <span className="w-fit rounded-full border border-emerald-400/25 bg-emerald-500/12 px-2 py-1 text-xs text-emerald-300">
                                Quiz: {quizScore}%
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
                          <span className="rounded-lg border border-amber-400/25 bg-amber-500/12 px-2 py-1 text-xs font-bold text-amber-300">
                            +{lesson.xpReward} XP
                          </span>
                          {!unlocked ? (
                            <span className="text-sm text-slate-600">Locked</span>
                          ) : done ? (
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/demo/lesson/${lesson.id}?token=${encodeURIComponent(token)}`
                                )
                              }
                              className="text-sm font-semibold text-cyan-400 hover:underline"
                            >
                              Review →
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/demo/lesson/${lesson.id}?token=${encodeURIComponent(token)}`
                                )
                              }
                              className="w-full min-w-[7rem] rounded-[10px] px-4 py-2 text-center text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
                              style={{
                                background:
                                  "linear-gradient(135deg, #6366F1, #4F46E5)",
                                boxShadow: "var(--glow-indigo)",
                              }}
                            >
                              {active ? "Continue →" : "Start →"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="mb-3 text-[15px] font-bold tracking-wide text-slate-200">
                Your Progress
              </h2>
              <div
                className="rounded-2xl border p-4 sm:p-6"
                style={{
                  background: "rgba(15,20,50,0.6)",
                  borderColor: "rgba(99,102,241,0.12)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-start justify-between gap-1">
                  {LESSONS.map((lesson, idx) => {
                    const done = user.lessonsComplete.includes(lesson.id);
                    const current = lesson.id === nextLessonId;
                    return (
                      <div key={lesson.id} className="flex flex-1 flex-col items-center">
                        <div className="flex w-full items-center">
                          {idx > 0 ? (
                            <div
                              className="h-0.5 flex-1 rounded"
                              style={{
                                background: user.lessonsComplete.includes(
                                  LESSONS[idx - 1]!.id
                                )
                                  ? "linear-gradient(90deg, #6366F1, #06B6D4)"
                                  : "rgba(99,102,241,0.15)",
                              }}
                            />
                          ) : (
                            <div className="flex-1" />
                          )}
                          <div
                            className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 ${
                              done ? "text-white" : current ? "text-indigo-300" : "text-slate-600"
                            }`}
                            style={
                              done
                                ? {
                                    background:
                                      "linear-gradient(135deg, #6366F1, #06B6D4)",
                                    boxShadow: "var(--glow-indigo)",
                                  }
                                : current
                                  ? {
                                      border: "2px solid #6366F1",
                                      background: "transparent",
                                    }
                                  : {
                                      border: "2px solid rgba(99,102,241,0.2)",
                                      background: "rgba(99,102,241,0.06)",
                                    }
                            }
                          >
                            {done ? (
                              "✓"
                            ) : current ? (
                              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                            ) : (
                              lesson.id
                            )}
                          </div>
                          {idx < LESSONS.length - 1 ? (
                            <div
                              className="h-0.5 flex-1 rounded"
                              style={{
                                background: done
                                  ? "linear-gradient(90deg, #6366F1, #06B6D4)"
                                  : "rgba(99,102,241,0.15)",
                              }}
                            />
                          ) : (
                            <div className="flex-1" />
                          )}
                        </div>
                        <p className="mt-2 line-clamp-1 w-full max-w-[5.5rem] text-center text-[11px] text-slate-500 sm:max-w-none">
                          {lesson.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <div
              className="mt-8 flex gap-3 rounded-[14px] border px-5 py-4"
              style={{
                background: "rgba(15,20,50,0.5)",
                borderColor: "rgba(99,102,241,0.12)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                className="grid h-9 w-9 place-items-center rounded-full"
                style={{ boxShadow: "0 0 12px rgba(245,158,11,0.3)" }}
              >
                <span className="text-xl text-amber-500">💡</span>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-500">Did you know?</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{tip}</p>
              </div>
            </div>

            <p className="mt-10 text-center text-xs text-slate-700">
              Full AI Explorers program — 60 lessons available from August 2026
            </p>
          </>
        )}

        {!loading && (!user || !token) && (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-full max-w-sm rounded-2xl border p-8 text-center"
              style={{
                background: "rgba(15,20,50,0.72)",
                borderColor: "rgba(99,102,241,0.15)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div className="text-5xl">🔑</div>
              <h2 className="mt-4 text-xl font-bold text-white">Session Expired</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Your demo session has expired. Please use your original demo link
                from your email to continue.
              </p>
              <a
                href={process.env.NEXT_PUBLIC_LANDING_URL ?? "https://www.akmind.com"}
                className="mt-6 block rounded-xl px-6 py-3 text-sm font-bold text-white no-underline"
                style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}
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

      {!loading && user && token ? (
        <>
          <nav
            className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t md:hidden"
            style={{
              background: "rgba(6,8,20,0.95)",
              borderColor: "rgba(99,102,241,0.15)",
              backdropFilter: "blur(20px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setBottomActive("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
                bottomActive === "home" ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              <span className="text-lg leading-none">🏠</span>
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBottomActive("lessons");
                document
                  .getElementById("demo-lessons")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
                bottomActive === "lessons" ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              <span className="text-lg leading-none">📚</span>
              <span>Lessons</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBottomActive("xp");
                setXpModalOpen(true);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
                bottomActive === "xp" ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              <span className="text-lg leading-none">⚡</span>
              <span>XP</span>
            </button>
          </nav>

          {xpModalOpen ? (
            <div
              className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center"
              onClick={() => setXpModalOpen(false)}
              role="presentation"
            >
              <div
                className="w-full max-w-sm rounded-2xl border p-6"
                style={{
                  background: "rgba(15,20,50,0.92)",
                  borderColor: "rgba(99,102,241,0.2)",
                  backdropFilter: "blur(20px)",
                }}
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <h3 className="text-lg font-bold text-white">Your XP</h3>
                <p className="mt-2 text-3xl font-black text-cyan-300">{user.xp} XP</p>
                <p className="mt-1 text-sm text-slate-400">Level {level}</p>
                <p className="mt-4 text-sm text-slate-400">
                  Complete lessons and quizzes to earn more XP. Reach the next
                  level at {level * 1000} total XP.
                </p>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl py-3 font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}
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
        <NOVAChat
          userName={userName}
          childName={user?.childName}
          userKey={user?.email || userName || undefined}
          xp={xp}
          lessonsComplete={user?.lessonsComplete ?? []}
          quizScores={user?.quizScores}
          badgeEarned={user?.badgeEarned}
          currentModule={1}
          lessonOrder={nextLessonId ?? 1}
          currentLesson="Demo Dashboard"
        />
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
