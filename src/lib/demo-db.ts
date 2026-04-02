import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

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
const TABLE =
  process.env.DEMO_USERS_TABLE ||
  process.env.DYNAMODB_DEMO_TABLE ||
  "akmind-demo-users";
const HAS_TABLE_CONFIG = Boolean(
  process.env.DEMO_USERS_TABLE || process.env.DYNAMODB_DEMO_TABLE
);
const IS_DYNAMO =
  process.env.USE_DYNAMODB === "true" ||
  (process.env.USE_DYNAMODB !== "false" && HAS_TABLE_CONFIG);

const getDb = () => {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-south-1",
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
};

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
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

/** Normalize tokens from input, URL, or cookies (trim + lowercase hex). */
export function normalizeDemoToken(token: string): string {
  return token.trim().toLowerCase();
}

export async function createDemoUser(data: CreateDemoUserInput): Promise<DemoUser> {
  const user: DemoUser = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    demoToken: data.demoToken.toLowerCase().trim(),
  };

  if (!IS_DYNAMO) {
    const users = readUsers();
    users.push(user);
    writeUsers(users);
    return user;
  }

  await getDb().send(
    new PutCommand({
      TableName: TABLE,
      Item: user,
    })
  );
  return user;
}

export async function getDemoUserByEmail(email: string): Promise<DemoUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!IS_DYNAMO) {
    return (
      readUsers().find((u) => u.email === normalizedEmail) ?? null
    );
  }
  try {
    const res = await getDb().send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "email-index",
        KeyConditionExpression: "email = :e",
        ExpressionAttributeValues: { ":e": normalizedEmail },
        Limit: 1,
      })
    );
    return (res.Items?.[0] as DemoUser) || null;
  } catch (error) {
    console.warn("email-index query failed, falling back to table scan", error);
    const scan = await getDb().send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "email = :e",
        ExpressionAttributeValues: { ":e": normalizedEmail },
        Limit: 1,
      })
    );
    return (scan.Items?.[0] as DemoUser) || null;
  }
}

export async function getDemoUserByToken(token: string): Promise<DemoUser | null> {
  const normalizedToken = normalizeDemoToken(token);
  if (!normalizedToken) return null;
  if (!IS_DYNAMO) {
    return (
      readUsers().find((u) => u.demoToken === normalizedToken) ?? null
    );
  }
  try {
    const res = await getDb().send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "token-index",
        KeyConditionExpression: "demoToken = :t",
        ExpressionAttributeValues: { ":t": normalizedToken },
        Limit: 1,
      })
    );
    return (res.Items?.[0] as DemoUser) || null;
  } catch (error) {
    console.warn("token-index query failed, falling back to table scan", error);
    const scan = await getDb().send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "demoToken = :t",
        ExpressionAttributeValues: { ":t": normalizedToken },
        Limit: 1,
      })
    );
    return (scan.Items?.[0] as DemoUser) || null;
  }
}

export async function updateDemoUser(
  id: string,
  updates: Partial<Omit<DemoUser, "id" | "createdAt">>
): Promise<void> {
  if (!IS_DYNAMO) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      writeUsers(users);
    }
    return;
  }

  const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const expr = "SET " + entries.map((_, i) => `#f${i} = :v${i}`).join(", ");
  const names = Object.fromEntries(entries.map(([k], i) => [`#f${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

  await getDb().send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export async function hasUsedDemo(email: string): Promise<boolean> {
  return (await getDemoUserByEmail(email)) !== null;
}

const ADMIN_DEV_TOKEN = "admin-akmind-dev-2026";

export async function getOrCreateAdminUser(): Promise<DemoUser> {
  const existing = await getDemoUserByToken(ADMIN_DEV_TOKEN);
  if (existing) return existing;

  return createDemoUser({
    email: "admin@akmind.com",
    name: "Admin",
    childName: "AX",
    phone: "0000000000",
    demoToken: ADMIN_DEV_TOKEN,
    demoStarted: false,
    demoCompleted: false,
    lessonsComplete: [],
    quizScores: {},
    xp: 0,
    badgeEarned: false,
  });
}
