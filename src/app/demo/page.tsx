"use client";

import type { DemoUser } from "@/types/demo";
import { Award, Check, Lock } from "lucide-react";
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
  },
  {
    id: 2,
    title: "History of AI — From Dreams to Machines",
    type: "📚 Self-Paced + 🎮 Game",
    description: "Timeline from ancient myths to ChatGPT. Key AI milestones.",
    duration: "35 min",
    xpReward: 300,
    color: "purple" as const,
  },
  {
    id: 3,
    title: "AI vs Humans: What Can AI Do?",
    type: "📚 Self-Paced + 🎮 Game",
    description: "Strengths and limits of AI vs human intelligence.",
    duration: "35 min",
    xpReward: 300,
    color: "cyan" as const,
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
  },
];

const COLOR_RING: Record<
  (typeof LESSONS)[number]["color"],
  { circle: string; hoverBorder: string }
> = {
  indigo: {
    circle: "bg-indigo-600 text-white",
    hoverBorder: "hover:border-indigo-300",
  },
  purple: {
    circle: "bg-purple-600 text-white",
    hoverBorder: "hover:border-purple-300",
  },
  cyan: {
    circle: "bg-cyan-600 text-white",
    hoverBorder: "hover:border-cyan-300",
  },
  amber: {
    circle: "bg-amber-500 text-white",
    hoverBorder: "hover:border-amber-300",
  },
};

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )demo_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isUnlocked(lessonId: number, lessonsComplete: number[]): boolean {
  if (lessonId === 1) return true;
  return lessonsComplete.includes(lessonId - 1);
}

function DemoDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  const lessonsDone = user?.lessonsComplete.length ?? 0;
  const xp = user?.xp ?? 0;
  const progressPct = Math.min(100, (lessonsDone / 4) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3">
          <span className="shrink-0 font-bold text-indigo-600">
            ⚡ AKMIND Demo
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2">
            <p className="text-center text-xs font-medium text-slate-600">
              {lessonsDone} of 4 lessons complete
            </p>
            <div className="mx-auto mt-1 h-2 w-full max-w-[12rem] rounded-full bg-slate-200 sm:w-48">
              <div
                className="h-2 rounded-full bg-indigo-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-700">
            ⚡ {xp} XP
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
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
            <section>
              <h1 className="text-2xl font-bold text-slate-900">
                Hey {user.childName}! 👋
              </h1>
              <p className="mt-1 text-slate-500">
                Your AI learning adventure starts here.
              </p>
            </section>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-slate-900">
                  ⚡ {user.xp} XP
                </p>
                <p className="mt-1 text-xs text-slate-500">Points Earned</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-slate-900">
                  {user.lessonsComplete.length}/4
                </p>
                <p className="mt-1 text-xs text-slate-500">Lessons Done</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-slate-900">
                  <Award className="h-7 w-7 text-amber-500" aria-hidden />
                  Demo Badge
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {user.badgeEarned ? "Earned!" : "Almost there"}
                </p>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="mb-4 text-xl font-bold text-slate-900">
                Your Learning Path
              </h2>
              <div className="flex flex-col gap-4">
                {LESSONS.map((lesson) => {
                  const done = user.lessonsComplete.includes(lesson.id);
                  const unlocked = isUnlocked(lesson.id, user.lessonsComplete);
                  const colors = COLOR_RING[lesson.color];

                  if (!unlocked) {
                    return (
                      <div
                        key={lesson.id}
                        className="flex cursor-not-allowed flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 opacity-60 shadow-sm sm:flex-row sm:items-center"
                      >
                        <div className="flex shrink-0 items-start gap-4 sm:items-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                            <Lock className="h-5 w-5" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-400">
                              {lesson.title}
                            </p>
                            <p className="text-xs text-slate-400">{lesson.type}</p>
                            <p className="mt-1 text-sm text-slate-400">
                              {lesson.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 justify-end text-slate-300 sm:pl-4">
                          <Lock className="h-6 w-6" aria-hidden />
                        </div>
                      </div>
                    );
                  }

                  if (done) {
                    return (
                      <div
                        key={lesson.id}
                        className="flex flex-col gap-4 rounded-2xl border border-green-200 bg-green-50/30 p-6 shadow-sm sm:flex-row sm:items-center"
                      >
                        <div className="flex shrink-0 items-start gap-4 sm:items-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white">
                            <Check className="h-6 w-6" strokeWidth={3} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-400">
                              {lesson.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {lesson.type}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {lesson.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 sm:pl-4">
                          <span className="font-semibold text-green-600">
                            ✓ Complete
                          </span>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                            +{lesson.xpReward} XP
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/demo/lesson/${lesson.id}?token=${encodeURIComponent(token)}`
                        )
                      }
                      className={`flex w-full cursor-pointer flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:shadow-md sm:flex-row sm:items-center ${colors.hoverBorder}`}
                    >
                      <div className="flex shrink-0 items-start gap-4 sm:items-center">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${colors.circle}`}
                        >
                          {lesson.id}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">
                            {lesson.title}
                          </p>
                          <p className="text-xs text-indigo-600">{lesson.type}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {lesson.description}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            {lesson.duration} · {lesson.xpReward} XP
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 sm:pl-4">
                        <span className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                          Start →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <p className="mt-12 text-center text-sm text-slate-400">
              Full AI Explorers program — 60 lessons available from August 2026
            </p>
          </>
        )}

        {!loading && (!user || !token) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-800">
              Unable to load your demo session.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Return home and open your demo link again.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DemoDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
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
