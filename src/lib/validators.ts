import { z } from "zod";

export const registerSchema = z.object({
  parentName: z.string().min(2).max(80).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().min(7).max(20).trim(),
  childName: z.string().min(2).max(60).trim(),
  presetToken: z.string().max(64).optional(),
});

export const progressSchema = z.object({
  token: z
    .string()
    .min(8)
    .max(64)
    .trim()
    .transform((s) => s.toLowerCase()),
  lessonId: z.number().int().min(1).max(3),
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
