"use client";

import type { DemoUser } from "@/types/demo";
import { jsPDF } from "jspdf";
import { Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const CONFETTI_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#a855f7"];
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://www.akmind.com";
const CONFETTI_PIECES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 4.7 + ((i * 11) % 9)) % 100}%`,
  duration: 2.6 + (i % 6) * 0.35,
  delay: (i % 10) * 0.08,
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
  const [bootStatus, setBootStatus] = useState<"loading" | "ready" | "noop">(
    "loading"
  );
  const [showPayment, setShowPayment] = useState(false);
  const [badgeDownloading, setBadgeDownloading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [fullName, setFullName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

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
        setFullName(data.name || "");
        setEmailInput(data.email || "");
        setPhoneInput(data.phone || "");
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
      doc.text("AI EXPLORER DEMO CERTIFICATE", 148, 85, { align: "center" });
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
      doc.save(`AKMIND-Demo-Certificate-${user.childName || "Student"}.pdf`);
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

          <div className="mt-10 text-center">
            <button
              type="button"
              className="rounded-[14px] px-10 py-4 text-base font-black text-slate-900 transition duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #F97316)",
                boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
              }}
              onClick={openPayment}
            >
              Upgrade to Full Program
            </button>
            <p className="mt-3 text-[13px] text-slate-500">
              60 lessons · 3 programs · Live classes
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div
              className="w-full max-w-sm rounded-2xl border p-6 text-center"
              style={{
                background: "rgba(15,20,50,0.65)",
                borderColor: "rgba(99,102,241,0.15)",
              }}
            >
              <p className="font-mono text-sm tracking-[0.25em] text-indigo-200">
                AKMIND
              </p>
              <p className="my-2 text-6xl">🏅</p>
              <p className="text-2xl font-black text-white">AI EXPLORER</p>
              <p className="mt-1 text-xs tracking-[0.25em] text-indigo-300">
                DEMO CERTIFICATE
              </p>
              <p className="mt-3 text-lg font-bold text-slate-200">{childName}</p>
            </div>
            <button
              type="button"
              disabled={badgeDownloading}
              className="rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-6 py-3 font-bold text-indigo-200 hover:bg-indigo-500/25 disabled:opacity-60"
              onClick={downloadBadge}
            >
              {badgeDownloading ? "Preparing PDF…" : "Download Badge PDF"}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-slate-600">
            Keep your badge and come back anytime.
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

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
          <div
            className="relative flex max-h-[100dvh] w-full flex-col overflow-y-auto rounded-t-2xl border p-5 sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:p-8"
            style={{
              background: "rgba(8,10,22,0.96)",
              borderColor: "rgba(99,102,241,0.2)",
              backdropFilter: "blur(24px)",
            }}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200"
              aria-label="Close"
              onClick={closePayment}
            >
              ✕
            </button>

            {!paymentSuccess ? (
              <>
                <h3 className="pr-10 text-lg font-bold text-white sm:text-xl">
                  Complete Your Enrollment
                </h3>
                <p className="text-sm text-indigo-300">AI Explorers Program</p>

                <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-100">
                      AI Explorers — Full Program
                    </span>
                    <span className="text-xl font-bold text-amber-300">₹29,999/-</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-400">Available from August 2026</p>
                </div>

                <p className="mt-6 text-sm font-medium text-slate-300">
                  Select Payment Method
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(
                    [
                      { id: "upi" as const, title: "📱 UPI", sub: "Google Pay, PhonePe, Paytm" },
                      { id: "card" as const, title: "💳 Credit / Debit Card", sub: "Visa, Mastercard, RuPay" },
                      { id: "netbank" as const, title: "🏦 Net Banking", sub: "All major banks" },
                      { id: "emi" as const, title: "📅 EMI", sub: "3 / 6 / 12 months" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`rounded-xl border p-3 text-center text-sm transition ${
                        paymentMethod === m.id
                          ? "border-indigo-400 bg-indigo-500/15"
                          : "border-indigo-300/20 hover:border-indigo-300/40"
                      }`}
                    >
                      <span className="block font-semibold text-slate-100">{m.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">{m.sub}</span>
                    </button>
                  ))}
                </div>

                <label className="mt-4 block text-left text-xs font-medium text-slate-400">
                  Full Name
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-indigo-300/20 bg-white/5 p-3 text-sm text-slate-100"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
                <label className="mt-3 block text-left text-xs font-medium text-slate-400">
                  Email
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-indigo-300/20 bg-white/5 p-3 text-sm text-slate-100"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </label>
                <label className="mt-3 block text-left text-xs font-medium text-slate-400">
                  Phone
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-xl border border-indigo-300/20 bg-white/5 p-3 text-sm text-slate-100"
                    placeholder="Phone number"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="mt-6 w-full rounded-xl py-4 font-black text-slate-900"
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #F97316)",
                    boxShadow: "0 8px 30px rgba(245,158,11,0.35)",
                  }}
                  onClick={handlePayClick}
                >
                  Pay ₹29,999/- →
                </button>
                <p className="mt-3 text-center text-xs text-slate-600">
                  Secure payment · Full refund if course doesn&apos;t launch · No charges until August 2026
                </p>
              </>
            ) : (
              <div className="pt-2 text-center">
                <p className="text-5xl">✅</p>
                <h3 className="mt-4 text-2xl font-bold text-white">Payment Received!</h3>
                <p className="mt-2 text-slate-400">
                  Thank you {user.name}! Your spot is reserved for AI Explorers
                  starting August 2026.
                </p>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl border border-indigo-300/25 py-3 font-semibold text-slate-200 hover:bg-white/5"
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
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-300/20 border-t-indigo-400" />
        </div>
      }
    >
      <CompletePageInner />
    </Suspense>
  );
}
