import type { Config } from "tailwindcss";
import { colors, borderRadius } from "./src/styles/tokens";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ...colors,
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      borderRadius,
      fontFamily: {
        sans:    ["var(--font-inter)", "Inter", "sans-serif"],
        display: ["var(--font-space-grotesk)", "Space Grotesk", "sans-serif"],
        mono:    ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
