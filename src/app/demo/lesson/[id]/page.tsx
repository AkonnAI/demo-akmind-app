"use client";

import NOVAChat from "@/components/NOVAChat";
import type { DemoUser } from "@/types/demo";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowLeft, Check, CheckCircle2, PlayCircle } from "lucide-react";
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
  duration: number;
  xpReward: number;
  description: string;
  hasGame: boolean;
  quiz: QuizItem[];
};

const LESSONS: Record<number, LessonContent> = {
  1: {
    title: "Welcome to Artificial Intelligence",
    type: "live",
    videoUrl: "https://www.youtube.com/embed/ad79nYk2keg",
    duration: 900,
    xpReward: 100,
    description:
      "Icebreaker, defining AI, real-world examples kids use daily.",
    hasGame: false,
    quiz: [
      {
        q: "What does AI stand for?",
        options: [
          "Automated Internet",
          "Artificial Intelligence",
          "Advanced Interface",
          "Automated Information",
        ],
        correct: 1,
      },
      {
        q: "Which of these is an example of AI?",
        options: [
          "A calculator",
          "A light switch",
          "Voice assistant like Siri",
          "A fan",
        ],
        correct: 2,
      },
      {
        q: "AI systems learn from...",
        options: [
          "Magic",
          "Random guessing",
          "Data and examples",
          "Human emotions",
        ],
        correct: 2,
      },
    ],
  },
  2: {
    title: "History of AI — From Dreams to Machines",
    type: "self-paced",
    videoUrl: "https://www.youtube.com/embed/JMUxmLyrhSk",
    duration: 900,
    xpReward: 300,
    description:
      "Timeline from ancient myths to ChatGPT. Key AI milestones.",
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
  3: {
    title: "AI vs Humans: What Can AI Do?",
    type: "self-paced",
    videoUrl: "https://www.youtube.com/embed/rcd7Ov9b5QM",
    duration: 900,
    xpReward: 300,
    description: "Strengths and limits of AI vs human intelligence.",
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
  4: {
    title: "Types of AI: Narrow, General & Super",
    type: "self-paced",
    videoUrl: "https://www.youtube.com/embed/aWKNGWdAMGA",
    duration: 900,
    xpReward: 300,
    description:
      "Different levels of AI. Where are we today vs science fiction?",
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
  2: "Travel through AI history as AX. Restore erased milestones. Defeat the Time Corruptor.",
  3: "Switch between Human and AI modes. Cross The Divide. Unite two worlds.",
  4: "Identify Narrow, General and Super AI in the wild. Classify to survive.",
};

const GAME_BONUS_XP = 200;

const GameShell2 = dynamic(
  () => import("@/components/games/lesson2/GameShell2"),
  { ssr: false }
);
const GameShell3 = dynamic(
  () => import("@/components/games/lesson3/GameShell3"),
  { ssr: false }
);
const GameShell4 = dynamic(
  () => import("@/components/games/lesson4/GameShell4"),
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
  if (tokenFromUrl) return tokenFromUrl;
  if (typeof sessionStorage !== "undefined") {
    const sessionToken = sessionStorage.getItem("demo_token");
    if (sessionToken) return sessionToken;
  }
  return readCookieToken();
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
  const [phase, setPhase] = useState<"video" | "game" | "quiz" | "complete">(
    "video"
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScoreCorrect, setQuizScoreCorrect] = useState(0);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [resultsXp, setResultsXp] = useState(0);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const progressPosted = useRef(false);
  const resultsInitialized = useRef(false);

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
      setUser(await res.json());
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
    if (phase !== "complete" || !token) return;
    const t = setTimeout(() => {
      if (lessonId >= 4) {
        router.push(`/demo/complete?token=${encodeURIComponent(token)}`);
      } else {
        router.push(`/demo?token=${encodeURIComponent(token)}`);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [phase, token, router, lessonId]);

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
    if (phase === "quiz" || phase === "complete") {
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
    async (correctCount: number, total: number, totalXp: number) => {
      if (!token || !lesson || progressPosted.current) return;
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
            xp: totalXp,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            xp?: number;
            lessonsComplete?: number[];
          };
          if (data.xp !== undefined) {
            setUser((u) => (u ? { ...u, xp: data.xp! } : u));
          }
          if (data.lessonsComplete) {
            setUser((u) =>
              u ? { ...u, lessonsComplete: data.lessonsComplete! } : u
            );
          }
        } else {
          progressPosted.current = false;
        }
      } catch {
        progressPosted.current = false;
      } finally {
        setXpAwarded(true);
      }
    },
    [token, lesson, lessonId]
  );

  useEffect(() => {
    if (!showQuizResults || !lesson || !token) return;
    if (resultsInitialized.current) return;
    resultsInitialized.current = true;

    const total = lesson.quiz.length;
    let correct = 0;
    for (let i = 0; i < total; i++) {
      if (quizAnswers[i] === lesson.quiz[i].correct) correct += 1;
    }
    setQuizScoreCorrect(correct);

    const quizXp = quizXpFromAccuracy(lesson.xpReward, correct, total);
    const gameXp = lesson.hasGame && gameComplete ? GAME_BONUS_XP : 0;
    const totalXp = quizXp + gameXp;
    setResultsXp(totalXp);

    void postLessonProgress(correct, total, totalXp);
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
    setResultsXp(0);
    setCurrentQuestion(0);
    setPickedOption(null);
    setQuizAnswers({});
    setGameComplete(false);
    setGameActive(false);
    setPhase("video");
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

  const handleResultsContinue = () => {
    setPhase("complete");
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

  const totalQs = lesson.quiz.length;
  const q = lesson.quiz[currentQuestion];
  const durationMin = Math.round(lesson.duration / 60);
  const typeLabel =
    lesson.type === "live" ? "Live session" : "Self-paced + game";

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
            <div
              className="relative aspect-video w-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(30,20,80,0.9), rgba(15,30,70,0.9))",
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #06B6D4, transparent)",
                  animation: "scan-line 5s ease-in-out infinite",
                }}
              />
              <div className="relative z-[1] flex h-full flex-col items-center justify-center px-6 text-center">
                <PlayCircle className="h-16 w-16 text-white/60" />
                <p className="mt-4 text-lg font-bold text-white">Video Uploading Soon</p>
                <p className="mt-2 max-w-md text-sm text-slate-300">
                  We are preparing the lesson video for this module. You can
                  continue to the game and quiz right away.
                </p>
                <p className="mt-3 text-sm font-semibold text-cyan-400">
                  Continue to {lesson.hasGame ? "Game" : "Quiz"} →
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <h2 className="text-[22px] font-bold tracking-tight text-white">{lesson.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{lesson.description}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <span className="w-fit rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
                  ~{durationMin} min
                </span>
                <span className="w-fit rounded-full bg-indigo-500/15 px-3 py-1 text-xs text-indigo-300">
                  {typeLabel}
                </span>
              </div>
              <button
                type="button"
                className="mt-6 rounded-xl px-7 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                  boxShadow: "var(--glow-indigo)",
                }}
                onClick={() =>
                  lesson.hasGame ? setPhase("game") : setPhase("quiz")
                }
              >
                {lesson.hasGame ? "Continue to Game →" : "Continue to Quiz →"}
              </button>
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
            {gameActive && lessonId === 2 && (
              <LandscapeWrapper>
                <GameShell2
                  onComplete={async () => {
                    await exitGame();
                    setGameComplete(true);
                    setPhase("quiz");
                  }}
                  onExit={exitGame}
                />
              </LandscapeWrapper>
            )}
            {gameActive && lessonId === 3 && (
              <LandscapeWrapper>
                <GameShell3
                  onComplete={async () => {
                    await exitGame();
                    setGameComplete(true);
                    setPhase("quiz");
                  }}
                  onExit={exitGame}
                />
              </LandscapeWrapper>
            )}
            {gameActive && lessonId === 4 && (
              <LandscapeWrapper>
                <GameShell4
                  onComplete={async () => {
                    await exitGame();
                    setGameComplete(true);
                    setPhase("quiz");
                  }}
                  onExit={exitGame}
                />
              </LandscapeWrapper>
            )}

            {gameActive && lessonId !== 2 && lessonId !== 3 && lessonId !== 4 && (
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
            <motion.p
              className="mt-6 text-center text-[52px] font-black leading-none"
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              style={{
                background: "linear-gradient(135deg, #F59E0B, #F97316)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "count-up 0.6s ease",
              }}
            >
              +{resultsXp} XP
            </motion.p>
            <p className="mt-2 text-sm text-green-400">
              {xpAwarded ? "Progress saved!" : "Saving progress…"}
            </p>
            <button
              type="button"
              className="mt-8 w-full max-w-xs rounded-xl px-8 py-3 font-bold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto"
              style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}
              disabled={!xpAwarded}
              onClick={handleResultsContinue}
            >
              Continue →
            </button>
          </div>
        )}

        {phase === "complete" && (
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="grid h-[72px] w-[72px] place-items-center rounded-full text-white"
              style={{
                background: "linear-gradient(135deg, #10B981, #059669)",
                boxShadow: "0 0 32px rgba(16,185,129,0.4)",
              }}
            >
              <Check className="h-10 w-10" strokeWidth={3} />
            </motion.div>
            <motion.h2
              className="mt-6 text-3xl font-bold"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{
                background: "linear-gradient(135deg, #FFFFFF, #67E8F9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Lesson Complete!
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-4 rounded-full bg-amber-500/15 px-4 py-2 text-lg font-bold text-amber-300"
            >
              +{resultsXp} XP earned
            </motion.div>
            <p className="mt-6 text-sm text-slate-500">
              Returning to {lessonId >= 4 ? "completion" : "dashboard"} in 3
              seconds…
            </p>
          </div>
        )}
      </main>

      {!userLoading && user && token ? (
        <NOVAChat
          userName={user?.name || ""}
          xp={user?.xp || 0}
          lessonsComplete={user?.lessonsComplete?.length || 0}
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
