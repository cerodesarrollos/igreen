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
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        lg: "1.5rem",
        xl: "2rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
export default config;
