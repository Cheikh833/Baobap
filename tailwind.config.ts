import type { Config } from "tailwindcss";

// Palette officielle BAOBAB (docs/design/design-system.md)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#087F68", deep: "#073B3A", 50: "#E8F5F1", 100: "#C9E8DF" },
        navy: "#102A43",
        canvas: "#F7F9F8",
        line: "#E4EAE7",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        info: "#2563EB",
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
