import nodemailer from "nodemailer";
import type { DemoUser } from "@/lib/demo-db";
import { DEMO_BADGES } from "@/lib/demo-badges";
import { brandLogoEmailHtml } from "@/lib/brand";
import {
  countDemoLessonsInScope,
  DEMO_LESSON_COUNT,
} from "@/lib/demo-lesson-scope";

// From address uses GMAIL_USER. For production, set GMAIL_USER to hello@akmind.com
// (or your verified domain sender) and use a proper SMTP provider instead of Gmail if needed.

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
  return _transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await getTransporter().sendMail({
      from: `"AKMIND" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error("Email error:", e);
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendDemoCompletionReport(user: DemoUser): Promise<void> {
  try {
    const to = process.env.GMAIL_USER?.trim();
    if (!to) {
      console.error("sendDemoCompletionReport: GMAIL_USER is not set");
      return;
    }
    if (!process.env.GMAIL_APP_PASSWORD) {
      console.error("sendDemoCompletionReport: GMAIL_APP_PASSWORD is not set");
      return;
    }

    const lessonTitles: Record<number, string> = {
      1: "History of AI — From Dreams to Machines",
      2: "AI vs Humans: What Can AI Do?",
      3: "Types of AI: Narrow, General & Super",
    };

    const completedOn = new Date().toLocaleDateString("en-IN");
    const subject = `🎓 Demo Complete — ${user.childName} | ${user.name} | ${user.xp} XP`;

    const lessonPerformanceRows = ([1, 2, 3] as const)
      .map((id) => {
        const done = user.lessonsComplete.includes(id);
        const status = done ? "Completed" : "Pending";
        const raw = user.quizScores[String(id)];
        const quizCell =
          raw !== undefined && Number.isFinite(raw) ? `${raw}%` : "—";
        const bg = id % 2 === 0 ? "background:#1a2235;" : "";
        return `<tr style="${bg}">
      <td style="padding:8px; color:#e2e8f0;">${escapeHtml(lessonTitles[id] ?? `Lesson ${id}`)}</td>
      <td style="padding:8px; color:${done ? "#34d399" : "#94a3b8"};">${status}</td>
      <td style="padding:8px; color:#e2e8f0;">${escapeHtml(quizCell)}</td>
    </tr>`;
      })
      .join("\n");

    const earnedSlugs = Array.isArray(user.earnedBadges) ? user.earnedBadges : [];
    const badgesBlock =
      earnedSlugs.length === 0
        ? `<span style="color:#94a3b8; font-size:14px;">No badges earned</span>`
        : earnedSlugs
            .map((slug) => {
              const def = DEMO_BADGES.find((b) => b.slug === slug);
              const name = def?.name ?? slug;
              const icon = def?.icon ?? "🏅";
              return `<span style="display:inline-block; padding:6px 12px; margin:0 8px 8px 0; border:2px solid #fbbf24; border-radius:999px; background:#1a2235; color:#e2e8f0; font-size:13px;">${escapeHtml(icon)} ${escapeHtml(name)}</span>`;
            })
            .join("");

    const logoBlock = brandLogoEmailHtml();

    const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e2e8f0; padding: 24px; border-radius: 12px;">
${logoBlock}
  <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
    <h1 style="margin:0; color: white; font-size: 22px;">🎓 AKMIND Demo Completed</h1>
    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Completed on ${escapeHtml(completedOn)}</p>
  </div>

  <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding:8px; color:#94a3b8; width:140px;">Child Name</td><td style="padding:8px; color:#e2e8f0; font-weight:bold;">${escapeHtml(user.childName)}</td></tr>
    <tr style="background:#1a2235;"><td style="padding:8px; color:#94a3b8;">Parent Name</td><td style="padding:8px; color:#e2e8f0;">${escapeHtml(user.name)}</td></tr>
    <tr><td style="padding:8px; color:#94a3b8;">Email</td><td style="padding:8px; color:#e2e8f0;">${escapeHtml(user.email)}</td></tr>
    <tr style="background:#1a2235;"><td style="padding:8px; color:#94a3b8;">Phone</td><td style="padding:8px; color:#94a3b8;">${escapeHtml(user.phone)}</td></tr>
    <tr><td style="padding:8px; color:#94a3b8;">Total XP</td><td style="padding:8px; color:#fbbf24; font-weight:bold;">⚡ ${escapeHtml(String(user.xp))} XP</td></tr>
    <tr style="background:#1a2235;"><td style="padding:8px; color:#94a3b8;">Lessons Done</td><td style="padding:8px; color:#e2e8f0;">${countDemoLessonsInScope(user.lessonsComplete)} / ${DEMO_LESSON_COUNT}</td></tr>
  </table>

  <h3 style="color:#6366f1; margin-bottom:12px;">📚 Lesson Performance</h3>
  <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
    <tr style="background:#1a2235;">
      <th style="padding:8px; text-align:left; color:#94a3b8; font-weight:normal;">Lesson</th>
      <th style="padding:8px; text-align:left; color:#94a3b8; font-weight:normal;">Status</th>
      <th style="padding:8px; text-align:left; color:#94a3b8; font-weight:normal;">Quiz Score</th>
    </tr>
    ${lessonPerformanceRows}
  </table>

  <h3 style="color:#fbbf24; margin-bottom:12px;">🏅 Badges Earned</h3>
  <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px;">
    ${badgesBlock}
  </div>

  <div style="background:#1a2235; padding:16px; border-radius:8px; border-left:4px solid #6366f1;">
    <p style="margin:0; color:#94a3b8; font-size:12px;">Sent automatically by AKMIND Demo System · akmind.com</p>
  </div>
</div>`;

    await getTransporter().sendMail({
      from: `"AKMIND" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error("sendDemoCompletionReport error:", e);
  }
}

export async function sendDemoLink(
  email: string,
  name: string,
  childName: string,
  token: string
) {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}?token=${token}`;
  const logoBlock = brandLogoEmailHtml();
  await sendEmail({
    to: email,
    subject: "Your AKMIND Demo Class is Ready!",
    html: `
    <div style="font-family:Arial;max-width:600px;margin:0 auto">
      ${logoBlock}
      <div style="background:#4f46e5;padding:24px 32px;text-align:center;border-radius:12px 12px 0 0">
        <p style="color:#c7d2fe;margin:0;font-size:15px">
          Dream. Discover. Shine.
        </p>
      </div>
      <div style="padding:32px">
        <h2 style="color:#1e293b">Hello ${name}!</h2>
        <p style="color:#475569">
          ${childName}'s demo class is ready. 
          Click below to begin:
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" 
             style="background:#4f46e5;color:white;
                    padding:16px 32px;border-radius:12px;
                    text-decoration:none;font-weight:bold;
                    font-size:16px">
            Start Demo Class →
          </a>
        </div>
        <p style="color:#475569">What's included:</p>
        <ul style="color:#475569;line-height:2">
          <li>✅ Live welcome class recording</li>
          <li>✅ History of AI + story game</li>
          <li>✅ AI vs Humans + story game</li>
          <li>✅ Types of AI + story game</li>
          <li>✅ Quizzes + XP + Demo Badge</li>
        </ul>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          This link is unique to ${name}. 
          One use only.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;
                  text-align:center;color:#94a3b8;
                  font-size:12px">
        AKMIND by AkonnAI LLP, Bengaluru India
      </div>
    </div>`,
  });
}

export async function sendAdminNotification(
  name: string,
  email: string,
  phone: string,
  childName: string,
  token: string
) {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}?token=${token}`;
  const logoBlock = brandLogoEmailHtml();
  await sendEmail({
    to: process.env.ADMIN_EMAIL!,
    subject: `New Demo — ${childName} (${name})`,
    html: `
    <div style="font-family:Arial;max-width:500px">
      ${logoBlock}
      <h2 style="color:#4f46e5">New Demo Booking</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;color:#64748b">
          Parent</td>
          <td style="padding:8px;font-weight:bold">
          ${name}</td></tr>
        <tr><td style="padding:8px;color:#64748b">
          Email</td>
          <td style="padding:8px">${email}</td></tr>
        <tr><td style="padding:8px;color:#64748b">
          Phone</td>
          <td style="padding:8px">${phone}</td></tr>
        <tr><td style="padding:8px;color:#64748b">
          Child</td>
          <td style="padding:8px;font-weight:bold">
          ${childName}</td></tr>
        <tr><td style="padding:8px;color:#64748b">
          Link</td>
          <td style="padding:8px">
          <a href="${link}">${link}</a></td></tr>
      </table>
    </div>`,
  });
}
