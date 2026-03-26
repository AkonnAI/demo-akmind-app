"use client";

import type { DemoUser } from "@/types/demo";
import { jsPDF } from "jspdf";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const CONFETTI_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#a855f7",
];

const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL ?? "https://www.akmind.com";

const CONFETTI_PIECES = Array.from({ length: 40 }, (_, i) => ({
  left: `${(i * 2.47 + ((i * 13) % 7)) % 100}%`,
  duration: 2.6 + (i % 6) * 0.35,
  delay: (i % 12) * 0.08,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  dx: `${((i % 9) - 4) * 18}px`,
  spin: `${540 + (i % 6) * 120}deg`,
}));

type PaymentMethod = "upi" | "card" | "netbank" | "emi";

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
  const [bootStatus, setBootStatus] = useState<
    "loading" | "ready" | "noop"
  >("loading");
  const [showPayment, setShowPayment] = useState(false);
  const [badgeDownloading, setBadgeDownloading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null
  );
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [fullName, setFullName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  const loadUser = useCallback(async (t: string) => {
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
        router.replace(
          `/demo${t ? `?token=${encodeURIComponent(t)}` : ""}`
        );
        return;
      }
      setUser(data);
      setFullName(data.name || "");
      setEmailInput(data.email || "");
      setPhoneInput(data.phone || "");
      setBootStatus("ready");
    } catch {
      setUser(null);
      setBootStatus("ready");
    }
  }, [router]);

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
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 297, 210, "F");

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(20, 20, 257, 170, 8, 8, "F");

      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(2);
      doc.roundedRect(20, 20, 257, 170, 8, 8, "S");

      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text("AKMIND", 148, 50, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Dream. Discover. Shine.", 148, 60, { align: "center" });

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("AI EXPLORER DEMO CERTIFICATE", 148, 85, {
        align: "center",
      });

      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("This certifies that", 148, 105, { align: "center" });

      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(user.childName || "Student", 148, 120, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(
        "has successfully completed the AKMIND AI Explorers Demo Program",
        148,
        133,
        { align: "center" }
      );
      doc.text(
        "covering 4 lessons on Artificial Intelligence fundamentals",
        148,
        142,
        { align: "center" }
      );

      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date: ${dateStr}`, 60, 165);
      doc.text(`XP Earned: ${user.xp ?? 0}`, 148, 165, { align: "center" });
      doc.text("akmind.com", 237, 165, { align: "right" });

      doc.save(
        `AKMIND-Demo-Certificate-${user.childName || "Student"}.pdf`
      );
    } finally {
      setBadgeDownloading(false);
    }
  };

  const openPayment = () => {
    setPaymentSuccess(false);
    setShowPayment(true);
  };

  const closePayment = () => {
    setShowPayment(false);
    setPaymentSuccess(false);
  };

  const handlePayClick = () => {
    setPaymentSuccess(true);
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
      <div className="min-h-screen animate-pulse bg-slate-50">
        <div className="h-48 bg-indigo-950/20" />
        <div className="mx-auto mt-8 h-64 max-w-sm rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (!user || !user.demoCompleted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <p className="font-semibold text-slate-800">
          We couldn&apos;t load your completion record.
        </p>
        <Link
          href="/demo"
          className="mt-4 text-indigo-600 underline"
        >
          Back to demo
        </Link>
      </div>
    );
  }

  const xp = user.xp ?? 0;
  const childName = user.childName || "Explorer";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-indigo-950 py-16 text-center text-white">
        <div className="complete-confetti-layer">{confetti}</div>
        <div className="relative z-10 px-4">
          <p className="animate-bounce text-6xl">🎉</p>
          <h1 className="mt-4 text-4xl font-bold">Demo Complete!</h1>
          <p className="mt-2 text-lg text-indigo-200">
            {childName} has finished the AKMIND demo!
          </p>
          <div className="mx-auto mt-8 inline-flex flex-wrap justify-center gap-4 md:gap-6">
            {[
              { big: `⚡ ${xp} XP`, label: "Points Earned" },
              { big: "4/4", label: "Lessons Done" },
              { big: "🏅", label: "Badge Earned" },
            ].map((s) => (
              <div
                key={s.label}
                className="min-w-[8rem] rounded-2xl bg-white/10 p-4 text-center"
              >
                <p className="text-xl font-bold">{s.big}</p>
                <p className="mt-1 text-xs text-indigo-200">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-12 text-center">
        <div className="mx-auto max-w-sm rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white shadow-2xl">
          <p className="font-mono text-lg tracking-widest">⚡ AKMIND</p>
          <p className="my-4 text-8xl">🏅</p>
          <p className="text-3xl font-black tracking-wider">AI EXPLORER</p>
          <p className="mt-1 text-sm tracking-widest text-indigo-200">
            DEMO CERTIFICATE
          </p>
          <div className="my-4 border-t border-white/20" />
          <p className="text-xl font-bold">{childName}</p>
          <p className="mt-1 text-sm text-indigo-200">
            has completed the AKMIND AI Explorers Demo
          </p>
          <p className="mt-2 text-xs text-indigo-300">{certDate}</p>
          <p className="mt-4 text-xs text-indigo-300">akmind.com</p>
        </div>
        <button
          type="button"
          disabled={badgeDownloading}
          className="mt-6 rounded-xl border-2 border-indigo-200 bg-white px-8 py-3 font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
          onClick={downloadBadge}
        >
          {badgeDownloading ? "Preparing PDF…" : "Download Badge PDF"}
        </button>
      </section>

      <section className="border-b border-slate-200 bg-white py-12 text-center">
        <h2 className="text-3xl font-bold">What&apos;s Next?</h2>
        <p className="mx-auto mt-2 max-w-lg text-slate-500">
          You&apos;ve experienced 4 lessons. The full AI Explorers program has
          60 lessons across 6 modules.
        </p>
        <div className="mx-auto mt-8 max-w-md rounded-2xl border-2 border-indigo-200 p-6 text-left">
          <p className="text-xl font-bold">🚀 AI Explorers — Full Program</p>
          <p className="mt-1 text-sm text-slate-500">
            60 Lessons · 6 Modules · 1 Capstone Project
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {[
              "✅ 60 micro-lessons (11 min each)",
              "✅ 6 story games — one per module",
              "✅ Live sessions with expert mentors",
              "✅ XP, badges and leaderboard",
              "✅ Capstone AI project",
              "✅ Completion certificate",
            ].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-4 inline-block rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            🗓 Available from August 2026
          </p>
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">Early Bird Price</p>
            <p className="text-4xl font-black text-indigo-600">
              ₹18,999
              <span className="text-lg font-normal text-slate-400">
                {" "}
                /program
              </span>
            </p>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-indigo-600 py-4 text-lg font-bold text-white hover:bg-indigo-700"
            onClick={openPayment}
          >
            Reserve My Spot →
          </button>
        </div>
      </section>

      <section className="bg-slate-50 py-8 text-center">
        <p className="text-sm text-slate-400">Not ready yet? No problem.</p>
        <p className="mt-1 text-xs text-slate-300">
          Keep your badge and come back anytime.
        </p>
        <Link
          href={LANDING_URL}
          className="mt-3 inline-block text-sm text-indigo-400 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          ← Back to akmind.com
        </Link>
      </section>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-8 shadow-xl">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
              onClick={closePayment}
            >
              ✕
            </button>

            {!paymentSuccess ? (
              <>
                <h3 className="pr-8 text-xl font-bold">
                  Complete Your Enrollment
                </h3>
                <p className="text-sm text-indigo-600">AI Explorers Program</p>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">
                      AI Explorers — Full Program
                    </span>
                    <span className="text-xl font-bold">₹18,999</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-600">
                    Available from August 2026
                  </p>
                </div>

                <p className="mt-6 text-sm font-medium text-slate-700">
                  Select Payment Method
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(
                    [
                      {
                        id: "upi" as const,
                        title: "📱 UPI",
                        sub: "Google Pay, PhonePe, Paytm",
                      },
                      {
                        id: "card" as const,
                        title: "💳 Credit / Debit Card",
                        sub: "Visa, Mastercard, RuPay",
                      },
                      {
                        id: "netbank" as const,
                        title: "🏦 Net Banking",
                        sub: "All major banks",
                      },
                      {
                        id: "emi" as const,
                        title: "📅 EMI",
                        sub: "3 / 6 / 12 months",
                      },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`rounded-xl border p-3 text-center text-sm transition hover:border-indigo-400 ${
                        paymentMethod === m.id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200"
                      }`}
                    >
                      <span className="block font-semibold text-slate-900">
                        {m.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {m.sub}
                      </span>
                    </button>
                  ))}
                </div>

                <label className="mt-4 block text-left text-xs font-medium text-slate-600">
                  Full Name
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
                <label className="mt-3 block text-left text-xs font-medium text-slate-600">
                  Email
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </label>
                <label className="mt-3 block text-left text-xs font-medium text-slate-600">
                  Phone
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"
                    placeholder="Phone number"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-700"
                  onClick={handlePayClick}
                >
                  Pay ₹18,999 →
                </button>
                <p className="mt-3 text-center text-xs text-slate-400">
                  🔒 Secure payment · Full refund if course doesn&apos;t launch
                  · No charges until August 2026
                </p>
              </>
            ) : (
              <div className="pt-2 text-center">
                <p className="text-5xl">✅</p>
                <h3 className="mt-4 text-2xl font-bold">Payment Received!</h3>
                <p className="mt-2 text-slate-500">
                  Thank you {user.name}! Your spot is reserved for AI Explorers
                  starting August 2026.
                </p>
                <p className="mt-1 text-center text-sm text-slate-400">
                  We will email you enrollment details before the course begins.
                </p>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl border border-slate-200 py-3 font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={closePayment}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemoCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <CompletePageInner />
    </Suspense>
  );
}
