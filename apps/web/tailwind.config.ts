import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // LastGate design system
        "lg-bg": "#0B0E14",
        "lg-surface": "#111827",
        "lg-surface-2": "#1F2937",
        "lg-border": "#1F2937",
        "lg-pass": "#10B981",
        "lg-fail": "#EF4444",
        "lg-warn": "#F59E0B",
        "lg-info": "#3B82F6",
        "lg-neutral": "#6B7280",
        "lg-text": "#F9FAFB",
        "lg-text-secondary": "#9CA3AF",
        "lg-text-muted": "#6B7280",
        "lg-accent": "#8B5CF6",
        // Keep existing shadcn compat
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#8B5CF6",
          foreground: "#ffffff",
        },
        success: { DEFAULT: "#10B981", foreground: "#ffffff" },
        warning: { DEFAULT: "#F59E0B", foreground: "#ffffff" },
        danger: { DEFAULT: "#EF4444", foreground: "#ffffff" },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-live": "pulse-live 2s ease-in-out infinite",
        "count-up": "count-up 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
