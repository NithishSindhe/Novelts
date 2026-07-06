import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)"
        },
        accent: {
          DEFAULT: "var(--accent)",
          fg: "var(--accent-fg)",
          soft: "var(--accent-soft)",
          border: "var(--accent-border)"
        },
        success: "var(--success)",
        danger: "var(--danger)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" }
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "modal-out": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(8px) scale(0.96)" }
        },
        "sheet-in": {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "sheet-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(100%)" }
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateX(16px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" }
        },
        "toast-out": {
          "0%": { opacity: "1", transform: "translateX(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateX(16px) scale(0.96)" }
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "expand-in": {
          "0%": { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        }
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "fade-out": "fade-out 180ms ease-in both",
        "modal-in": "modal-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "modal-out": "modal-out 180ms cubic-bezier(0.4, 0, 1, 1) both",
        "sheet-in": "sheet-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "sheet-out": "sheet-out 220ms cubic-bezier(0.4, 0, 1, 1) both",
        "toast-in": "toast-in 260ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-out": "toast-out 200ms cubic-bezier(0.4, 0, 1, 1) both",
        "rise-in": "rise-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "expand-in": "expand-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both"
      }
    }
  },
  plugins: []
};

export default config;
