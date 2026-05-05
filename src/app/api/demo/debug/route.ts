import { ok } from "@/lib/api-response";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export async function GET() {
  // Raw env reads — no fallbacks, so we see exactly what Lambda has
  const useDynamo      = process.env.USE_DYNAMODB;
  const lambdaFnName   = process.env.AWS_LAMBDA_FUNCTION_NAME;
  const tableRaw       = process.env.DEMO_USERS_TABLE;
  const regionCustom   = process.env.REGION;
  const regionAws      = process.env.AWS_REGION;
  const customKeyId    = process.env.ACCESS_KEY_ID;
  const customSecret   = process.env.SECRET_ACCESS_KEY;
  const lambdaKeyId    = process.env.AWS_ACCESS_KEY_ID;
  const lambdaSecret   = process.env.AWS_SECRET_ACCESS_KEY;

  // Mirror exactly what isDynamo() in demo-db.ts does
  let isDynamoResult: boolean;
  let isDynamoReason: string;
  if (useDynamo === "false") {
    isDynamoResult = false; isDynamoReason = "USE_DYNAMODB=false (explicit opt-out)";
  } else if (useDynamo === "true") {
    isDynamoResult = true; isDynamoReason = "USE_DYNAMODB=true (explicit opt-in)";
  } else if (lambdaFnName) {
    isDynamoResult = true; isDynamoReason = `AWS_LAMBDA_FUNCTION_NAME="${lambdaFnName}" (auto-detected Lambda)`;
  } else {
    isDynamoResult = false; isDynamoReason = "no Lambda env, no USE_DYNAMODB flag → local JSON";
  }

  const keyId     = customKeyId || lambdaKeyId;
  const secretKey = customSecret || lambdaSecret;
  const region    = regionCustom || regionAws || "ap-south-1";
  const table     = tableRaw?.trim() || "akmind-demo-users";

  const envStatus = {
    USE_DYNAMODB:              useDynamo          ?? "(not set)",
    AWS_LAMBDA_FUNCTION_NAME:  lambdaFnName       ?? "(not set)",
    DEMO_USERS_TABLE:          tableRaw           ?? "(not set — using fallback akmind-demo-users)",
    REGION:                    regionCustom       ?? "(not set)",
    AWS_REGION:                regionAws          ?? "(not set)",
    ACCESS_KEY_ID:             customKeyId        ? "SET" : "(not set)",
    SECRET_ACCESS_KEY:         customSecret       ? "SET" : "(not set)",
    AWS_ACCESS_KEY_ID:         lambdaKeyId        ? "SET" : "(not set)",
    AWS_SECRET_ACCESS_KEY:     lambdaSecret       ? "SET" : "(not set)",
    keyIdSource:               customKeyId        ? "ACCESS_KEY_ID" : lambdaKeyId ? "AWS_ACCESS_KEY_ID" : "NONE",
    isDynamo:                  isDynamoResult,
    isDynamoReason,
    NODE_ENV:                  process.env.NODE_ENV,
  };

  if (!isDynamoResult) {
    return ok({ ok: false, reason: isDynamoReason, envStatus });
  }
  if (!keyId) {
    return ok({ ok: false, reason: "No credentials found in ACCESS_KEY_ID or AWS_ACCESS_KEY_ID", envStatus });
  }

  try {
    const client = new DynamoDBClient({
      region,
      // Use custom creds if present; otherwise let SDK chain handle session token
      ...(customKeyId && customSecret
        ? { credentials: { accessKeyId: customKeyId, secretAccessKey: customSecret } }
        : {}),
    });
    const doc = DynamoDBDocumentClient.from(client);

    const tableInfo = await client.send(new DescribeTableCommand({ TableName: table }));
    const scan = await doc.send(
      new ScanCommand({ TableName: table, Limit: 3, ProjectionExpression: "id, email, createdAt" })
    );

    return ok({
      ok: true,
      envStatus,
      dynamo: {
        reachable: true,
        itemCount: tableInfo.Table?.ItemCount ?? 0,
        recentItems: scan.Items ?? [],
      },
    });
  } catch (err) {
    return ok({
      ok: false,
      reason: "DynamoDB call failed",
      envStatus,
      dynamo: {
        reachable: false,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
