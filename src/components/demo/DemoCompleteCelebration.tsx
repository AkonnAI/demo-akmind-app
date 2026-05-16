"use client";

import { DEMO_BADGES } from "@/lib/demo-badges";
import { BRAND_WORDMARK_PATH } from "@/lib/brand";
import type { DemoUser } from "@/types/demo";
import { jsPDF } from "jspdf";
import { motion } from "framer-motion";
import Image from "next/image";
import { Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const CONFETTI_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#a855f7"];
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://www.akmind.com";
const STAY_TUNED_LINE = "Stay tuned for more updates.";

function fullCourseLine(course: string) {
  return `Unlock the full ${course} program at akmind.com`;
}

const CONFETTI_PIECES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 4.7 + ((i * 11) % 9)) % 100}%`,
  duration: 2.6 + (i % 6) * 0.35,
  delay: (i % 10) * 0.08,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  dx: `${((i % 9) - 4) * 18}px`,
  spin: `${540 + (i % 6) * 120}deg`,
}));

async function fetchWordmarkDataUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(
      `${window.location.origin}${BRAND_WORDMARK_PATH}`
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () =>
        resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function DemoCompleteCelebration({
  user,
  isPreview = false,
  showLaunchJuneCard = false,
}: {
  user: DemoUser;
  isPreview?: boolean;
  /** Admin-only: full-program launch timeline card (not shown to learners). */
  showLaunchJuneCard?: boolean;
}) {
  const [badgeDownloading, setBadgeDownloading] = useState(false);
  const courseName = user.course;
  const demoCompleteBadgeTitle =
    courseName === "AI Builders"
      ? "AI Builders Demo Complete"
      : courseName === "AI Explorers"
        ? "AI Explorers Demo Complete"
        : `${courseName} Demo Complete`;

  const downloadBadge = async () => {
    if (!user) return;
    setBadgeDownloading(true);
    try {
      const logoData = await fetchWordmarkDataUrl();

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
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

      let yAfterHeader = 40;
      if (logoData) {
        const logoW = 52;
        const logoH = (logoW * 242) / 800;
        doc.addImage(logoData, "PNG", 148 - logoW / 2, 22, logoW, logoH);
        yAfterHeader = 22 + logoH + 6;
      } else {
        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("AKMIND", 148, 44, { align: "center" });
        yAfterHeader = 48;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Dream. Discover. Shine.", 148, yAfterHeader, {
        align: "center",
      });

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      const titleLines = doc.splitTextToSize(demoCompleteBadgeTitle, 248);
      doc.text(titleLines, 148, yAfterHeader + 18, { align: "center" });
      const yAfterTitle =
        yAfterHeader + 18 + titleLines.length * 7.5 + 6;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("This certifies that", 148, yAfterTitle + 12, {
        align: "center",
      });
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(user.childName || "Student", 148, yAfterTitle + 26, {
        align: "center",
      });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Total XP Earned: ${user.xp ?? 0} XP`,
        148,
        yAfterTitle + 34,
        { align: "center" }
      );

      doc.text(
        `has successfully completed the AKMIND ${courseName} Demo Program`,
        148,
        yAfterTitle + 44,
        { align: "center" }
      );
      doc.text(
        "covering 3 lessons on Artificial Intelligence fundamentals.",
        148,
        yAfterTitle + 52,
        { align: "center" }
      );
      if (courseName === "AI Builders") {
        doc.text(
          "Module completed: Module 1 — Python and the Internet",
          148,
          yAfterTitle + 60,
          { align: "center" }
        );
      }

      let yPos = yAfterTitle + (courseName === "AI Builders" ? 70 : 62);
      const earnedBadgeLabels = (user.earnedBadges ?? [])
        .map((slug) => DEMO_BADGES.find((b) => b.slug === slug)?.name)
        .filter((n): n is string => Boolean(n));
      if (earnedBadgeLabels.length > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("Demo badges earned", 148, yPos, { align: "center" });
        yPos += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        const badgeLines = doc.splitTextToSize(
          earnedBadgeLabels.join(" · "),
          220
        );
        doc.text(badgeLines, 148, yPos, { align: "center" });
        yPos += badgeLines.length * 4.5 + 6;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(8, 145, 178);
      doc.text(fullCourseLine(courseName), 148, yPos, { align: "center" });
      yPos += 8;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(STAY_TUNED_LINE, 148, yPos, { align: "center" });

      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const footerY = Math.max(yPos + 22, 168);
      doc.text(`Issued: ${dateStr}`, 55, footerY);
      doc.text(`XP earned: ${user.xp ?? 0}`, 148, footerY, { align: "center" });
      doc.text("akmind.com", 242, footerY, { align: "right" });

      doc.addPage("a4", "landscape");
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 210, "F");
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, 18, 261, 174, 5, 5, "F");

      let page2Y = 28;
      if (logoData) {
        const lw = 36;
        const lh = (lw * 242) / 800;
        doc.addImage(logoData, "PNG", 148 - lw / 2, 22, lw, lh);
        page2Y = 22 + lh + 10;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text("Badges Earned in AKMIND Demo", 148, page2Y, {
        align: "center",
      });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      let badgeY = page2Y + 12;
      const slugList = user.earnedBadges ?? [];
      for (const slug of slugList) {
        const b = DEMO_BADGES.find((def) => def.slug === slug);
        if (!b) continue;
        const line = `• ${b.icon} ${b.name} — ${b.description}`;
        const wrapped = doc.splitTextToSize(line, 248);
        if (badgeY + wrapped.length * 5.5 > 175) {
          doc.addPage("a4", "landscape");
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, 297, 210, "F");
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(18, 18, 261, 174, 5, 5, "F");
          badgeY = 28;
        }
        doc.text(wrapped, 28, badgeY);
        badgeY += wrapped.length * 5.5 + 3;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Complete the full ${courseName} program to earn 30+ badges`,
        148,
        192,
        { align: "center" }
      );

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

  const xp = user.xp ?? 0;
  const childName = user.childName || "Explorer";
  const earnedBadgesFromSlugs = (user.earnedBadges ?? [])
    .map((slug) => DEMO_BADGES.find((b) => b.slug === slug))
    .filter((b): b is (typeof DEMO_BADGES)[number] => b != null);

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-100">
      <section className="relative px-4 py-8 sm:py-12">
        <div className="complete-confetti-layer">{confetti}</div>
        <div
          className="demo-complete-main-card relative z-10 mx-auto max-w-[820px] rounded-3xl border p-8 sm:p-12"
          style={{
            background: "rgba(15,20,50,0.8)",
            borderColor: "rgba(99,102,241,0.25)",
            backdropFilter: "blur(24px)",
          }}
        >
          {isPreview ? (
            <div className="mb-6 rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-3 text-center text-sm text-amber-100">
              <strong>Admin preview</strong> — same completion screen learners see after
              lesson 3 (confetti + layout). PDF download uses preview sample data.
              {showLaunchJuneCard ? (
                <>
                  {" "}
                  The <strong>Launching June 2026</strong> card is only visible here (not
                  on the live learner flow).
                </>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-3">
            <Image
              src={BRAND_WORDMARK_PATH}
              alt="AKMIND"
              width={240}
              height={73}
              priority
              className="h-10 w-auto max-w-[min(240px,85vw)] object-contain sm:h-11"
            />
            <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full">
              <Trophy
                className="h-[72px] w-[72px] text-amber-400"
                style={{
                  filter: "drop-shadow(0 0 32px rgba(245,158,11,0.4))",
                }}
              />
            </div>
          </div>

          <h1
            className="font-display mt-4 text-center text-4xl font-extrabold sm:text-5xl"
            style={{
              background: "linear-gradient(135deg, #FFFFFF, #67E8F9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            You&apos;ve completed your {courseName} Demo!
          </h1>
          <p className="mt-3 text-center text-slate-400">
            {childName}, you finished every lesson in your {courseName} demo — well done!
          </p>

          <motion.div
            className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-3"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          >
            {[
              {
                big: `${xp}`,
                label: "Points",
                icon: <Zap className="h-4 w-4 text-cyan-300" />,
                mono: true,
              },
              { big: "3/3", label: "Lessons", icon: <span>📚</span>, mono: true },
              { big: certDate, label: "Date", icon: <span>📅</span>, mono: false },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
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
                <p className={`text-base font-bold text-white sm:text-xl ${s.mono ? "font-mono" : ""}`}>{s.big}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="mx-auto mt-8 max-w-2xl">
            <h2 className="font-display mb-4 border-l-4 border-indigo-500 pl-3 text-lg font-bold text-white">
              🏅 Your Badges
            </h2>
            {earnedBadgesFromSlugs.length > 0 ? (
              <div className="flex flex-row flex-wrap justify-center gap-3">
                {earnedBadgesFromSlugs.map((badge) => (
                  <div
                    key={badge.slug}
                    className="w-[140px] rounded-xl border border-amber-400/45 bg-[#0f172a]/90 p-4 text-center shadow-lg shadow-amber-900/10 sm:w-[160px]"
                  >
                    <div className="text-4xl" aria-hidden>
                      {badge.icon}
                    </div>
                    <p className="mt-2 font-semibold text-amber-300">
                      {badge.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-slate-500">
                Complete lessons to earn badges
              </p>
            )}
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
            <p className="font-display mt-3 text-xl font-black text-white sm:text-2xl">
              {fullCourseLine(courseName)}
            </p>
            <p className="mt-2 text-sm text-slate-300">{STAY_TUNED_LINE}</p>
          </div>

          {showLaunchJuneCard ? (
            <div
              className="mx-auto mt-8 max-w-xl rounded-2xl border p-6 text-center sm:p-8"
              style={{
                background:
                  "linear-gradient(145deg, rgba(129,140,248,0.18), rgba(6,182,212,0.1))",
                borderColor: "rgba(129,140,248,0.45)",
                boxShadow:
                  "0 12px 48px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">
                Full {courseName} program
              </p>
              <p className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Launching June 2026
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Complete curriculum, live mentorship, and the full badge journey — rolling
                out next summer. Demo graduates get first access when doors open.
              </p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-cyan-300/90">
                Save the date · akmind.com
              </p>
            </div>
          ) : null}

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
              <div className="relative mx-auto mb-3 flex justify-center">
                <Image
                  src={BRAND_WORDMARK_PATH}
                  alt="AKMIND"
                  width={200}
                  height={61}
                  className="h-10 w-auto max-w-[200px] object-contain opacity-95"
                />
              </div>
              <p className="relative my-3 text-7xl drop-shadow-lg">🏅</p>
              <p className="font-display relative text-3xl font-black tracking-tight text-white">
                {demoCompleteBadgeTitle}
              </p>
              <p className="relative mt-1 text-[11px] font-semibold tracking-[0.28em] text-cyan-400">
                DEMO CERTIFICATE OF COMPLETION
              </p>
              <div className="relative mx-auto my-5 h-px w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
              <p className="relative text-xl font-bold text-slate-100">{childName}</p>
              <p className="relative mt-3 text-xs leading-relaxed text-slate-400">
                Completed all three {courseName} demo lessons · {certDate}
              </p>
              <p className="relative mt-4 text-sm font-semibold text-cyan-300">
                {fullCourseLine(courseName)}
              </p>
              <p className="relative mt-1 text-xs text-slate-500">{STAY_TUNED_LINE}</p>
            </div>
            <button
              type="button"
              disabled={badgeDownloading}
              className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-orange-500/15 px-8 py-3.5 font-bold text-amber-100 shadow-lg shadow-amber-900/20 hover:from-amber-500/30 hover:to-orange-500/25 disabled:opacity-60"
              onClick={() => void downloadBadge()}
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
