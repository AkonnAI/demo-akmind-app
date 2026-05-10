/**
 * Amplify Hosting passes env vars to the Next.js build process but NOT to the
 * Lambda runtime. next.config.ts `env` block bakes them in at build time via
 * static `process.env.FOO` accesses (which Next.js replaces with literals).
 * Dynamic `process.env[key]` lookups are NOT replaced, so they return undefined
 * at Lambda runtime. This snapshot uses static access so Next.js inlines the
 * values, then serverEnv falls back to it when the dynamic lookup misses.
 */
const ENV_SNAPSHOT: Record<string, string | undefined> = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL_ID: process.env.GROQ_MODEL_ID,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID: process.env.ELEVENLABS_MODEL_ID,
};

export function serverEnv(name: string): string | undefined {
  const v = process.env[name] ?? ENV_SNAPSHOT[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export function serverEnvJoined(parts: readonly string[]): string | undefined {
  return serverEnv(parts.join("_"));
}
