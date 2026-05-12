import Groq from "groq-sdk";
import { unstable_noStore as noStore } from "next/cache";
import { NextRequest } from "next/server";
import { getLessonSummary, getModuleSummary } from "@/lib/lesson-content";
import {
  buildDemoLiveStats,
  type DemoLiveStats,
} from "@/lib/demo-nova-stats";
import { serverEnvJoined } from "@/lib/server-env";

/** Amplify / serverless: keep handler on Node; env reads at request time. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let groqSingleton: Groq | null = null;
let groqSingletonKey: string | null = null;

function getGroq(): Groq | null {
  const key = serverEnvJoined(["GROQ", "API", "KEY"]);
  if (!key) return null;
  if (!groqSingleton || groqSingletonKey !== key) {
    groqSingleton = new Groq({ apiKey: key });
    groqSingletonKey = key;
  }
  return groqSingleton;
}

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

/** Public health check — open in browser to verify Lambda env (no secrets). */
export async function GET() {
  noStore();
  const groqConfigured = !!serverEnvJoined(["GROQ", "API", "KEY"]);
  const elevenConfigured =
    !!serverEnvJoined(["ELEVENLABS", "API", "KEY"]) &&
    !!serverEnvJoined(["ELEVENLABS", "VOICE", "ID"]);
  return Response.json(
    {
      groqConfigured,
      elevenConfigured,
      hint: groqConfigured
        ? "Groq env visible to this server. If chat still fails, check Groq dashboard / model access."
        : "Server does not see GROQ_API_KEY. In Amplify: add variable for this branch and redeploy (not only preview env).",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const demoMemory: Map<string, Array<{ role: string; content: string }>> =
  new Map();
const MAX_MEMORY = 20;

function extractAskedModuleIndex(message: string): number | null {
  const m = message.match(/\bmodule\s*(\d+)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Digits after "lesson" (e.g. lesson 2, lesson 11). */
function extractAskedLessonNumber(message: string): number | null {
  const m = message.match(/\blesson\s*(\d+)\b/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function wantsLessonRecapFivePoints(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /\b(summarise|summarize|recap)\s+(this\s+)?lesson\b/.test(m) ||
    /\b(this\s+)?lesson\b.*\b(summarise|summarize|recap)\b/.test(m) ||
    /\b(summarise|summarize|recap)\s+lesson\b/i.test(m) ||
    /\bwhat\s+was\s+(this\s+)?lesson\b/.test(m) ||
    /\bwhat\s+was\s+lesson\s*\d+\s*(about)?\b/.test(m) ||
    /\bgive\s+me\s+5\s+points\s+from\s+lesson\b/.test(m) ||
    /\b5\s+points\s+from\s+lesson\b/.test(m) ||
    (/\b5\s+points\b/.test(m) && /\blesson\b/.test(m))
  );
}

function wantsLessonNotesDocument(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /\bnotes\s+for\s+(this\s+)?lesson\b/.test(m) ||
    /\bnotes\s+for\s+lesson\b/.test(m) ||
    /\blesson\s*\d+\s+notes\b/.test(m) ||
    /\blesson\s+notes\b/.test(m) ||
    /\bfull\s+summary\s+of\s+lesson\b/.test(m) ||
    /\bfull\s+summary\s+of\s+(this\s+)?lesson\b/.test(m) ||
    /\bgive\s+me\s+notes\b/.test(m) ||
    /\bdownload\s+notes\b/.test(m) ||
    /\bcan\s+i\s+download\s+notes\b/.test(m)
  );
}

function wantsThisLessonPhrase(message: string): boolean {
  return /\bthis\s+lesson\b/i.test(message);
}

function defaultContentLessonId(
  lessonOrder: number,
  course: "AI Explorers" | "AI Builders" | "AI Innovators" | undefined
): number {
  const lo =
    typeof lessonOrder === "number" && lessonOrder > 0 ? lessonOrder : 1;
  if (course === "AI Builders") {
    if (lo >= 11 && lo <= 13) return lo;
    if (lo >= 1 && lo <= 3) return 10 + lo;
    return 11;
  }
  if (lo >= 11 && lo <= 13) return lo;
  if (lo >= 1 && lo <= 3) return Math.min(4, lo + 1);
  return 2;
}

function toContentLessonId(
  asked: number,
  course: "AI Explorers" | "AI Builders" | "AI Innovators" | undefined
): number | null {
  if (course === "AI Builders") {
    if (asked >= 11 && asked <= 13) return asked;
    if (asked >= 1 && asked <= 3) return 10 + asked;
    return null;
  }
  if (asked >= 1 && asked <= 3) return Math.min(4, asked + 1);
  if (asked >= 11 && asked <= 13) return asked;
  return null;
}

function resolveTargetContentLessonId(
  message: string,
  lessonOrder: number,
  course: "AI Explorers" | "AI Builders" | "AI Innovators" | undefined
): number {
  const explicit = extractAskedLessonNumber(message);
  if (explicit != null) {
    const mapped = toContentLessonId(explicit, course);
    if (mapped != null) return mapped;
  }
  if (wantsThisLessonPhrase(message)) {
    return defaultContentLessonId(lessonOrder, course);
  }
  return defaultContentLessonId(lessonOrder, course);
}

function formatLessonSummaryCanonical(
  course: "AI Explorers" | "AI Builders" | "AI Innovators" | undefined
): string {
  const ids =
    course === "AI Builders" ? ([11, 12, 13] as const) : ([2, 3, 4] as const);
  const parts: string[] = [];
  for (const id of ids) {
    const s = getLessonSummary(1, id);
    if (!s) continue;
    parts.push(
      `### ${s.title} (canonical id ${id})\n` +
        `Key points (from curriculum):\n- ${s.keyPoints.join("\n- ")}\n` +
        `Indian example: ${s.indianExample}\n` +
        `Next lesson (context): ${s.nextLesson}`
    );
  }
  return parts.join("\n\n---\n\n");
}

function buildDemoSystemPrompt(
  name: string,
  currentModule: number,
  currentLesson: string,
  live: DemoLiveStats,
  askedModule: number | null,
  lessonOrder: number,
  course: "AI Explorers" | "AI Builders" | "AI Innovators" | undefined,
  userMessage: string,
  lessonRecapFive: boolean,
  lessonNotesDoc: boolean
): string {
  const summaryModuleId = askedModule ?? currentModule;
  const lo =
    typeof lessonOrder === "number" && lessonOrder > 0 ? lessonOrder : 1;
  const lessonIdForContent =
    askedModule != null
      ? 1
      : lo >= 11 && lo <= 13
        ? lo
        : Math.min(4, lo + 1);
  const moduleSummary = getModuleSummary(summaryModuleId);
  const lessonSummary = getLessonSummary(summaryModuleId, lessonIdForContent);

  const lessonBlock = lessonSummary
    ? `
Current lesson key points:
- ${lessonSummary.keyPoints.join("\n- ")}
Indian example for this lesson: ${lessonSummary.indianExample}
What comes next: ${lessonSummary.nextLesson}
`
    : "";

  const liveBlock = `
LIVE STUDENT DATA RIGHT NOW (demo — use only these numbers):
XP: ${live.xp}
Level: ${live.level}
Streak (lessons in order completed): ${live.streak}
Badges earned: ${live.badges}
Demo modules completed (1 when all 3 lessons done): ${live.modulesCompleted}
Lessons completed in demo: ${live.lessonsCompleted} of 3
Current module: ${live.currentModule}
Module name: ${live.moduleDisplayName}
Recent average quiz score: ${live.recentQuizScore}%
Badges list: ${live.badgeList.length ? live.badgeList.join(", ") : "none yet"}

When the student asks about XP, progress, or scores, use ONLY these values.
Never guess or invent different numbers.
`;

  const lessonKnowledge = `
LESSON CONTENT KNOWLEDGE:
Current module summary (${askedModule != null ? `module ${askedModule}` : `module ${currentModule}`}): ${moduleSummary}
${lessonBlock}
When the student asks for a quick chat summary (not the SPECIAL recap/notes modes), give key points in 2-3 short conversational sentences without lists.
End by mentioning what comes in the next lesson when it fits.
`;

  const demoFacts = `
DEMO PROGRAM:
This is the free Akmind demo with 3 lessons (module 1 style): History of AI, AI vs Humans, Types of AI.
After the demo, students can join the full program — 3 phases, 6 modules each, 180 lessons total.
Pricing hint only if they ask: phases around ₹15,999 each or a full bundle around ₹39,999 (give rounded figures, not a sales pitch).
`;

  const targetContentId = resolveTargetContentLessonId(
    userMessage,
    lo,
    course
  );
  const targetSummary = getLessonSummary(1, targetContentId);
  const targetSummaryBlock = targetSummary
    ? `Title: ${targetSummary.title}
Key points (canonical):
- ${targetSummary.keyPoints.join("\n- ")}
Indian example: ${targetSummary.indianExample}
What comes next: ${targetSummary.nextLesson}`
    : "(No canonical summary found for this lesson id — say so briefly.)";

  const canonicalBundle =
    lessonRecapFive || lessonNotesDoc
      ? formatLessonSummaryCanonical(course)
      : "";

  const specialLessonModesBlock =
    lessonRecapFive || lessonNotesDoc
      ? `
SPECIAL LESSON MODES — these OVERRIDE CRITICAL RULES 1–2 and the usual length limit for THIS reply only when the flag is ACTIVE:

LESSON_RECAP_FIVE: ${lessonRecapFive ? "ACTIVE" : "off"}
LESSON_NOTES_DOC: ${lessonNotesDoc ? "ACTIVE" : "off"}

If BOTH are ACTIVE, follow LESSON_NOTES_DOC only (full markdown notes).

Resolving which lesson they mean:
- Client lesson order (demo route id): ${lo}
- Client currentLesson title string: ${currentLesson || "not provided"}
- Resolved canonical curriculum id (keys in lesson-content like 1-${targetContentId}): ${targetContentId}
- If they said "this lesson" / "summarise this lesson" / similar without a number, use the resolved id above (tied to their current lesson on the page).
- If they said "lesson N", map N to canonical id: Explorers demo 1–3 → curriculum ids 2–4; Builders demo 1–3 slot → 11–13; Builders 11–13 stay as-is.

PRIMARY SOURCE for the target lesson (must not contradict):
${targetSummaryBlock}

FULL CANONICAL SUMMARIES for this demo track (${course ?? "AI Explorers"}) — source of truth; stay faithful:
${canonicalBundle}

When LESSON_RECAP_FIVE is ACTIVE:
- Answer with EXACTLY 5 bullet points (start each line with "- ").
- Each bullet = one key concept from the PRIMARY SOURCE above, plus one short friendly example suitable for ages 11–14.
- If the canonical key points are fewer than five, split or combine ideas so there are still five distinct, accurate bullets grounded in the text.

When LESSON_NOTES_DOC is ACTIVE:
- Answer with structured MARKDOWN using these sections in order:
  ## What you learned
  ## Key concepts
  (Under Key concepts: exactly 5 bullet points "- ")
  ## Code examples
  (2–4 short Python fenced code blocks that match the lesson — variables, if/else, or loops as appropriate; beginner-friendly)
  ## How it connects to AI
  ## Test yourself
  (Exactly 3 quiz-style questions; no answer key unless they ask.)
- Markdown is allowed for this reply only.
`
      : "";

  const defaultBrevityRules =
    !lessonRecapFive && !lessonNotesDoc
      ? `CRITICAL RULES:
1. Maximum 1-2 sentences per response. Never more.
2. No bullet points. No lists. No markdown at all.
3. Never be sarcastic. Never make fun of the student.
4. Never say things like "let's not get ahead of ourselves"
5. Always be encouraging, warm, and supportive.
6. Sound like a caring smart friend not a comedian.
7. Use Indian examples only when they genuinely help explain.
8. Never question or doubt what the student says rudely.
9. VARY responses but always stay warm and helpful.
10. If student says wrong info gently correct with kindness.`
      : `CRITICAL RULES (STANDARD CHAT — also keep tone 3–10 below; rules 1–2 are suspended when a SPECIAL LESSON MODE is ACTIVE):
1. Maximum 1-2 sentences per response when NO special lesson mode is active. Never more in normal chat.
2. No bullet points, lists, or markdown in normal chat. (Exception: active SPECIAL LESSON MODE instructions above.)
3. Never be sarcastic. Never make fun of the student.
4. Never say things like "let's not get ahead of ourselves"
5. Always be encouraging, warm, and supportive.
6. Sound like a caring smart friend not a comedian.
7. Use Indian examples only when they genuinely help explain.
8. Never question or doubt what the student says rudely.
9. VARY responses but always stay warm and helpful.
10. If student says wrong info gently correct with kindness.`;

  const closingTone =
    lessonRecapFive || lessonNotesDoc
      ? "For SPECIAL LESSON MODES, follow the mode instructions fully — be thorough. Otherwise keep replies warm and concise."
      : "Keep it warm. Keep it short. Keep it real.";

  return `You are NOVA — a warm and intelligent AI companion 
for Akmind. You are ${name}'s personal learning guide.

${specialLessonModesBlock}

${defaultBrevityRules}

TONE EXAMPLES:
Student says wrong XP:
BAD: "Nope, let's not get ahead of ourselves like an 
autorickshaw taking a wrong turn."
GOOD: "Your XP is actually 300 right now — you are just 
getting started and every lesson adds more."

When celebrating:
BAD: "Great job! Amazing! Wow!"
GOOD: "That is solid progress — keep that momentum going."

When correcting:
BAD: Any sarcasm or jokes at student expense
GOOD: "Actually it is X — easy to mix up at first."

${liveBlock}

${lessonKnowledge}

${demoFacts}

STUDENT CONTEXT:
Name: ${name}
Current module: ${currentModule}
Current lesson: ${currentLesson || "exploring the demo"}

Always use ${name} naturally in responses.
${closingTone}`;
}

export async function POST(req: NextRequest) {
  noStore();
  try {
    const body = await req.json();
    const {
      message,
      conversationHistory,
      userName,
      childName,
      currentLesson,
      xp,
      lessonsComplete,
      userId,
      currentModule = 1,
      lessonOrder = 1,
      quizScores,
      badgeEarned,
      course,
    } = body as {
      message?: string;
      conversationHistory?: Array<{ role: string; content: string }>;
      userName?: string;
      childName?: string;
      currentLesson?: string;
      xp?: number;
      lessonsComplete?: number | number[];
      userId?: string;
      currentModule?: number;
      lessonOrder?: number;
      quizScores?: Record<string, number> | null;
      badgeEarned?: boolean;
      course?: "AI Explorers" | "AI Builders" | "AI Innovators";
    };

    if (!message?.trim()) {
      return Response.json({ error: "No message" }, { status: 400 });
    }

    if (message.length > 600) {
      return Response.json({ error: "Message too long" }, { status: 400 });
    }

    const memoryKey = userId || userName || "demo_user";
    const existingMemory = demoMemory.get(memoryKey) || [];
    const fullHistory = [
      ...existingMemory,
      ...(conversationHistory || []),
    ].slice(-MAX_MEMORY);

    const name = childName || userName || "there";
    const trimmed = message.trim();
    const askedModule = extractAskedModuleIndex(trimmed);
    const lessonRecapFive = wantsLessonRecapFivePoints(trimmed);
    const lessonNotesDoc = wantsLessonNotesDocument(trimmed);
    const longLessonForm = lessonRecapFive || lessonNotesDoc;

    const live = buildDemoLiveStats({
      xp,
      lessonsComplete,
      currentModule,
      lessonOrder,
      course,
      currentLesson,
      quizScores,
      badgeEarned,
    });

    const systemPrompt = buildDemoSystemPrompt(
      name,
      currentModule,
      currentLesson || "",
      live,
      askedModule,
      typeof lessonOrder === "number" && lessonOrder > 0 ? lessonOrder : 1,
      course,
      trimmed,
      lessonRecapFive,
      lessonNotesDoc
    );

    const groq = getGroq();
    if (!groq) {
      console.error("NOVA: GROQ_API_KEY is missing (set it in Amplify env)");
      return Response.json(
        {
          response:
            "NOVA chat is not configured on this server yet (the host must set GROQ_API_KEY). Your lessons and games still work!",
          error: true,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const groqModel =
      serverEnvJoined(["GROQ", "MODEL", "ID"]) ?? DEFAULT_GROQ_MODEL;

    const completion = await groq.chat.completions.create({
      model: groqModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...fullHistory.slice(-12).map(
          (msg: { role: string; content: string }) => ({
            role:
              msg.role === "nova" ? ("assistant" as const) : ("user" as const),
            content: msg.content,
          })
        ),
        { role: "user", content: trimmed },
      ],
      max_tokens: longLessonForm ? 2200 : 80,
      temperature: 0.15,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Give me a moment and try again!";

    const savedMemory = [
      ...fullHistory,
      { role: "user", content: trimmed },
      { role: "assistant", content: reply },
    ].slice(-MAX_MEMORY);
    demoMemory.set(memoryKey, savedMemory);

    return Response.json(
      { response: reply },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("NOVA demo error:", error);
    return Response.json(
      {
        response: "I am having a little trouble connecting. Try again soon!",
        error: true,
      },
      { status: 200 }
    );
  }
}
