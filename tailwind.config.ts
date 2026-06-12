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
          DEFAULT: "#141414",
          soft: "#3f3f3f",
          muted: "#5f5f5b",
        },
        muted: {
          DEFAULT: "#777773",
          light: "#9a9a94",
          lighter: "#bdbdb7",
        },
        line: {
          DEFAULT: "#deded9",
          light: "#ecece8",
        },
        canvas: {
          DEFAULT: "#f7f7f5",
          alt: "#f3f3f1",
          elevated: "#ffffff",
        },
        brand: {
          50: "#f3f3f1",
          100: "#e8e8e4",
          200: "#d4d4ce",
          300: "#adada6",
          400: "#85857e",
          500: "#62625d",
          600: "#484844",
          700: "#30302d",
          800: "#20201e",
          900: "#111110",
        },
        coral: {
          50: "#fff4f2",
          100: "#ffe2de",
          400: "#e97163",
          500: "#d85849",
          600: "#b84034",
          700: "#92342c",
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
        panel: "0 1px 2px rgba(0,0,0,0.025)",
        card: "0 1px 2px rgba(0,0,0,0.025)",
        elevated: "0 8px 30px rgba(0,0,0,0.06)",
        nav: "0 18px 50px rgba(0,0,0,0.14)",
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
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
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
