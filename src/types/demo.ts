export type DemoUser = {
  name: string;
  childName: string;
  email?: string;
  phone?: string;
  lessonsComplete: number[];
  quizScores: Record<string, number>;
  xp: number;
  badgeEarned: boolean;
  demoCompleted: boolean;
  /** Slugs from `DEMO_BADGES` earned so far (server-maintained). */
  earnedBadges: string[];
};
