import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: "#0a0f1e",
        card: "#111827",
        accent: {
          DEFAULT: "#10b981",
          dark: "#059669",
        },
        danger: "#ef4444",
        muted: "#6b7280",
      },
    },
  },
  plugins: [],
};
export default config;
