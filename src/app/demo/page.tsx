"use client";

import type { DemoUser } from "@/types/demo";
import AXCharacter from "@/components/games/shared/AXCharacter";
import { Award, Check, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

const LESSONS = [
  {
    id: 1,
    title: "Welcome to Artificial Intelligence",
    type: "🎥 Live Recording",
    description:
      "Icebreaker, defining AI, real-world examples kids use daily.",
    duration: "15 min",
    xpReward: 100,
    color: "indigo" as const,
    hasGame: false,
  },
  {
    id: 2,
    title: "History of AI — From Dreams to Machines",
    type: "📚 Self-Paced + 🎮 Game",
    description: "Timeline from ancient myths to ChatGPT. Key AI milestones.",
    duration: "35 min",
    xpReward: 300,
    color: "purple" as const,
    hasGame: true,
  },
  {
    id: 3,
    title: "AI vs Humans: What Can AI Do?",
    type: "📚 Self-Paced + 🎮 Game",
    description: "Strengths and limits of AI vs human intelligence.",
    duration: "35 min",
    xpReward: 300,
    color: "cyan" as const,
    hasGame: true,
  },
  {
    id: 4,
    title: "Types of AI: Narrow, General & Super",
    type: "📚 Self-Paced + 🎮 Game",
    description:
      "Different levels of AI with fun examples. Where are we today?",
    duration: "35 min",
    xpReward: 300,
    color: "amber" as const,
    hasGame: true,
  },
] as const;

const TOP_BAR: Record<
  (typeof LESSONS)[number]["color"],
  string
> = {
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
  amber: "bg-amber-500",
};

const DAILY_TIPS = [
  "AI systems learn from millions of examples — just like you learn from practice!",
  "The word 'robot' comes from a Czech word meaning 'forced labor'",
  "There are more possible chess moves than atoms in the observable universe",
  "The first computer bug was an actual bug — a moth found in a computer in 1947",
  "Alan Turing, the father of AI, was also a marathon runner",
  "Netflix saves $1 billion per year using AI recommendations",
];

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

function DemoDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [bottomActive, setBottomActive] = useState<"home" | "lessons" | "badge" | "xp">("home");

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
    const t = tokenFromUrl ?? readCookieToken();
    setToken(t);
    if (!t) {
      setLoading(false);
      setUser(null);
      return;
    }
    void load(t);
  }, [tokenFromUrl, load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash === "#demo-lessons") {
      requestAnimationFrame(() => {
        document.getElementById("demo-lessons")?.scrollIntoView({ behavior: "smooth" });
        setBottomActive("lessons");
      });
    }
  }, [loading, user]);

  const lessonsDone = user?.lessonsComplete.length ?? 0;
  const xp = user?.xp ?? 0;
  const progressPct = Math.min(100, (lessonsDone / 4) * 100);
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const xpBarPct = Math.min(100, (xp / 1000) * 100);
  const streak = user ? streakFromStart(user.lessonsComplete) : 0;
  const demoComplete =
    !!user && (user.demoCompleted || user.lessonsComplete.length >= 4);
  const tipIndex = new Date().getDate() % DAILY_TIPS.length;
  const tip = DAILY_TIPS[tipIndex] ?? DAILY_TIPS[0];

  const nextLessonId = user
    ? LESSONS.find((l) => !user.lessonsComplete.includes(l.id) && isUnlocked(l.id, user.lessonsComplete))?.id
    : undefined;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 pb-24 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-3 sm:px-6 md:px-6">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 sm:gap-3">
          <span className="shrink-0 text-sm font-bold text-indigo-600 sm:text-base">
            ⚡ AKMIND Demo
          </span>
          <div className="hidden min-w-0 flex-1 flex-col items-center justify-center px-2 sm:flex">
            <p className="text-center text-xs font-medium text-slate-600 max-[639px]:hidden">
              {lessonsDone} of 4 lessons complete
            </p>
            <div className="mx-auto mt-1 hidden h-2 w-full max-w-[12rem] rounded-full bg-slate-200 min-[640px]:block sm:w-48">
              <div
                className="h-2 rounded-full bg-indigo-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700 sm:px-3 sm:text-sm">
            ⚡ {xp} XP
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-6 sm:py-8 md:px-6">
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
            <div className="h-4 w-full max-w-md rounded bg-slate-200" />
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="h-24 rounded-2xl bg-slate-200" />
              <div className="h-24 rounded-2xl bg-slate-200" />
              <div className="h-24 rounded-2xl bg-slate-200" />
            </div>
            <div className="h-40 rounded-2xl bg-slate-200" />
            <div className="h-40 rounded-2xl bg-slate-200" />
          </div>
        )}

        {!loading && user && token && (
          <>
            <section className="relative min-h-[160px] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 shadow-lg md:p-8">
              <div className="pointer-events-none absolute -right-4 -top-4 h-[120px] w-[120px] rounded-full border border-white/10 bg-white/5" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-white/5" />
              <div className="pointer-events-none absolute bottom-10 left-1/3 h-16 w-16 rounded-full bg-white/5" />

              <div className="relative z-[1] max-w-[85%]">
                <p className="text-sm font-medium text-indigo-200">👋 Welcome back!</p>
                <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">
                  {user.childName}&apos;s Learning Journey
                </h1>
                <p className="mt-1 text-sm text-indigo-300">AI Explorers Program · Demo</p>

                <div className="mt-4 h-3 w-full max-w-md rounded-full bg-white/20">
                  <div
                    className="h-3 rounded-full bg-white transition-all"
                    style={{ width: `${xpBarPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-indigo-200">
                  {xp} XP · Level {level}
                </p>
              </div>

              <div className="pointer-events-none absolute bottom-0 right-4 hidden opacity-20 md:block">
                <AXCharacter animation="idle" facing="right" size={2} />
              </div>
            </section>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
              {[
                {
                  icon: <Zap className="h-5 w-5" />,
                  value: user.xp,
                  label: "Points Earned",
                  circle: "bg-indigo-100 text-indigo-600",
                  delay: 0,
                },
                {
                  icon: <Award className="h-5 w-5" />,
                  value: streak,
                  label: "Lesson streak",
                  circle: "bg-orange-100 text-orange-500",
                  delay: 0.1,
                },
                {
                  icon: <Check className="h-5 w-5" />,
                  value: `${lessonsDone}/4`,
                  label: "Lessons done",
                  circle: "bg-green-100 text-green-600",
                  delay: 0.2,
                },
              ].map((card) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: card.delay }}
                  className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full sm:h-[36px] sm:w-[36px] ${card.circle}`}
                  >
                    {card.icon}
                  </div>
                  <p className="mt-2 text-lg font-black text-slate-900 sm:text-2xl">{card.value}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{card.label}</p>
                </motion.div>
              ))}
            </div>

            <section className="mt-10" id="demo-lessons">
              <h2 className="mb-4 text-xl font-bold text-slate-900">Your Learning Path</h2>
              <div className="flex flex-col gap-4">
                {LESSONS.map((lesson) => {
                  const done = user.lessonsComplete.includes(lesson.id);
                  const unlocked = isUnlocked(lesson.id, user.lessonsComplete);
                  const active = unlocked && !done && lesson.id === nextLessonId;
                  const quizScore = user.quizScores[String(lesson.id)];

                  return (
                    <div
                      key={lesson.id}
                      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all ${
                        unlocked
                          ? "cursor-pointer hover:border-indigo-200 hover:shadow-md"
                          : "cursor-not-allowed opacity-75"
                      }`}
                    >
                      <div className={`h-1 w-full ${TOP_BAR[lesson.color]}`} />
                      <div className="flex flex-row gap-3 p-4 sm:p-5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-11 sm:w-11 ${
                            done
                              ? "bg-green-500 text-white"
                              : active
                                ? "animate-pulse bg-indigo-600 text-white"
                                : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {done ? "✓" : unlocked ? lesson.id : "🔒"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              done
                                ? "bg-green-50 text-green-700"
                                : active
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {done ? "✓ Completed" : active ? "▶ In Progress" : "🔒 Locked"}
                          </span>
                          <p className="mt-1 text-base font-bold text-slate-900">{lesson.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{lesson.description}</p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                              ⏱ {lesson.duration}
                            </span>
                            {lesson.hasGame ? (
                              <span className="w-fit rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                                🎮 Includes Game
                              </span>
                            ) : null}
                            {done && quizScore != null ? (
                              <span className="w-fit rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                                Quiz: {quizScore}%
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
                          <span className="rounded-lg bg-yellow-50 px-2 py-1 text-xs font-bold text-yellow-700">
                            +{lesson.xpReward} XP
                          </span>
                          {!unlocked ? (
                            <span className="text-sm text-slate-400">Locked</span>
                          ) : done ? (
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/demo/lesson/${lesson.id}?token=${encodeURIComponent(token)}`
                                )
                              }
                              className="text-sm font-semibold text-green-600"
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
                              className="w-full min-w-[7rem] rounded-xl bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white sm:w-auto sm:px-4"
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
              <h2 className="mb-3 text-lg font-bold text-slate-900">Your Progress</h2>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-1">
                  {LESSONS.map((lesson, idx) => {
                    const done = user.lessonsComplete.includes(lesson.id);
                    const current = lesson.id === nextLessonId;
                    return (
                      <div key={lesson.id} className="flex flex-1 flex-col items-center">
                        <div className="flex w-full items-center">
                          {idx > 0 ? (
                            <div
                              className={`h-0.5 flex-1 rounded ${user.lessonsComplete.includes(LESSONS[idx - 1]!.id) ? "bg-indigo-400" : "bg-slate-200"}`}
                            />
                          ) : (
                            <div className="flex-1" />
                          )}
                          <div
                            className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 ${
                              done
                                ? "bg-indigo-600 text-white"
                                : current
                                  ? "border-2 border-indigo-600 bg-white text-indigo-600 ring-2 ring-indigo-200"
                                  : "border-2 border-slate-200 bg-slate-50 text-slate-400"
                            }`}
                          >
                            {done ? "✓" : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" /> : lesson.id}
                          </div>
                          {idx < LESSONS.length - 1 ? (
                            <div
                              className={`h-0.5 flex-1 rounded ${done ? "bg-indigo-400" : "bg-slate-200"}`}
                            />
                          ) : (
                            <div className="flex-1" />
                          )}
                        </div>
                        <p className="mt-2 line-clamp-1 w-full max-w-[5.5rem] text-center text-[10px] text-slate-600 sm:max-w-none sm:text-xs">
                          {lesson.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="mt-8 flex gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-slate-50 to-indigo-50 p-4">
              <span className="text-2xl" aria-hidden>
                💡
              </span>
              <div>
                <p className="text-xs font-bold text-indigo-600">Did you know?</p>
                <p className="mt-1 text-sm text-slate-600">{tip}</p>
              </div>
            </div>

            <p className="mt-10 text-center text-sm text-slate-400">
              Full AI Explorers program — 60 lessons available from August 2026
            </p>
          </>
        )}

        {!loading && (!user || !token) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-800">Unable to load your demo session.</p>
            <p className="mt-2 text-sm text-slate-500">Return home and open your demo link again.</p>
          </div>
        )}
      </main>

      {!loading && user && token ? (
        <>
          <nav
            className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-slate-200 bg-white md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <button
              type="button"
              onClick={() => {
                setBottomActive("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${bottomActive === "home" ? "text-indigo-600" : "text-slate-400"}`}
            >
              <span className="text-lg leading-none">🏠</span>
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBottomActive("lessons");
                document.getElementById("demo-lessons")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${bottomActive === "lessons" ? "text-indigo-600" : "text-slate-400"}`}
            >
              <span className="text-lg leading-none">📚</span>
              <span>Lessons</span>
            </button>
            {demoComplete && token ? (
              <Link
                href={`/demo/complete?token=${encodeURIComponent(token)}`}
                onClick={() => setBottomActive("badge")}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${bottomActive === "badge" ? "text-indigo-600" : "text-slate-400"}`}
              >
                <span className="text-lg leading-none">🏅</span>
                <span>Badge</span>
              </Link>
            ) : (
              <span className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-slate-300">
                <span className="text-lg leading-none opacity-60">🏅</span>
                <span>Badge</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setBottomActive("xp");
                setXpModalOpen(true);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${bottomActive === "xp" ? "text-indigo-600" : "text-slate-400"}`}
            >
              <span className="text-lg leading-none">⚡</span>
              <span>XP</span>
            </button>
          </nav>

          {xpModalOpen ? (
            <div
              className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center"
              onClick={() => setXpModalOpen(false)}
              role="presentation"
            >
              <div
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <h3 className="text-lg font-bold text-slate-900">Your XP</h3>
                <p className="mt-2 text-3xl font-black text-indigo-600">{user.xp} XP</p>
                <p className="mt-1 text-sm text-slate-500">Level {level}</p>
                <p className="mt-4 text-sm text-slate-600">
                  Complete lessons and quizzes to earn more XP. Reach the next level at {(level) * 1000} total XP.
                </p>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white"
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
    </div>
  );
}

export default function DemoDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen overflow-x-hidden bg-slate-50">
          <div className="h-16 border-b border-slate-200 bg-white" />
          <div className="mx-auto max-w-3xl animate-pulse space-y-6 px-6 py-8">
            <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
            <div className="h-4 max-w-md rounded bg-slate-200" />
          </div>
        </div>
      }
    >
      <DemoDashboardInner />
    </Suspense>
  );
}
