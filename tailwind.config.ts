import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        surface: "#0a0a0a",
        card: "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.08)",
        "text-primary": "#ffffff",
        "text-secondary": "#9ca3af",
        "accent-blue": "#3b82f6",
        "accent-purple": "#8b5cf6",
        "accent-gold": "#f59e0b",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
