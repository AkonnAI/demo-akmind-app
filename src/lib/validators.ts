import { z } from "zod";

export const registerSchema = z.object({
  parentName: z.string().min(2).max(80).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().min(7).max(20).trim(),
  childName: z.string().min(2).max(60).trim(),
  presetToken: z.string().max(64).optional(),
  course: z
    .enum(["AI Explorers", "AI Builders", "AI Innovators"])
    .optional(),
});

export const progressSchema = z.object({
  token: z
    .string()
    .min(8)
    .max(64)
    .trim()
    .transform((s) => s.toLowerCase()),
  lessonId: z
    .number()
    .int()
    .refine(
      (n) =>
        (n >= 1 && n <= 3) || (n >= 11 && n <= 13),
      "lessonId must be 1–3 (Explorers) or 11–13 (Builders)"
    ),
  quizScore: z.number().min(0).max(100).optional(),
  xp: z.number().min(0).max(9999).optional(),
  /** Client snapshot of badge slugs already earned before this POST (for `newBadges` diff). */
  badgesBefore: z.array(z.string()).optional(),
});

export const tokenSchema = z.object({
  token: z.string().min(8).max(64).trim(),
});

export const emailSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
