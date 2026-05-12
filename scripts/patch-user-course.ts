// env must be loaded before any imports that call isDynamo()
import fs from "node:fs";
import path from "node:path";

const envFile = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    process.env[key] = val; // overwrite — don't skip if already set
  }
}

console.log("USE_DYNAMODB:", process.env.USE_DYNAMODB);
console.log("REGION:", process.env.AWS_REGION);
console.log("TABLE:", process.env.DEMO_USERS_TABLE);

// Require after env is loaded
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const TARGET_ID = "fcce6d46-9b34-4b0b-b363-89645458da9e";
const TARGET_COURSE = "AI Builders";
const TABLE = process.env.DEMO_USERS_TABLE ?? "akmind-demo-users";
const REGION = process.env.REGION ?? process.env.AWS_REGION ?? "ap-south-1";
const ACCESS_KEY_ID = process.env.ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY;

async function main() {
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.error("ERROR: ACCESS_KEY_ID or SECRET_ACCESS_KEY missing");
    process.exit(1);
  }

  const client = new DynamoDBClient({
    region: REGION,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  });
  const db = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });

  console.log(`\nPatching id=${TARGET_ID} in table=${TABLE} region=${REGION}`);

  // Update
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: TARGET_ID },
    UpdateExpression: "SET #course = :course",
    ExpressionAttributeNames: { "#course": "course" },
    ExpressionAttributeValues: { ":course": TARGET_COURSE },
  }));
  console.log("UpdateCommand sent.");

  // Verify
  const result = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { id: TARGET_ID },
  }));

  const item = result.Item as Record<string, unknown> | undefined;
  if (!item) {
    console.error("ERROR: GetItem returned nothing — id not found as partition key?");
    process.exit(1);
  }

  console.log("\nVerified row from DynamoDB:");
  console.log("  id:     ", item["id"]);
  console.log("  email:  ", item["email"]);
  console.log("  name:   ", item["name"]);
  console.log("  course: ", item["course"]);

  if (item["course"] === TARGET_COURSE) {
    console.log("\nSUCCESS: course is now", TARGET_COURSE);
  } else {
    console.error("\nFAILED: course is still", item["course"] ?? "(missing)");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
