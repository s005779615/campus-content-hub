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
        ink: "#17211f",
        muted: "#66736f",
        line: "#d9e1de",
        canvas: "#f6f8f7",
        brand: {
          50: "#eefaf7",
          100: "#d7f2ec",
          500: "#13866f",
          600: "#0f705e",
          700: "#0b5d4f"
        },
        coral: {
          50: "#fff4ef",
          500: "#e45f3f",
          600: "#c94c30"
        },
        skyline: {
          50: "#eef7ff",
          500: "#2879b8",
          600: "#1e6499"
        }
      },
      boxShadow: {
        panel: "0 1px 2px rgba(23, 33, 31, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
