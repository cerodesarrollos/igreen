import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#34C759",
        "primary-dark": "#006e28",
        surface: "#F5F5F7",
        "cool-grey": "#94a3b8",
        "on-surface": "#1a1c1d",
        "on-surface-variant": "#3d4a3c",
        // Dark theme
        dark: {
          bg:      "#0f1117",
          surface: "#1a1d27",
          card:    "#1e2130",
          border:  "#2a2d3e",
          muted:   "#3a3d52",
        },
        violet: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
