import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // microphone=(self) allows NOVA voice input on this origin; () alone blocks mic everywhere (breaks Amplify/production).
    value: "camera=(), microphone=(self), geolocation=()",
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig: NextConfig = {
  // Amplify Hosting injects env vars at build time only — not into Lambda runtime.
  // Capturing here bakes them into the server bundle so API routes can read them.
  env: {
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
    GROQ_MODEL_ID: process.env.GROQ_MODEL_ID ?? "",
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ?? "",
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID ?? "",
    ELEVENLABS_MODEL_ID: process.env.ELEVENLABS_MODEL_ID ?? "",
  },
  compress: true,
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 86400,
  },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
