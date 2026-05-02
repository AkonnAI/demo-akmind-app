"use client";

import type { DemoUser } from "@/types/demo";
import { jsPDF } from "jspdf";
import { Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const CONFETTI_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#a855f7"];
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://www.akmind.com";
const FULL_COURSE_LINE = "Full course launching June 2026";
const STAY_TUNED_LINE = "Stay tuned for more updates.";

const CONFETTI_PIECES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 4.7 + ((i * 11) % 9)) % 100}%`,
  duration: 2.6 + (i % 6) * 0.35,
  delay: (i % 10) * 0.08,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  dx: `${((i % 9) - 4) * 18}px`,
  spin: `${540 + (i % 6) * 120}deg`,
}));

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = /(?:^|; )demo_token=([^;]*)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

function CompletePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [user, setUser] = useState<DemoUser | null>(null);
  const [bootStatus, setBootStatus] = useState<"loading" | "ready" | "noop">(
    "loading"
  );
  const [badgeDownloading, setBadgeDownloading] = useState(false);

  const loadUser = useCallback(
    async (t: string) => {
      setBootStatus("loading");
      try {
        const res = await fetch(`/api/demo/user?token=${encodeURIComponent(t)}`);
        if (!res.ok) {
          setUser(null);
          setBootStatus("ready");
          return;
        }
        const data = (await res.json()) as DemoUser;
        if (!data.demoCompleted) {
          setBootStatus("noop");
          router.replace(`/demo${t ? `?token=${encodeURIComponent(t)}` : ""}`);
          return;
        }
        setUser(data);
        setBootStatus("ready");
      } catch {
        setUser(null);
        setBootStatus("ready");
      }
    },
    [router]
  );

  useEffect(() => {
    const t = tokenFromUrl ?? readCookieToken();
    if (!t) {
      setUser(null);
      setBootStatus("ready");
      router.replace("/?error=no-token");
      return;
    }
    void loadUser(t);
  }, [tokenFromUrl, loadUser, router]);

  const downloadBadge = () => {
    if (!user) return;
    setBadgeDownloading(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 210, "F");
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(14, 14, 269, 182, 6, 6, "F");
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, 18, 261, 174, 5, 5, "F");
      doc.setDrawColor(34, 211, 238);
      doc.setLineWidth(0.8);
      doc.roundedRect(22, 22, 253, 166, 4, 4, "S");
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1.2);
      doc.roundedRect(18, 18, 261, 174, 5, 5, "S");

      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text("AKMIND", 148, 44, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Dream. Discover. Shine.", 148, 52, { align: "center" });

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("AI EXPLORER — DEMO CERTIFICATE", 148, 74, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("This certifies that", 148, 92, { align: "center" });
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(user.childName || "Student", 148, 106, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(
        "has successfully completed the AKMIND AI Explorers Demo Program",
        148,
        120,
        { align: "center" }
      );
      doc.text(
        "covering 4 lessons on Artificial Intelligence fundamentals.",
        148,
        128,
        { align: "center" }
      );

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(8, 145, 178);
      doc.text(FULL_COURSE_LINE, 148, 142, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(STAY_TUNED_LINE, 148, 150, { align: "center" });

      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Issued: ${dateStr}`, 55, 172);
      doc.text(`XP earned: ${user.xp ?? 0}`, 148, 172, { align: "center" });
      doc.text("akmind.com", 242, 172, { align: "right" });

      doc.save(`AKMIND-Demo-Certificate-${user.childName || "Student"}.pdf`);
    } finally {
      setBadgeDownloading(false);
    }
  };

  const confetti = useMemo(
    () =>
      CONFETTI_PIECES.map((c, i) => (
        <span
          key={`confetti-${i}`}
          className="complete-confetti-piece"
          style={{
            left: c.left,
            backgroundColor: c.color,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            ["--confetti-dx" as string]: c.dx,
            ["--confetti-spin" as string]: c.spin,
          }}
        />
      )),
    []
  );

  const certDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  if (bootStatus === "loading" || bootStatus === "noop") {
    return (
      <div className="min-h-screen animate-pulse">
        <div className="h-48 bg-indigo-900/20" />
        <div className="mx-auto mt-8 h-64 max-w-sm rounded-2xl bg-indigo-400/20" />
      </div>
    );
  }

  if (!user || !user.demoCompleted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <p className="font-semibold text-slate-300">
          We couldn&apos;t load your completion record.
        </p>
        <Link href="/demo" className="mt-4 text-cyan-400 underline">
          Back to demo
        </Link>
      </div>
    );
  }

  const xp = user.xp ?? 0;
  const childName = user.childName || "Explorer";

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-100">
      <section className="relative px-4 py-8 sm:py-12">
        <div className="complete-confetti-layer">{confetti}</div>
        <div
          className="relative z-10 mx-auto max-w-[820px] rounded-3xl border p-8 sm:p-12"
          style={{
            background: "rgba(15,20,50,0.8)",
            borderColor: "rgba(99,102,241,0.25)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full">
            <Trophy
              className="h-[72px] w-[72px] text-amber-400"
              style={{ filter: "drop-shadow(0 0 32px rgba(245,158,11,0.4))" }}
            />
          </div>

          <h1
            className="mt-4 text-center text-4xl font-extrabold sm:text-5xl"
            style={{
              background: "linear-gradient(135deg, #FFFFFF, #67E8F9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Demo Complete!
          </h1>
          <p className="mt-3 text-center text-slate-400">
            {childName} has finished the AKMIND demo!
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {[
              { big: `${xp}`, label: "Points", icon: <Zap className="h-4 w-4 text-cyan-300" /> },
              { big: "4/4", label: "Lessons", icon: <span>📚</span> },
              { big: certDate, label: "Date", icon: <span>📅</span> },
            ].map((s) => (
              <div
                key={s.label}
                className="group rounded-2xl border p-4 text-center transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: "rgba(15,20,50,0.7)",
                  borderColor: "rgba(99,102,241,0.12)",
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                }}
              >
                <div className="mb-2 flex justify-center">
                  <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-indigo-500/15">
                    {s.icon}
                  </span>
                </div>
                <p className="text-base font-bold text-white sm:text-xl">{s.big}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mx-auto mt-10 max-w-xl rounded-2xl border p-6 text-center sm:p-8"
            style={{
              background:
                "linear-gradient(145deg, rgba(34,211,238,0.12), rgba(99,102,241,0.08))",
              borderColor: "rgba(34,211,238,0.35)",
              boxShadow: "0 12px 40px rgba(34,211,238,0.08)",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Coming next
            </p>
            <p className="mt-3 text-xl font-black text-white sm:text-2xl">
              {FULL_COURSE_LINE}
            </p>
            <p className="mt-2 text-sm text-slate-300">{STAY_TUNED_LINE}</p>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <div
              className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 p-8 text-center sm:p-10"
              style={{
                background:
                  "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(30,27,75,0.92))",
                borderColor: "rgba(34,211,238,0.45)",
                boxShadow:
                  "0 0 0 1px rgba(99,102,241,0.3), 0 20px 50px rgba(0,0,0,0.35)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-2 rounded-xl border border-indigo-400/20"
                aria-hidden
              />
              <p className="relative font-mono text-xs tracking-[0.35em] text-indigo-300">
                AKMIND
              </p>
              <p className="relative my-3 text-7xl drop-shadow-lg">🏅</p>
              <p className="relative text-3xl font-black tracking-tight text-white">
                AI EXPLORER
              </p>
              <p className="relative mt-1 text-[11px] font-semibold tracking-[0.28em] text-cyan-400">
                DEMO CERTIFICATE OF COMPLETION
              </p>
              <div className="relative mx-auto my-5 h-px w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
              <p className="relative text-xl font-bold text-slate-100">{childName}</p>
              <p className="relative mt-3 text-xs leading-relaxed text-slate-400">
                Completed all four demo lessons · {certDate}
              </p>
              <p className="relative mt-4 text-sm font-semibold text-cyan-300">
                {FULL_COURSE_LINE}
              </p>
              <p className="relative mt-1 text-xs text-slate-500">{STAY_TUNED_LINE}</p>
            </div>
            <button
              type="button"
              disabled={badgeDownloading}
              className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-orange-500/15 px-8 py-3.5 font-bold text-amber-100 shadow-lg shadow-amber-900/20 hover:from-amber-500/30 hover:to-orange-500/25 disabled:opacity-60"
              onClick={downloadBadge}
            >
              {badgeDownloading ? "Preparing PDF…" : "Download certificate PDF"}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-slate-600">
            Thank you for exploring with AKMIND.
          </p>
          <div className="mt-3 text-center">
            <Link
              href={LANDING_URL}
              className="text-sm text-cyan-400 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ← Back to akmind.com
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DemoCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-300/20 border-t-indigo-400" />
        </div>
      }
    >
      <CompletePageInner />
    </Suspense>
  );
}
