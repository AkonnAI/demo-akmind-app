"use client";

import type { DemoUser } from "@/types/demo";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
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

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = /(?:^|; )demo_token=([^;]*)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

function lessonUnlocked(
  lessonId: number,
  lessonsComplete: number[]
): boolean {
  if (lessonId === 1) return true;
  return lessonsComplete.includes(lessonId - 1);
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
  const [videoWatched, setVideoWatched] = useState(false);
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
    const t = tokenFromUrl ?? readCookieToken();
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
    setVideoWatched(false);
    const t = setTimeout(() => setVideoWatched(true), 10_000);
    return () => clearTimeout(t);
  }, [lessonId]);

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
    if (token) {
      router.push(`/demo?token=${encodeURIComponent(token)}`);
    } else {
      router.push("/demo");
    }
  };

  const postLessonProgress = useCallback(
    async (correctCount: number, total: number, totalXp: number) => {
      if (!token || !lesson || progressPosted.current) return;
      progressPosted.current = true;
      const pct =
        total > 0 ? Math.round((correctCount / total) * 100) : 0;
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
    const gameXp =
      lesson.hasGame && gameComplete ? GAME_BONUS_XP : 0;
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
      <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-700">
        <p className="font-semibold">Lesson not found.</p>
        <button
          type="button"
          className="mt-4 text-indigo-600 underline"
          onClick={goDashboard}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (loadError || !token) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="font-semibold text-slate-800">Unable to load lesson.</p>
        <button
          type="button"
          className="mt-4 text-indigo-600 underline"
          onClick={() => router.push("/")}
        >
          Go home
        </button>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="min-h-screen animate-pulse bg-slate-50">
        <div className="h-16 border-b bg-white" />
        <div className="mx-auto mt-8 h-48 max-w-4xl rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (user && !lessonUnlocked(lessonId, user.lessonsComplete)) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="font-semibold text-slate-800">
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

  const totalQs = lesson.quiz.length;
  const q = lesson.quiz[currentQuestion];
  const durationMin = Math.round(lesson.duration / 60);
  const typeLabel =
    lesson.type === "live" ? "Live session" : "Self-paced + game";

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            onClick={goDashboard}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold text-slate-900 sm:text-base">
            {lesson.title}
          </h1>
          <div className="shrink-0 rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700 sm:px-3 sm:text-sm">
            ⚡ {headerXp} XP
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 sm:gap-4">
            {stepMeta.map((step, i) => {
              const done = i < activeStepIndex;
              const current = i === activeStepIndex;
              return (
                <div key={step.label} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base sm:h-9 sm:w-9 ${
                      current
                        ? "bg-indigo-100 text-indigo-800 ring-2 ring-indigo-400"
                        : done
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                    title={step.label}
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-green-600" aria-hidden />
                    ) : (
                      <span aria-hidden>{step.icon}</span>
                    )}
                    <span className="sr-only">{step.label}</span>
                  </div>
                  <span
                    className={`hidden text-xs font-semibold sm:inline sm:text-sm ${
                      current ? "text-indigo-800" : done ? "text-green-700" : "text-slate-500"
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

      <main className="mx-auto max-w-4xl px-0 py-4 sm:px-6 sm:py-6">
        {phase === "video" && (
          <div className="px-3 sm:px-0">
            <div className="aspect-video w-full overflow-hidden rounded-none bg-black sm:rounded-2xl">
              <iframe
                title={lesson.title}
                src={`${lesson.videoUrl}?rel=0&modestbranding=1`}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {lesson.title}
            </h2>
            <p className="mt-2 text-slate-500">{lesson.description}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <span className="w-fit rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                ~{durationMin} min
              </span>
              <span className="w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
                {typeLabel}
              </span>
            </div>
            {videoWatched && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
                ✅ Video watched!
              </div>
            )}
            {videoWatched && (
              <button
                type="button"
                className="mt-6 rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white transition hover:bg-indigo-700"
                onClick={() =>
                  lesson.hasGame ? setPhase("game") : setPhase("quiz")
                }
              >
                {lesson.hasGame
                  ? "Continue to Game →"
                  : "Continue to Quiz →"}
              </button>
            )}
          </div>
        )}

        {phase === "game" && lesson.hasGame && (
          <div className="px-0 sm:px-0">
            {gameActive && lessonId === 2 && (
              <GameShell2
                onComplete={() => {
                  setGameComplete(true);
                  setGameActive(false);
                  setPhase("quiz");
                }}
                onExit={() => setGameActive(false)}
              />
            )}

            {gameActive && lessonId === 3 && (
              <GameShell3
                onComplete={() => {
                  setGameComplete(true);
                  setGameActive(false);
                  setPhase("quiz");
                }}
                onExit={() => setGameActive(false)}
              />
            )}

            {gameActive && lessonId === 4 && (
              <GameShell4
                onComplete={() => {
                  setGameComplete(true);
                  setGameActive(false);
                  setPhase("quiz");
                }}
                onExit={() => setGameActive(false)}
              />
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
                <p className="mt-4 max-w-sm text-xs text-slate-400">
                  ⚡ Complete the game to unlock the quiz and earn bonus XP
                </p>
              </div>
            )}

            {gameComplete && !gameActive && (
              <div className="mx-3 rounded-2xl border border-green-200 bg-green-50 p-6 text-center sm:mx-0 sm:p-8">
                <p className="text-lg font-semibold text-green-800">
                  ✅ Game complete! +{GAME_BONUS_XP} XP earned
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white"
                  onClick={() => setPhase("quiz")}
                >
                  Continue to Quiz →
                </button>
              </div>
            )}

            {!gameComplete && !gameActive && (
              <div className="mx-3 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-center sm:mx-0 sm:p-12">
                <p className="text-5xl sm:text-6xl">🎮</p>
                <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">
                  Story Game: {lesson.title}
                </h2>
                <p className="mt-2 text-sm text-slate-300 sm:text-base">
                  {GAME_MECHANICS[lessonId] ?? "Interactive story adventure."}
                </p>
                <p className="mt-4 text-xs text-slate-500 sm:text-sm">Tap to launch game</p>
                <button
                  type="button"
                  className="mt-4 w-full max-w-md rounded-xl bg-cyan-500 px-6 py-4 text-base font-bold text-black transition hover:bg-cyan-400 sm:mt-8 sm:w-auto sm:px-8 sm:text-lg"
                  onClick={() => setGameActive(true)}
                >
                  Launch Game →
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "quiz" && !showQuizResults && (
          <div className="mx-3 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mx-auto sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">
              📝 Knowledge Check
            </h2>
            <p className="text-sm font-medium text-indigo-600">
              {lesson.title}
            </p>
            <p className="mt-4 text-sm text-slate-500">
              Question {currentQuestion + 1} of {totalQs}
            </p>
            <p className="mb-6 mt-2 text-lg font-semibold text-slate-900">
              {q.q}
            </p>
            <div className="flex flex-col gap-3">
              {q.options.map((opt, idx) => {
                const show = pickedOption !== null;
                const isCorrect = idx === q.correct;
                const isPicked = pickedOption === idx;
                let cls =
                  "min-h-[56px] w-full rounded-xl border border-slate-200 bg-white p-4 text-left text-slate-800 font-medium transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.99]";
                if (show) {
                  if (isCorrect) {
                    cls =
                      "min-h-[56px] w-full rounded-xl border-2 border-green-500 bg-green-50 p-4 text-left text-green-700";
                  } else if (isPicked) {
                    cls =
                      "min-h-[56px] w-full rounded-xl border-2 border-red-500 bg-red-50 p-4 text-left text-red-700";
                  } else {
                    cls =
                      "min-h-[56px] w-full rounded-xl border border-slate-100 bg-slate-50 p-4 text-left text-slate-400";
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={pickedOption !== null}
                    className={cls}
                    onClick={() => selectOption(idx)}
                  >
                    {opt}
                    {show && isCorrect ? (
                      <span className="mt-2 block text-sm font-bold">
                        ✓ Correct!
                      </span>
                    ) : null}
                    {show && isPicked && !isCorrect ? (
                      <span className="mt-2 block text-sm font-bold text-green-700">
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
                className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white"
                onClick={advanceQuestion}
              >
                {currentQuestion >= totalQs - 1
                  ? "See results →"
                  : "Next Question →"}
              </button>
            )}
          </div>
        )}

        {phase === "quiz" && showQuizResults && (
          <div className="mx-3 flex max-w-2xl flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:mx-auto sm:p-8">
            <h2 className="text-2xl font-bold">Results</h2>
            <p className="mt-2 text-slate-600">
              Score: {quizScoreCorrect}/{totalQs}
            </p>
            <motion.p
              className="mt-6 text-center text-4xl font-black text-yellow-500 drop-shadow-sm"
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
            >
              +{resultsXp} XP
            </motion.p>
            <p className="mt-2 text-sm text-slate-500">
              {xpAwarded ? "Progress saved!" : "Saving progress…"}
            </p>
            <button
              type="button"
              className="mt-8 w-full max-w-xs rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white disabled:opacity-50 sm:w-auto"
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
              className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-white shadow-lg"
            >
              <Check className="h-10 w-10" strokeWidth={3} />
            </motion.div>
            <motion.h2
              className="mt-6 text-3xl font-bold text-slate-900"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              Lesson Complete!
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-4 rounded-full bg-yellow-100 px-4 py-2 text-lg font-bold text-yellow-800"
            >
              +{resultsXp} XP earned
            </motion.div>
            <p className="mt-6 text-sm text-slate-500">
              Returning to{" "}
              {lessonId >= 4 ? "completion" : "dashboard"} in 3 seconds…
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DemoLessonPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen animate-pulse bg-slate-50">
          <div className="h-16 border-b bg-white" />
          <div className="mx-auto mt-8 h-48 max-w-4xl rounded-2xl bg-slate-200" />
        </div>
      }
    >
      <LessonPageInner />
    </Suspense>
  );
}
