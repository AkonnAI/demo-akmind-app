import type { DemoUser } from "@/types/demo";
import { allDemoLessonsComplete } from "@/lib/demo-lesson-scope";

export type DemoBadgeDefinition = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  condition: (u: DemoUser) => boolean;
};

export const DEMO_BADGES: readonly DemoBadgeDefinition[] = [
  {
    slug: "first-step",
    name: "First Step",
    description: "Complete your first lesson",
    icon: "🚀",
    condition: (u) => u.lessonsComplete.includes(1),
  },
  {
    slug: "history-hunter",
    name: "History Hunter",
    description: "Complete History of AI lesson",
    icon: "🏛️",
    condition: (u) => u.lessonsComplete.includes(1),
  },
  {
    slug: "ai-vs-human",
    name: "Human vs Machine",
    description: "Complete AI vs Humans lesson",
    icon: "⚡",
    condition: (u) => u.lessonsComplete.includes(2),
  },
  {
    slug: "ai-classifier",
    name: "AI Classifier",
    description: "Complete all 3 demo lessons",
    icon: "🧠",
    condition: (u) => allDemoLessonsComplete(u.lessonsComplete),
  },
];

export function earnedDemoBadges(user: DemoUser): DemoBadgeDefinition[] {
  return DEMO_BADGES.filter((b) => b.condition(user));
}

export function countEarnedDemoBadges(user: DemoUser): number {
  return earnedDemoBadges(user).length;
}
