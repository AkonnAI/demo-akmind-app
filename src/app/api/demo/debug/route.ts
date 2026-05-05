import { fail, ok } from "@/lib/api-response";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_PASSWORD) {
    return fail("Unauthorized", 401);
  }

  const useDynamo = process.env.USE_DYNAMODB;
  const table = process.env.DEMO_USERS_TABLE?.trim() || "akmind-demo-users";
  const region = process.env.AWS_REGION || "ap-south-1";
  const hasKeyId = Boolean(process.env.AWS_ACCESS_KEY_ID);
  const hasSecret = Boolean(process.env.AWS_SECRET_ACCESS_KEY);

  const isDynamo =
    useDynamo === "true" ||
    (useDynamo !== "false" && Boolean(process.env.DEMO_USERS_TABLE));

  const envStatus = {
    USE_DYNAMODB: useDynamo ?? "(not set)",
    isDynamo,
    DEMO_USERS_TABLE: table,
    AWS_REGION: region,
    AWS_ACCESS_KEY_ID: hasKeyId ? "SET" : "MISSING",
    AWS_SECRET_ACCESS_KEY: hasSecret ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
  };

  if (!isDynamo) {
    return ok({ ok: false, reason: "isDynamo=false — writes going to local JSON", envStatus });
  }

  if (!hasKeyId || !hasSecret) {
    return ok({ ok: false, reason: "AWS credentials missing", envStatus });
  }

  let dynamo: { reachable: boolean; itemCount?: number; error?: string };
  try {
    const client = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    const doc = DynamoDBDocumentClient.from(client);

    const tableInfo = await client.send(new DescribeTableCommand({ TableName: table }));
    const itemCount = tableInfo.Table?.ItemCount ?? 0;

    const scan = await doc.send(
      new ScanCommand({ TableName: table, Limit: 3, ProjectionExpression: "id, email, createdAt" })
    );

    dynamo = { reachable: true, itemCount };
    return ok({
      ok: true,
      envStatus,
      dynamo: {
        ...dynamo,
        recentItems: scan.Items ?? [],
      },
    });
  } catch (err) {
    dynamo = {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
    return ok({ ok: false, reason: "DynamoDB call failed", envStatus, dynamo });
  }
}
