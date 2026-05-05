"use client";

import VideoPlayer from "@/components/lesson/VideoPlayer";
import NOVAChat from "@/components/NOVAChat";
import type { DemoUser } from "@/types/demo";
import { DEMO_BADGES } from "@/lib/demo-badges";
import { normalizeClientDemoToken } from "@/lib/demo-token-client";
import dynamic from "next/dynamic";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type QuizItem = {
  q: string;
  options: string[];
  correct: number;
};

type LessonContent = {
  title: string;
  type: "live" | "self-paced";
  videoUrl: string;
  /** Approximate length shown in UI (e.g. video runtime). */
  durationLabel: string;
  xpReward: number;
  description: string;
  /** Three short takeaways shown under the lesson title. */
  summaryBullets: readonly [string, string, string];
  hasGame: boolean;
  quiz: QuizItem[];
};

/** Lessons 1–3: minimum seconds of actual video playback before upsell + continue unlocks (non-admin). */
const MIN_LESSON_VIDEO_PLAY_SECONDS = 120;

const LESSONS: Record<number, LessonContent> = {
  1: {
    title: "History of AI — From Dreams to Machines",
    type: "self-paced",
    videoUrl: "https://www.youtube.com/embed/JMUxmLyrhSk",
    durationLabel: "6+ min",
    xpReward: 300,
    description:
      "Timeline from ancient myths to ChatGPT. Key AI milestones.",
    summaryBullets: [
      "Stories and early dreams of intelligent machines long before computers existed.",
      "Landmarks from Turing and early AI winters to Deep Blue, AlphaGo, and ChatGPT-era models.",
      "How today’s assistants fit into the bigger picture—not magic, but decades of ideas and engineering.",
    ],
    hasGame: true,
    quiz: [
      {
        q: "Who is called the father of AI?",
        options: [
          "Albert Einstein",
          "Alan Turing",
          "Elon Musk",
          "Bill Gates",
        ],
        correct: 1,
      },
      {
        q: "When did Deep Blue beat chess champion Kasparov?",
        options: ["1985", "1997", "2005", "2012"],
        correct: 1,
      },
      {
        q: "What did AlphaGo achieve in 2016?",
        options: [
          "Beat humans at chess",
          "Beat humans at Go",
          "Passed a driving test",
          "Won a spelling bee",
        ],
        correct: 1,
      },
      {
        q: "ChatGPT was released in...",
        options: ["2019", "2020", "2021", "2022"],
        correct: 3,
      },
      {
        q: "The Turing Test measures...",
        options: [
          "How fast AI processes data",
          "Whether AI can fool humans into thinking it is human",
          "How much data AI needs",
          "AI battery life",
        ],
        correct: 1,
      },
    ],
  },
  2: {
    title: "AI vs Humans: What Can AI Do?",
    type: "self-paced",
    videoUrl: "https://www.youtube.com/embed/rcd7Ov9b5QM",
    durationLabel: "6+ min",
    xpReward: 300,
    description: "Strengths and limits of AI vs human intelligence.",
    summaryBullets: [
      "AI shines at speed, scale, and finding patterns in huge amounts of data.",
      "Humans still lead on empathy, ethics, common sense in new situations, and true creativity.",
      "The sweet spot is often collaboration—AI plus human judgment beats either alone.",
    ],
    hasGame: true,
    quiz: [
      {
        q: "What is AI better at than humans?",
        options: [
          "Creative writing",
          "Feeling empathy",
          "Processing millions of data points fast",
          "Understanding context",
        ],
        correct: 2,
      },
      {
        q: "What can humans do that AI cannot?",
        options: [
          "Play chess",
          "Recognize faces",
          "Truly feel emotions and empathy",
          "Drive cars",
        ],
        correct: 2,
      },
      {
        q: "AI making wrong decisions due to bad training data is called...",
        options: ["AI error", "AI bias", "AI confusion", "AI lag"],
        correct: 1,
      },
      {
        q: "Which task is AI NOT good at?",
        options: [
          "Detecting spam emails",
          "Recommending movies",
          "Understanding sarcasm perfectly",
          "Translating languages",
        ],
        correct: 2,
      },
      {
        q: "AI and humans working together is called...",
        options: [
          "AI replacement",
          "Human-AI collaboration",
          "Machine takeover",
          "Data fusion",
        ],
        correct: 1,
      },
    ],
  },
  3: {
    title: "Types of AI: Narrow, General & Super",
    type: "self-paced",
    videoUrl: "https://www.youtube.com/embed/aWKNGWdAMGA",
    durationLabel: "6+ min",
    xpReward: 300,
    description:
      "Different levels of AI. Where are we today vs science fiction?",
    summaryBullets: [
      "Narrow AI: specialized systems we use daily—voice assistants, recommendations, filters.",
      "Artificial general intelligence (AGI): flexible, human-level AI—still a research goal, not a product.",
      "Superintelligent AI lives in sci-fi for now; understanding types helps us discuss safety and the future responsibly.",
    ],
    hasGame: true,
    quiz: [
      {
        q: "Siri and Google Assistant are examples of...",
        options: ["General AI", "Super AI", "Narrow AI", "Human AI"],
        correct: 2,
      },
      {
        q: "Which type of AI does NOT exist yet?",
        options: ["Narrow AI", "General AI", "Chess AI", "Spam filters"],
        correct: 1,
      },
      {
        q: "Artificial General Intelligence (AGI) means...",
        options: [
          "AI that can only play games",
          "AI that can do any intellectual task a human can",
          "AI that controls robots only",
          "AI that writes code only",
        ],
        correct: 1,
      },
      {
        q: "Most AI we use today is...",
        options: ["Super AI", "General AI", "Narrow AI", "Emotional AI"],
        correct: 2,
      },
      {
        q: "Super AI would be...",
        options: [
          "Slightly smarter than humans",
          "Equal to humans",
          "Smarter than all humans combined",
          "Only good at math",
        ],
        correct: 2,
      },
    ],
  },
};

