import type { DemoUser } from "@/types/demo";

/** Sample completed demo user for admin preview & `/demo/complete-preview`. */
export const DEMO_COMPLETE_PREVIEW_USER: DemoUser = {
  name: "Alex Kim",
  childName: "River Kim",
  course: "AI Explorers",
  email: "preview@akmind.demo",
  phone: "+91 90000 00000",
  lessonsComplete: [1, 2, 3],
  quizScores: { "1": 92, "2": 88, "3": 100 },
  xp: 940,
  badgeEarned: true,
  demoCompleted: true,
  earnedBadges: [
    "first-step",
    "history-hunter",
    "ai-vs-human",
    "ai-classifier",
  ],
};
