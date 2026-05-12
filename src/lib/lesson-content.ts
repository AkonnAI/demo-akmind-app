export const LESSON_SUMMARIES: Record<
  string,
  {
    title: string;
    keyPoints: string[];
    indianExample: string;
    nextLesson: string;
  }
> = {
  "1-1": {
    title: "What is Artificial Intelligence?",
    keyPoints: [
      "AI is machines that can learn and make decisions",
      "AI learns from data just like humans learn from experience",
      "Narrow AI does one thing well — like Alexa or Google Maps",
      "We are far from general AI that thinks like humans",
    ],
    indianExample:
      "Swiggy recommends your next order using AI that learned from millions of orders across India",
    nextLesson: "History of AI — From Dreams to Machines",
  },
  "1-2": {
    title: "History of AI — From Dreams to Machines",
    keyPoints: [
      "Alan Turing invented the idea of machine thinking in 1950",
      "Deep Blue beat chess champion Kasparov in 1997",
      "AlphaGo beat the world Go champion in 2016",
      "ChatGPT launched in 2022 and changed everything",
    ],
    indianExample:
      "ISRO uses AI to navigate satellites — the same technology evolution we studied today",
    nextLesson: "AI vs Humans — What Can AI Do and Not Do?",
  },
  "1-3": {
    title: "AI vs Humans — Strengths and Limits",
    keyPoints: [
      "AI is superhuman at pattern recognition and speed",
      "AI cannot feel emotions or understand context like humans",
      "AI makes mistakes when given data it has never seen",
      "Humans and AI together are stronger than either alone",
    ],
    indianExample:
      "A radiologist in Mumbai uses AI to spot cancer in X-rays 40x faster — but the final decision is human",
    nextLesson: "Types of AI — Narrow, General and Super AI",
  },
  "1-4": {
    title: "Types of AI",
    keyPoints: [
      "Narrow AI: does one specific task extremely well",
      "General AI: thinks across all domains like humans — does not exist yet",
      "Super AI: smarter than all humans combined — science fiction for now",
      "95% of AI today is narrow AI",
    ],
    indianExample:
      "Google Pay fraud detection is narrow AI — brilliant at one thing, useless at everything else",
    nextLesson: "AI Around Us — Assistants, Recommendations and Maps",
  },
  "1-11": {
    title: "Variables — Storing What You Know",
    keyPoints: [
      "Variables are containers that store data in a program",
      "In Python you create a variable with a name and assign a value using =",
      "Variables can hold numbers, text, and other data types",
      "AI models use millions of variables called parameters to store what they have learned",
    ],
    indianExample:
      "A billing app in Bengaluru stores your name and UPI ID in variables before sending a payment — same idea as named boxes in code",
    nextLesson: "Decisions — Teaching Code to Choose",
  },
  "1-12": {
    title: "Decisions — Teaching Code to Choose",
    keyPoints: [
      "If-else statements let programs choose what to do based on conditions",
      "AI systems classify inputs by checking conditions and picking an output",
      "Decision trees in machine learning branch left or right based on features in the data",
      "Clear conditions make programs predictable and easier to debug",
    ],
    indianExample:
      "IRCTC waitlist logic is like an if-else chain: if a seat opens, book it; else try the next train — programs follow the same branching idea",
    nextLesson: "Loops — Making Code Work Smarter",
  },
  "1-13": {
    title: "Loops — Making Code Work Smarter",
    keyPoints: [
      "Loops repeat a block of code many times without writing it again",
      "For loops walk through a sequence; while loops run until a condition becomes false",
      "AI training loops over thousands of examples, adjusting parameters each pass to reduce error",
      "Loops save time and keep code short when work is repetitive",
    ],
    indianExample:
      "SMS OTP spam filters scan millions of messages in a loop each night — similar to how training cycles through rows of data again and again",
    nextLesson: "Continue with the full AI Builders curriculum when you join the program",
  },
};

export function getLessonSummary(moduleId: number, lessonId: number) {
  const key = `${moduleId}-${lessonId}`;
  return LESSON_SUMMARIES[key] || null;
}

export function getModuleSummary(moduleId: number) {
  const MODULE_SUMMARIES: Record<number, string> = {
    1: "Module 1 covers what AI is, its history from Turing to ChatGPT, how AI compares to human intelligence, and the different types of AI systems. Students learn that most AI today is narrow — brilliant at one task but limited beyond it.",
    2: "Module 2 is all about data — the raw material that powers AI. Students learn how data is collected, cleaned, and visualized. They discover that without quality data, even the best AI algorithm fails.",
    3: "Module 3 introduces machine learning — how computers learn from examples without being explicitly programmed. Students explore supervised learning, unsupervised learning, and reinforcement learning through hands-on games.",
    4: "Module 4 puts tools in students hands. They build real AI projects using Teachable Machine, ML for Kids, Scratch, and ChatGPT — no code required. By the end every student has built their first AI model.",
    5: "Module 5 tackles the harder questions — AI ethics, bias in algorithms, privacy concerns, and what a responsible AI future looks like. Students debate real cases and form their own views.",
    6: "Module 6 is the capstone — students present their own AI project to peers and judges, demonstrating everything learned across Phase 1.",
  };
  return (
    MODULE_SUMMARIES[moduleId] ||
    "This module covers important AI concepts as part of the Akmind curriculum."
  );
}
