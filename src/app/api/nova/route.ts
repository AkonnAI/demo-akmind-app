import Groq from "groq-sdk";
import { NextRequest } from "next/server";

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

const DEMO_SYSTEM_PROMPT = `You are NOVA — an AI learning companion
for Akmind, an AI education platform for school students in India.

You are currently in the FREE DEMO experience.
The student has access to 4 free lessons only.

YOUR PERSONALITY:
- Warm, enthusiastic, and genuinely caring
- Explain things simply for students aged 10-15
- Use Indian examples — cricket, Bollywood, Zomato, ISRO
- Keep responses SHORT — 2 to 3 sentences maximum
- Never say "As an AI" — you are NOVA, a living companion
- Always end with an encouraging line or a question
- Make the student excited about AI

WHAT YOU KNOW ABOUT THE DEMO:
- 4 free lessons available: Welcome to AI, History of AI, AI vs Humans, Types of AI
- After completing all 4 lessons students can unlock the full program
- Full program has 60 lessons across 3 programs
- You gently encourage students to complete the demo and upgrade

WHAT YOU HELP WITH:
- Explain any AI concept simply
- Help with quiz questions if stuck
- Summarise lesson content
- Motivate students who are struggling
- Answer parent questions about the program
- Build excitement about the full program

RULES:
- Always use the student name if provided
- Keep responses under 3 sentences
- Never be pushy about upgrading — be helpful first
- If asked about pricing say "Ask your parents to check akmind.com for details"
- Make every interaction feel warm and personal`;

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      conversationHistory,
      userName,
      currentLesson,
      xp,
      lessonsComplete,
    } = await req.json();

    if (!message?.trim()) {
      return Response.json({ error: "No message" }, { status: 400 });
    }

    if (message.length > 500) {
      return Response.json({ error: "Message too long" }, { status: 400 });
    }

    const contextPrompt = `
Student name: ${userName || "there"}
Current lesson: ${currentLesson || "exploring the demo"}
XP earned so far: ${xp || 0}
Lessons completed: ${lessonsComplete || 0} out of 4
`;

    const messages = [
      {
        role: "system" as const,
        content: DEMO_SYSTEM_PROMPT + "\n\nCurrent context:\n" + contextPrompt,
      },
      ...((conversationHistory || []) as { role: string; content: string }[])
        .slice(-8)
        .map((msg) => ({
          role: msg.role === "nova" ? ("assistant" as const) : ("user" as const),
          content: msg.content,
        })),
      { role: "user" as const, content: message },
    ];

    const groq = getGroqClient();
    if (!groq) {
      return Response.json(
        {
          response:
            "NOVA is getting ready. Please try again in a moment.",
          error: true,
        },
        { status: 200 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 150,
      temperature: 0.8,
    });

    const response =
      completion.choices[0]?.message?.content ||
      "I am having a little trouble right now. Try again in a moment!";

    return Response.json({ response });
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
