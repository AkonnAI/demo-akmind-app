import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { getLessonSummary, getModuleSummary } from "@/lib/lesson-content";
import {
  buildDemoLiveStats,
  type DemoLiveStats,
} from "@/lib/demo-nova-stats";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const demoMemory: Map<string, Array<{ role: string; content: string }>> =
  new Map();
const MAX_MEMORY = 20;

function extractAskedModuleIndex(message: string): number | null {
  const m = message.match(/\bmodule\s*(\d+)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildDemoSystemPrompt(
  name: string,
  currentModule: number,
  currentLesson: string,
  live: DemoLiveStats,
  askedModule: number | null,
  lessonOrder: number
): string {
  const summaryModuleId = askedModule ?? currentModule;
  const lessonIdForContent =
    askedModule != null ? 1 : Math.min(4, lessonOrder + 1);
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
Recent average quiz score: ${live.recentQuizScore}%
Badges list: ${live.badgeList.length ? live.badgeList.join(", ") : "none yet"}

When the student asks about XP, progress, or scores, use ONLY these values.
Never guess or invent different numbers.
`;

  const lessonKnowledge = `
LESSON CONTENT KNOWLEDGE:
Current module summary (${askedModule != null ? `module ${askedModule}` : `module ${currentModule}`}): ${moduleSummary}
${lessonBlock}
When the student asks for a summary, give key points in 2-3 short conversational sentences.
Do not use bullet points in your reply. Weave ideas naturally.
End by mentioning what comes in the next lesson when it fits.
`;

  const demoFacts = `
DEMO PROGRAM:
This is the free Akmind demo with 3 lessons (module 1 style): History of AI, AI vs Humans, Types of AI.
After the demo, students can join the full program — 3 phases, 6 modules each, 180 lessons total.
Pricing hint only if they ask: phases around ₹15,999 each or a full bundle around ₹39,999 (give rounded figures, not a sales pitch).
`;

  return `You are NOVA — a warm and intelligent AI companion 
for Akmind. You are ${name}'s personal learning guide.

CRITICAL RULES:
1. Maximum 1-2 sentences per response. Never more.
2. No bullet points. No lists. No markdown at all.
3. Never be sarcastic. Never make fun of the student.
4. Never say things like "let's not get ahead of ourselves"
5. Always be encouraging, warm, and supportive.
6. Sound like a caring smart friend not a comedian.
7. Use Indian examples only when they genuinely help explain.
8. Never question or doubt what the student says rudely.
9. VARY responses but always stay warm and helpful.
10. If student says wrong info gently correct with kindness.

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
Keep it warm. Keep it short. Keep it real.`;
}

export async function POST(req: NextRequest) {
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
    const askedModule = extractAskedModuleIndex(message.trim());

    const live = buildDemoLiveStats({
      xp,
      lessonsComplete,
      currentModule,
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
      typeof lessonOrder === "number" && lessonOrder > 0 ? lessonOrder : 1
    );

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...fullHistory.slice(-12).map(
          (msg: { role: string; content: string }) => ({
            role:
              msg.role === "nova" ? ("assistant" as const) : ("user" as const),
            content: msg.content,
          })
        ),
        { role: "user", content: message },
      ],
      max_tokens: 80,
      temperature: 0.15,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Give me a moment and try again!";

    const savedMemory = [
      ...fullHistory,
      { role: "user", content: message },
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
