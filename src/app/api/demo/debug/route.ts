import { ok } from "@/lib/api-response";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
export async function GET() {
  const useDynamo = process.env.USE_DYNAMODB;
  const table = process.env.DEMO_USERS_TABLE?.trim() || "akmind-demo-users";
  const region = process.env.AWS_REGION || process.env.REGION || "ap-south-1";
  const keyId = process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY;
  const hasKeyId = Boolean(keyId);
  const hasSecret = Boolean(secretKey);

  const isDynamo =
    useDynamo === "true" ||
    (useDynamo !== "false" && Boolean(process.env.DEMO_USERS_TABLE));

  const envStatus = {
    USE_DYNAMODB: useDynamo ?? "(not set)",
    isDynamo,
    DEMO_USERS_TABLE: table,
    AWS_REGION: region,
    ACCESS_KEY_ID: hasKeyId ? `SET (via ${process.env.AWS_ACCESS_KEY_ID ? "AWS_ACCESS_KEY_ID" : "ACCESS_KEY_ID"})` : "MISSING",
    SECRET_ACCESS_KEY: hasSecret ? `SET (via ${process.env.AWS_SECRET_ACCESS_KEY ? "AWS_SECRET_ACCESS_KEY" : "SECRET_ACCESS_KEY"})` : "MISSING",
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
        accessKeyId: keyId!,
        secretAccessKey: secretKey!,
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
