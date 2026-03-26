import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  childName: string;
  phone: string;
  demoToken: string;
  demoStarted: boolean;
  demoCompleted: boolean;
  lessonsComplete: number[];
  quizScores: Record<string, number>;
  xp: number;
  badgeEarned: boolean;
  createdAt: string;
}

export type CreateDemoUserInput = Omit<DemoUser, "id" | "createdAt">;

function getDataDir(): string {
  const base = process.env.AKMIND_LOCAL_DB_PATH ?? "./data";
  return path.isAbsolute(base) ? base : path.resolve(process.cwd(), base);
}

function getUsersFilePath(): string {
  return path.join(getDataDir(), "demo-users.json");
}

function ensureDataDir(): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readUsers(): DemoUser[] {
  ensureDataDir();
  const file = getUsersFilePath();
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf-8");
    return [];
  }
  const raw = fs.readFileSync(file, "utf-8");
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DemoUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: DemoUser[]): void {
  ensureDataDir();
  fs.writeFileSync(getUsersFilePath(), JSON.stringify(users, null, 2), "utf-8");
}

export function generateDemoToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/** Normalize tokens from input, URL, or cookies (trim + lowercase hex). */
export function normalizeDemoToken(token: string): string {
  return token.trim().toLowerCase();
}

export function createDemoUser(data: CreateDemoUserInput): DemoUser {
  const users = readUsers();
  const user: DemoUser = {
    ...data,
    demoToken: normalizeDemoToken(data.demoToken),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return user;
}

export function getDemoUserByEmail(email: string): DemoUser | null {
  const normalized = email.trim().toLowerCase();
  return readUsers().find((u) => u.email.trim().toLowerCase() === normalized) ?? null;
}

export function getDemoUserByToken(token: string): DemoUser | null {
  const want = normalizeDemoToken(token);
  if (!want) return null;
  return (
    readUsers().find((u) => normalizeDemoToken(u.demoToken) === want) ?? null
  );
}

export function updateDemoUser(
  id: string,
  updates: Partial<Omit<DemoUser, "id" | "createdAt">>
): DemoUser {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    throw new Error(`Demo user not found: ${id}`);
  }
  const updated: DemoUser = { ...users[idx], ...updates };
  users[idx] = updated;
  writeUsers(users);
  return updated;
}

export function hasUsedDemo(email: string): boolean {
  return getDemoUserByEmail(email) !== null;
}
