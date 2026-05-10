/**
 * Read env at runtime on serverless hosts (e.g. Amplify).
 * Next.js may replace static `process.env.FOO` at build time; building the key
 * with `join("_")` avoids an empty snapshot when secrets exist only on deploy.
 */
export function serverEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export function serverEnvJoined(parts: readonly string[]): string | undefined {
  return serverEnv(parts.join("_"));
}
