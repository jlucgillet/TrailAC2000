import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B1410",
        surface: "#14201A",
        surfaceRaised: "#1B2A22",
        border: "#24352C",
        ink: "#F5F7F3",
        muted: "#9FB0A6",
        accent: "#8FD14F",
        accentDark: "#6FAE3A",
        amber: "#FFB020",
        danger: "#E5484D",
      },
      fontFamily: {
        display: ["var(--font-barlow-condensed)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
    },
  },
  plugins: [],
};

export default config;