const GAME_MECHANICS: Record<number, string> = {
  1: "Neuropolis Level 2 — The Vault: timelines, ciphers, and the Glitch Twin.",
  2: "Neuropolis Level 3 — The Divide: switch modes and cross Human vs AI zones.",
  3: "Neuropolis Level 4 — classify Narrow, General, and Super AI in the wild.",
};

const GAME_BONUS_XP = 200;

const NeuropolisShell = dynamic(
  () => import("@/components/games/neuropolis/NeuropolisShell"),
  { ssr: false }
);
const LandscapeWrapper = dynamic(
  () => import("@/components/games/shared/LandscapeWrapper"),
  { ssr: false }
);

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = /(?:^|; )demo_token=([^;]*)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

function getToken(tokenFromUrl: string | null): string | null {
  const raw =
    (tokenFromUrl && tokenFromUrl.trim()) ||
    (typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("demo_token")
      : null) ||
    readCookieToken();
  if (!raw?.trim()) return null;
  return normalizeClientDemoToken(raw);
}

function lessonUnlocked(lessonId: number, lessonsComplete: number[]): boolean {
  if (lessonId === 1) return true;
  return lessonsComplete.includes(lessonId - 1);
}

function isAdminTester(user: DemoUser | null): boolean {
  if (!user) return false;
  return (
    user.email?.toLowerCase() === "admin@akmind.com" || user.name === "Admin"
  );
}

function quizXpFromAccuracy(
  xpReward: number,
  correct: number,
  total: number
): number {
  if (total === 0) return 0;
  const ratio = correct / total;
  if (ratio === 1) return xpReward;
  if (ratio >= 0.8) return Math.round(xpReward * 0.9);
  if (ratio >= 0.6) return Math.round(xpReward * 0.7);
  return Math.round(xpReward * 0.5);
}

function LessonPageInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const rawId = params?.id;
  const lessonId = useMemo(() => {
    const s = Array.isArray(rawId) ? rawId[0] : rawId;
    const n = typeof s === "string" ? parseInt(s, 10) : NaN;
    return Number.isFinite(n) ? n : NaN;
  }, [rawId]);

  const lesson = Number.isFinite(lessonId) ? LESSONS[lessonId] : undefined;

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [phase, setPhase] = useState<"video" | "game" | "quiz">("video");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScoreCorrect, setQuizScoreCorrect] = useState(0);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [videoWatchSatisfied, setVideoWatchSatisfied] = useState(false);
  const [pauseVideo, setPauseVideo] = useState(false);
  const [showXPOverlay, setShowXPOverlay] = useState(false);
  const [showXPOverlayContinue, setShowXPOverlayContinue] = useState(false);
  const [xpOverlayPayload, setXpOverlayPayload] = useState<{
    xpEarned: number;
    totalXpAfter: number;
    newBadges: string[];
  } | null>(null);
  const [xpCounterDisplay, setXpCounterDisplay] = useState(0);
  const progressPosted = useRef(false);
  const resultsInitialized = useRef(false);
  const xpOverlayTimerRef = useRef<ReturnType<
    typeof globalThis.setTimeout
  > | null>(null);

  const launchGame = () => {
    setGameActive(true);
    try {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } catch {
      /* silent */
    }
  };

  const exitGame = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* silent */
    }
    setGameActive(false);
  };

  const loadUser = useCallback(async (t: string) => {
    setUserLoading(true);
    try {
      const res = await fetch(`/api/demo/user?token=${encodeURIComponent(t)}`);
      if (!res.ok) {
        setUser(null);
        setLoadError(true);
        return;
      }
      setLoadError(false);
      const data = (await res.json()) as DemoUser;
      setUser({ ...data, earnedBadges: data.earnedBadges ?? [] });
    } catch {
      setUser(null);
      setLoadError(true);
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = getToken(tokenFromUrl);
    setToken(t);
    if (t) void loadUser(t);
    else {
      setUser(null);
      setUserLoading(false);
      setLoadError(true);
    }
  }, [tokenFromUrl, loadUser]);

  useEffect(() => {
    if (!lesson?.hasGame && phase === "game") {
      setPhase("video");
    }
  }, [lesson?.hasGame, phase]);

  useEffect(() => {
    setVideoWatchSatisfied(false);
    setPauseVideo(false);
  }, [lessonId]);

  const stepMeta = useMemo(() => {
    if (!lesson) return [];
    if (lesson.hasGame) {
      return [
        { icon: "📹", label: "Video" },
        { icon: "🎮", label: "Game" },
        { icon: "📝", label: "Quiz" },
      ] as const;
    }
    return [
      { icon: "📹", label: "Video" },
      { icon: "📝", label: "Quiz" },
    ] as const;
  }, [lesson]);

  const activeStepIndex = useMemo(() => {
    if (!lesson) return 0;
    if (phase === "video") return 0;
    if (phase === "game") return 1;
    if (phase === "quiz") {
      return lesson.hasGame ? 2 : 1;
    }
    return 0;
  }, [phase, lesson]);

  const headerXp = user?.xp ?? 0;

  const goDashboard = () => {
    if (token) router.push(`/demo?token=${encodeURIComponent(token)}`);
    else router.push("/demo");
  };

  const postLessonProgress = useCallback(
    async (
      correctCount: number,
      total: number,
      lessonXpEarned: number,
      badgesBeforeSnapshot: string[]
    ): Promise<{
      ok: boolean;
      totalXpAfter?: number;
      newBadges?: string[];
    }> => {
      if (!token || !lesson || progressPosted.current) {
        return { ok: false };
      }
      progressPosted.current = true;
      const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      try {
        const res = await fetch("/api/demo/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            lessonId,
            quizScore: pct,
            xp: lessonXpEarned,
            badgesBefore: badgesBeforeSnapshot,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            xp?: number;
            lessonsComplete?: number[];
            quizScores?: Record<string, number>;
            badgeEarned?: boolean;
            demoCompleted?: boolean;
            earnedBadges?: string[];
            newBadges?: string[];
          };
          setUser((u) =>
            u
              ? {
                  ...u,
                  xp: data.xp ?? u.xp,
                  lessonsComplete: data.lessonsComplete ?? u.lessonsComplete,
                  quizScores: data.quizScores ?? u.quizScores,
                  badgeEarned: data.badgeEarned ?? u.badgeEarned,
                  demoCompleted: data.demoCompleted ?? u.demoCompleted,
                  earnedBadges: data.earnedBadges ?? u.earnedBadges,
                }
              : u
          );
          return {
            ok: true,
            totalXpAfter: data.xp,
            newBadges: data.newBadges ?? [],
          };
        }
        progressPosted.current = false;
        return { ok: false };
      } catch {
        progressPosted.current = false;
        return { ok: false };
      }
    },
    [token, lesson, lessonId]
  );

  const xpParticles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        left: `${(i * 41 + 7) % 88}%`,
        delayS: (i % 6) * 0.25,
        durationS: 2.5 + (i % 5) * 0.35,
        size: 3 + (i % 3),
      })),
    []
  );

  useEffect(() => {
    if (!showXPOverlay) return;
    setShowXPOverlayContinue(false);
    const t = window.setTimeout(() => setShowXPOverlayContinue(true), 2000);
    return () => window.clearTimeout(t);
  }, [showXPOverlay]);

  useEffect(() => {
    if (!showXPOverlay || !xpOverlayPayload) return;
    const xpEarned = Math.max(0, xpOverlayPayload.xpEarned);
    setXpCounterDisplay(0);
    if (xpEarned === 0) return;
    const inc = Math.max(1, Math.ceil(xpEarned / 60));
    const id = window.setInterval(() => {
      setXpCounterDisplay((c) => Math.min(xpEarned, c + inc));
    }, 25);
    const finish = window.setTimeout(() => {
      window.clearInterval(id);
      setXpCounterDisplay(xpEarned);
    }, 1500);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(finish);
    };
  }, [showXPOverlay, xpOverlayPayload]);

  useEffect(() => {
    if (!showQuizResults || !lesson || !token || !user) return;
    if (resultsInitialized.current) return;
    resultsInitialized.current = true;

    const total = lesson.quiz.length;
    let correct = 0;
    for (let i = 0; i < total; i++) {
      if (quizAnswers[i] === lesson.quiz[i].correct) correct += 1;
    }
    setQuizScoreCorrect(correct);

    const badgesBeforeSnapshot = [...(user.earnedBadges ?? [])];
    const xpBeforeSnapshot = user.xp ?? 0;

    const quizXp = quizXpFromAccuracy(lesson.xpReward, correct, total);
    const gameXp = lesson.hasGame && gameComplete ? GAME_BONUS_XP : 0;
    const totalXp = quizXp + gameXp;

    const started = Date.now();

    void postLessonProgress(correct, total, totalXp, badgesBeforeSnapshot)
      .then((r) => {
        if (r.ok && r.totalXpAfter !== undefined) {
          const xpEarned = Math.max(0, r.totalXpAfter - xpBeforeSnapshot);
          setXpOverlayPayload({
            xpEarned,
            totalXpAfter: r.totalXpAfter,
            newBadges: r.newBadges ?? [],
          });
          const elapsed = Date.now() - started;
          const delay = Math.max(0, 1500 - elapsed);
          if (xpOverlayTimerRef.current !== null) {
            window.clearTimeout(xpOverlayTimerRef.current);
          }
          xpOverlayTimerRef.current = globalThis.setTimeout(() => {
            xpOverlayTimerRef.current = null;
            setShowXPOverlay(true);
          }, delay);
        } else {
          progressPosted.current = false;
        }
      })
      .finally(() => setXpAwarded(true));

    return () => {
      if (xpOverlayTimerRef.current !== null) {
        window.clearTimeout(xpOverlayTimerRef.current);
        xpOverlayTimerRef.current = null;
      }
    };
    // Intentionally omit `user` from deps — updating user after POST must not re-run
    // this effect or the overlay timer is cleared before it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showQuizResults,
    lesson,
    token,
    quizAnswers,
    gameComplete,
    postLessonProgress,
  ]);

  useEffect(() => {
    resultsInitialized.current = false;
    progressPosted.current = false;
    setXpAwarded(false);
    setShowQuizResults(false);
    setQuizScoreCorrect(0);
    setCurrentQuestion(0);
    setPickedOption(null);
    setQuizAnswers({});
    setGameComplete(false);
    setGameActive(false);
    setPhase("video");
    setVideoWatchSatisfied(false);
    setShowXPOverlay(false);
    setShowXPOverlayContinue(false);
    setXpOverlayPayload(null);
    setXpCounterDisplay(0);
    if (xpOverlayTimerRef.current !== null) {
      window.clearTimeout(xpOverlayTimerRef.current);
      xpOverlayTimerRef.current = null;
    }
  }, [lessonId]);

  const advanceQuestion = () => {
    if (!lesson) return;
    if (currentQuestion >= lesson.quiz.length - 1) {
      setShowQuizResults(true);
      return;
    }
    setCurrentQuestion((q) => q + 1);
    setPickedOption(null);
  };

  const selectOption = (idx: number) => {
    if (pickedOption !== null || !lesson) return;
    setPickedOption(idx);
    setQuizAnswers((prev) => ({ ...prev, [currentQuestion]: idx }));
  };

  if (!Number.isFinite(lessonId) || !lesson) {
    return (
      <div className="min-h-screen p-8 text-center text-slate-300">
        <p className="font-semibold">Lesson not found.</p>
        <button
          type="button"
          className="mt-4 text-cyan-400 underline"
          onClick={goDashboard}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (loadError || !token) {
    return (
      <div className="min-h-screen p-8 text-center">
        <p className="font-semibold text-slate-300">Unable to load lesson.</p>
        <button
          type="button"
          className="mt-4 text-cyan-400 underline"
          onClick={() => router.push("/")}
        >
          Go home
        </button>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="min-h-screen animate-pulse">
        <div className="h-16 border-b border-indigo-300/20 bg-black/20" />
        <div className="mx-auto mt-8 h-48 max-w-4xl rounded-2xl bg-indigo-300/20" />
      </div>
    );
  }

  const adminMode = isAdminTester(user);
  const minVideoRequired = lessonId >= 1 && lessonId <= 3;
  const showPurchaseUpsell = minVideoRequired && videoWatchSatisfied;

  if (user && !lessonUnlocked(lessonId, user.lessonsComplete)) {
    if (!adminMode) {
      return (
        <div className="min-h-screen p-8 text-center">
          <p className="font-semibold text-slate-300">
            Complete the previous lesson first.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-indigo-600 px-6 py-2 font-semibold text-white"
            onClick={goDashboard}
          >
            Back to dashboard
          </button>
        </div>
      );
    }
  }

  // Hide lesson NOVA widget during fullscreen Neuropolis so it never steals taps
  // (including dialogue-advance and canvas input). Admins use Exit + dashboard for chat.
  const suppressNovaChatFab =
    (phase === "game" && gameActive) || showXPOverlay;

  const totalQs = lesson.quiz.length;
  const q = lesson.quiz[currentQuestion];
  const typeLabel = "Self-paced lesson video + game";

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header
        className="sticky top-0 z-20 border-b"
        style={{
          background: "rgba(6,8,20,0.9)",
          borderColor: "rgba(99,102,241,0.15)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            onClick={goDashboard}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold text-white sm:text-base">
            {lesson.title}
          </h1>
          <div
            className="shrink-0 rounded-full border px-2 py-1 text-xs font-bold sm:px-3 sm:text-sm"
            style={{
              background: "rgba(245,158,11,0.15)",
              borderColor: "rgba(245,158,11,0.3)",
              color: "#FCD34D",
            }}
          >
            ⚡ {headerXp} XP
          </div>
        </div>

        <div className="border-t border-indigo-300/10 px-3 py-3 sm:px-4">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 sm:gap-4">
            {stepMeta.map((step, i) => {
              const done = i < activeStepIndex;
              const current = i === activeStepIndex;
              return (
                <div key={step.label} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base sm:h-9 sm:w-9 ${
                      current
                        ? "text-indigo-300"
                        : done
                          ? "text-emerald-300"
                          : "text-slate-600"
                    }`}
                    style={
                      current
                        ? {
                            background: "rgba(99,102,241,0.2)",
                            border: "2px solid #6366F1",
                          }
                        : done
                          ? {
                              background: "rgba(16,185,129,0.2)",
                              border: "2px solid #10B981",
                            }
                          : {
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(99,102,241,0.15)",
                            }
                    }
                    title={step.label}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>
                  <span
                    className={`hidden text-xs font-semibold sm:inline sm:text-sm ${
                      current
                        ? "text-indigo-300"
                        : done
                          ? "text-emerald-300"
                          : "text-slate-600"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-7">
        {phase === "video" && (
          <div
            className="overflow-hidden rounded-[20px] border shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
            style={{
              background: "rgba(15,20,50,0.7)",
              borderColor: "rgba(99,102,241,0.15)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="relative w-full">
              <VideoPlayer
                lessonId={lessonId}
                enforceWatchThrough={minVideoRequired}
                minPlayedSeconds={
                  minVideoRequired ? MIN_LESSON_VIDEO_PLAY_SECONDS : undefined
                }
                playbackLocked={showPurchaseUpsell}
                pauseVideo={pauseVideo}
                onWatchSatisfied={() => {
                  setVideoWatchSatisfied(true);
                  setPauseVideo(true);
                }}
              />
              {showPurchaseUpsell ? (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto rounded-xl bg-black/75 p-4 backdrop-blur-md sm:p-6"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="demo-preview-upsell-title"
                >
                  <div className="my-auto w-full max-w-lg rounded-xl border border-amber-400/40 bg-[rgba(15,20,40,0.95)] px-5 py-5 shadow-[0_8px_32px_rgba(245,158,11,0.15)] sm:px-6 sm:py-6">
                    <p
                      id="demo-preview-upsell-title"
                      className="font-semibold text-amber-300"
                    >
                      You&apos;ve reached the 2-minute point
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Purchase the full program to continue your AI journey — or keep
                      going with this demo lesson.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href="https://www.akmind.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
                      >
                        Purchase full program
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          lesson.hasGame ? setPhase("game") : setPhase("quiz")
                        }
                        className="rounded-lg border border-indigo-500/50 px-5 py-2 text-sm text-indigo-300 transition hover:bg-indigo-500/10"
                      >
                        {lesson.hasGame
                          ? "Continue to Game →"
                          : "Continue to Quiz →"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-6 sm:p-7">
              <h2 className="text-[22px] font-bold tracking-tight text-white">{lesson.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{lesson.description}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300 marker:text-indigo-400">
                {lesson.summaryBullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <span className="w-fit rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
                  ~{lesson.durationLabel}
                </span>
                <span className="w-fit rounded-full bg-indigo-500/15 px-3 py-1 text-xs text-indigo-300">
                  {typeLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {phase === "game" && lesson.hasGame && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              overflow: "hidden",
              maxWidth: "100vw",
              maxHeight: "100vh",
            }}
          >
            {gameActive && lessonId >= 1 && lessonId <= 3 && (
              <LandscapeWrapper>
                <NeuropolisShell
                  level={lessonId as 1 | 2 | 3}
                  onComplete={async () => {
                    await exitGame();
                    setGameComplete(true);
                    setPhase("quiz");
                  }}
                  onExit={exitGame}
                />
              </LandscapeWrapper>
            )}

            {gameActive && (lessonId < 1 || lessonId > 3) && (
              <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 px-6 text-center text-white">
                <p className="text-4xl">🎮</p>
                <p className="mt-4 text-2xl font-bold">Game Coming Soon</p>
                <p className="mt-2 max-w-md text-slate-300">
                  {GAME_MECHANICS[lessonId]}
                </p>
                <button
                  type="button"
                  className="mt-8 rounded-xl bg-cyan-500 px-8 py-3 font-bold text-black"
                  onClick={() => {
                    setGameComplete(true);
                    setGameActive(false);
                  }}
                >
                  Complete Game
                </button>
              </div>
            )}

            {gameComplete && !gameActive && (
              <div
                className="mx-3 rounded-2xl border p-6 text-center sm:mx-0 sm:p-8"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  borderColor: "rgba(16,185,129,0.2)",
                }}
              >
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
                <p className="mt-3 text-lg font-semibold text-green-300">
                  Game complete! <span className="text-amber-300">+200 XP earned</span>
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-xl px-8 py-3 font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}
                  onClick={() => setPhase("quiz")}
                >
                  Continue to Quiz →
                </button>
              </div>
            )}

            {!gameComplete && !gameActive && (
              <div
                className="mx-3 rounded-[20px] border px-8 py-12 text-center sm:mx-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(15,10,40,0.95), rgba(10,20,50,0.95))",
                  borderColor: "rgba(99,102,241,0.2)",
                }}
              >
                <p className="text-6xl text-indigo-300/70">🎮</p>
                <h2 className="mt-4 text-[24px] font-bold tracking-tight text-white">
                  Story Game: {lesson.title}
                </h2>
                <p className="mt-2 text-sm text-slate-300 sm:text-base">
                  {GAME_MECHANICS[lessonId] ?? "Interactive story adventure."}
                </p>
                <p className="mt-4 text-xs text-slate-500">Tap to launch game</p>
                <button
                  type="button"
                  className="mt-6 w-full max-w-md rounded-xl px-8 py-4 text-lg font-bold text-white transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
                  style={{
                    background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                    boxShadow: "var(--glow-indigo)",
                  }}
                  onClick={launchGame}
                >
                  Launch Game →
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "quiz" && !showQuizResults && (
          <div
            className="mx-auto max-w-2xl rounded-[20px] border p-6 sm:p-7"
            style={{
              background: "rgba(15,20,50,0.7)",
              borderColor: "rgba(99,102,241,0.15)",
              backdropFilter: "blur(16px)",
            }}
          >
            <h2 className="text-[28px] font-bold tracking-tight text-white">Knowledge Check</h2>
            <p className="text-sm text-cyan-400">{lesson.title}</p>

            <div className="mt-4 flex items-center gap-1.5">
              {lesson.quiz.map((_, idx) => (
                <span
                  key={`dot-${idx}`}
                  className="h-2 w-2 rounded-full"
                  style={{
                    background:
                      idx < currentQuestion
                        ? "#10B981"
                        : idx === currentQuestion
                          ? "#6366F1"
                          : "rgba(99,102,241,0.2)",
                  }}
                />
              ))}
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Question {currentQuestion + 1} of {totalQs}
            </p>
            <p className="mb-6 mt-2 text-lg font-semibold text-slate-200">
              {q.q}
            </p>

            <div className="flex flex-col gap-3">
              {q.options.map((opt, idx) => {
                const show = pickedOption !== null;
                const isCorrect = idx === q.correct;
                const isPicked = pickedOption === idx;
                const cls =
                  "min-h-[56px] w-full rounded-xl border p-4 text-left text-sm transition duration-200 hover:-translate-y-0.5";
                let style: CSSProperties = {
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(99,102,241,0.15)",
                  color: "#CBD5E1",
                };
                if (show) {
                  if (isCorrect) {
                    style = {
                      background: "rgba(16,185,129,0.1)",
                      borderColor: "rgba(16,185,129,0.4)",
                      color: "#6EE7B7",
                      boxShadow: "0 0 12px rgba(16,185,129,0.2)",
                    };
                  } else if (isPicked) {
                    style = {
                      background: "rgba(239,68,68,0.08)",
                      borderColor: "rgba(239,68,68,0.3)",
                      color: "#FCA5A5",
                    };
                  } else {
                    style = {
                      background: "rgba(255,255,255,0.02)",
                      borderColor: "rgba(99,102,241,0.1)",
                      color: "#64748B",
                    };
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={pickedOption !== null}
                    className={cls}
                    style={style}
                    onClick={() => selectOption(idx)}
                  >
                    {opt}
                    {show && isCorrect ? (
                      <span className="mt-2 block text-sm font-bold text-green-400">
                        ✓ Correct!
                      </span>
                    ) : null}
                    {show && isPicked && !isCorrect ? (
                      <span className="mt-2 block text-sm font-bold text-green-400">
                        Correct: {q.options[q.correct]}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {pickedOption !== null && (
              <button
                type="button"
                className="mt-6 rounded-xl px-6 py-3 font-bold text-white transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                  boxShadow: "var(--glow-indigo)",
                }}
                onClick={advanceQuestion}
              >
                {currentQuestion >= totalQs - 1 ? "See results →" : "Next Question →"}
              </button>
            )}
          </div>
        )}

        {phase === "quiz" && showQuizResults && (
          <div
            className="mx-auto flex max-w-2xl flex-col items-center rounded-[20px] border p-8 text-center"
            style={{
              background: "rgba(15,20,50,0.8)",
              borderColor: "rgba(99,102,241,0.2)",
              backdropFilter: "blur(20px)",
            }}
          >
            <h2
              className="text-[34px] font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #FFFFFF, #67E8F9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Results
            </h2>
            <p className="mt-2 text-slate-400">
              Score: {quizScoreCorrect}/{totalQs}
            </p>
            <p className="mt-8 text-sm text-slate-500">
              {xpAwarded ? "Great work!" : "Saving progress…"}
            </p>
          </div>
        )}
      </main>

      {showXPOverlay && xpOverlayPayload && token ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4">
          <style>{`
            @keyframes lesson-xp-float {
              0% { transform: translateY(110vh); opacity: 0; }
              12% { opacity: 0.5; }
              100% { transform: translateY(-25vh); opacity: 0; }
            }
            @keyframes lesson-xp-pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes lesson-xp-badge-bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
          {xpParticles.map((p, i) => (
            <div
              key={`xp-p-${i}`}
              className="pointer-events-none absolute rounded-full bg-amber-400/35"
              style={{
                left: p.left,
                bottom: "-5%",
                width: p.size,
                height: p.size,
                animation: `lesson-xp-float ${p.durationS}s linear infinite`,
                animationDelay: `${p.delayS}s`,
              }}
              aria-hidden
            />
          ))}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0d1117]/95 p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.12)] backdrop-blur-md">
            <div
              className="text-[42px] font-black leading-tight text-transparent sm:text-[50px]"
              style={{
                background:
                  "linear-gradient(135deg, #FBBF24, #F59E0B, #EA580C)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                animation: "lesson-xp-pulse 1.2s ease-in-out infinite",
              }}
            >
              ⚡ +{xpCounterDisplay} XP
            </div>
            <p className="mt-4 text-lg font-semibold text-indigo-300">
              Total XP: {xpOverlayPayload.totalXpAfter}
            </p>
            {xpOverlayPayload.newBadges.length > 0 ? (
              <div className="mt-6 flex flex-col gap-3">
                {xpOverlayPayload.newBadges.map((slug, bi) => (
                  <p
                    key={slug}
                    className="text-base font-semibold text-amber-300"
                    style={{
                      animation:
                        "lesson-xp-badge-bounce 0.6s ease-out 1 both",
                      animationDelay: `${bi * 0.12}s`,
                    }}
                  >
                    🏅 Badge Unlocked:{" "}
                    {DEMO_BADGES.find((b) => b.slug === slug)?.name ?? slug}
                  </p>
                ))}
              </div>
            ) : null}
            {showXPOverlayContinue ? (
              <button
                type="button"
                className="mt-8 w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
                onClick={() => {
                  if (lessonId >= 3) {
                    router.push(
                      `/demo/complete?token=${encodeURIComponent(token)}`
                    );
                  } else {
                    router.push(`/demo?token=${encodeURIComponent(token)}`);
                  }
                }}
              >
                Continue →
              </button>
            ) : (
              <p className="mt-8 text-xs text-slate-500">Get ready…</p>
            )}
          </div>
        </div>
      ) : null}

      {!userLoading && user && token && !suppressNovaChatFab ? (
        <NOVAChat
          userName={user?.name || ""}
          childName={user?.childName}
          userKey={user?.email || user?.name || undefined}
          xp={user?.xp || 0}
          lessonsComplete={user?.lessonsComplete ?? []}
          quizScores={user?.quizScores}
          badgeEarned={user?.badgeEarned}
          currentModule={1}
          lessonOrder={lessonId}
          currentLesson={lesson?.title || ""}
        />
      ) : null}
    </div>
  );
}

export default function DemoLessonPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen animate-pulse">
          <div className="h-16 border-b border-indigo-300/20 bg-black/20" />
          <div className="mx-auto mt-8 h-48 max-w-4xl rounded-2xl bg-indigo-300/20" />
        </div>
      }
    >
      <LessonPageInner />
    </Suspense>
  );
}
