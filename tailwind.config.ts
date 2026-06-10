import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0f1729",
          soft: "#1e293b",
          muted: "#475569",
        },
        muted: {
          DEFAULT: "#64748b",
          light: "#94a3b8",
          lighter: "#cbd5e1",
        },
        line: {
          DEFAULT: "#e2e8f0",
          light: "#f1f5f9",
        },
        canvas: {
          DEFAULT: "#f8fafc",
          alt: "#f1f5f9",
          elevated: "#ffffff",
        },
        brand: {
          50: "#f7f7f7",
          100: "#e8e8e8",
          200: "#d4d4d4",
          300: "#a3a3a3",
          400: "#737373",
          500: "#525252",
          600: "#404040",
          700: "#262626",
          800: "#171717",
          900: "#0a0a0a",
        },
        coral: {
          50: "#fafafa",
          100: "#f0f0f0",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
        },
        skyline: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        accent: {
          amber: "#f59e0b",
          violet: "#8b5cf6",
          rose: "#f43f5e",
          teal: "#14b8a6",
          indigo: "#6366f1",
        }
      },
      boxShadow: {
        panel: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)",
        card: "0 1px 6px 0 rgba(0,0,0,0.03), 0 1px 3px -1px rgba(0,0,0,0.02)",
        elevated: "0 4px 12px -2px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)",
        nav: "0 4px 16px -4px rgba(0,0,0,0.06), 0 1px 3px -1px rgba(0,0,0,0.04)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "'PingFang SC'",
          "'Microsoft YaHei'",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      letterSpacing: {
        heading: "-0.02em",
        tightest: "-0.03em",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    }
  },
  plugins: []
};

export default config;
