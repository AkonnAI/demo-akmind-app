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
  /** Slugs from `DEMO_BADGES` that the user has earned. */
  earnedBadges: string[];
  createdAt: string;
}

/**
 * Parse stored earnedBadges: JSON string (DynamoDB), plain array (local JSON / legacy),
 * or raw `{ S: string }` if an item is ever handled pre-unmarshall.
 */
function parseEarnedBadges(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (
    typeof raw === "object" &&
    raw !== null &&
    "S" in raw &&
    typeof (raw as { S?: unknown }).S === "string"
  ) {
    raw = (raw as { S: string }).S;
  }
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p)
        ? p.filter((x): x is string => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function withEarnedBadgesDefault(u: DemoUser): DemoUser {
  return {
    ...u,
    earnedBadges: parseEarnedBadges(u.earnedBadges as unknown),
  };
}

export type CreateDemoUserInput = Omit<DemoUser, "id" | "createdAt">;
/** DynamoDB table for demo users — env `DEMO_USERS_TABLE`, default `akmind-demo-users`. */
function getTable(): string {
  return process.env.DEMO_USERS_TABLE?.trim() || "akmind-demo-users";
}
function isDynamo(): boolean {
  const flag = process.env.USE_DYNAMODB;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return Boolean(process.env.DEMO_USERS_TABLE || process.env.DYNAMODB_DEMO_TABLE);
}

const getDb = () => {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
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

  if (!isDynamo()) {
    const users = readUsers();
    users.push(user);
    writeUsers(users);
    return withEarnedBadgesDefault(user);
  }

  await getDb().send(
    new PutCommand({
      TableName: getTable(),
      Item: {
        ...user,
        earnedBadges: JSON.stringify(user.earnedBadges ?? []),
      },
    })
  );
  return withEarnedBadgesDefault(user);
}

export async function getDemoUserByEmail(email: string): Promise<DemoUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!isDynamo()) {
    const row = readUsers().find((u) => u.email === normalizedEmail);
    return row ? withEarnedBadgesDefault(row) : null;
  }
  try {
    const res = await getDb().send(
      new QueryCommand({
        TableName: getTable(),
        IndexName: "email-index",
        KeyConditionExpression: "email = :e",
        ExpressionAttributeValues: { ":e": normalizedEmail },
        Limit: 1,
      })
    );
    const row = res.Items?.[0] as DemoUser | undefined;
    return row ? withEarnedBadgesDefault(row) : null;
  } catch (error) {
    console.warn("email-index query failed, falling back to table scan", error);
    const scan = await getDb().send(
      new ScanCommand({
        TableName: getTable(),
        FilterExpression: "email = :e",
        ExpressionAttributeValues: { ":e": normalizedEmail },
        Limit: 1,
      })
    );
    const row = scan.Items?.[0] as DemoUser | undefined;
    return row ? withEarnedBadgesDefault(row) : null;
  }
}

export async function getDemoUserByToken(token: string): Promise<DemoUser | null> {
  const normalizedToken = normalizeDemoToken(token);
  if (!normalizedToken) return null;
  if (!isDynamo()) {
    const row = readUsers().find((u) => u.demoToken === normalizedToken);
    return row ? withEarnedBadgesDefault(row) : null;
  }
  try {
    const res = await getDb().send(
      new QueryCommand({
        TableName: getTable(),
        IndexName: "token-index",
        KeyConditionExpression: "demoToken = :t",
        ExpressionAttributeValues: { ":t": normalizedToken },
        Limit: 1,
      })
    );
    const row = res.Items?.[0] as DemoUser | undefined;
    return row ? withEarnedBadgesDefault(row) : null;
  } catch (error) {
    console.warn("token-index query failed, falling back to table scan", error);
    const scan = await getDb().send(
      new ScanCommand({
        TableName: getTable(),
        FilterExpression: "demoToken = :t",
        ExpressionAttributeValues: { ":t": normalizedToken },
        Limit: 1,
      })
    );
    const row = scan.Items?.[0] as DemoUser | undefined;
    return row ? withEarnedBadgesDefault(row) : null;
  }
}

export async function updateDemoUser(
  id: string,
  updates: Partial<Omit<DemoUser, "id" | "createdAt">>
): Promise<void> {
  if (!isDynamo()) {
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
  // DynamoDB: persist earnedBadges as a String attribute (JSON array).
  const values = Object.fromEntries(
    entries.map(([k, v], i) => [
      `:v${i}`,
      k === "earnedBadges"
        ? JSON.stringify(Array.isArray(v) ? v : [])
        : v,
    ])
  );

  try {
    await getDb().send(
      new UpdateCommand({
        TableName: getTable(),
        Key: { id: String(id) },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
  } catch (err) {
    console.error("[demo-db] updateDemoUser DynamoDB UpdateItem failed", {
      table: getTable(),
      partitionKey: "id",
      id: String(id),
      fields: entries.map(([k]) => k),
      error: err,
    });
    throw err;
  }
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
    earnedBadges: [],
  });
}
