import type { Config } from "tailwindcss";

// Palette officielle BAOBAB (docs/design/design-system.md)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#087F68", deep: "#073B3A", 50: "#E8F5F1", 100: "#C9E8DF", 300: "#5FC4A8", 400: "#2BA587" },
        navy: { DEFAULT: "#102A43", 800: "#0B1F33", 900: "#071526" },
        ochre: { DEFAULT: "#E3A13B", 50: "#FDF5E7", 600: "#B8781C" },
        canvas: "#F4F7F6",
        line: "#E4EAE7",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        info: "#2563EB",
      },
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ['"Plus Jakarta Sans Variable"', '"Inter Variable"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,42,67,.04), 0 4px 16px -4px rgba(16,42,67,.08)",
        lift: "0 2px 4px rgba(16,42,67,.05), 0 16px 40px -12px rgba(16,42,67,.22)",
        glow: "0 0 0 1px rgba(8,127,104,.15), 0 12px 32px -8px rgba(8,127,104,.35)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        "grow-x": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        "grow-y": { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
        draw: { from: { strokeDashoffset: "var(--dash, 300)" }, to: { strokeDashoffset: "var(--dash-to, 0)" } },
        drift: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "33%": { transform: "translate(4%,-6%) scale(1.08)" }, "66%": { transform: "translate(-5%,4%) scale(.95)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "pop-in": { "0%": { opacity: "0", transform: "translateY(8px) scale(.96)" }, "100%": { opacity: "1", transform: "none" } },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".45" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.2,.7,.2,1) both",
        "fade-in": "fade-in .5s ease-out both",
        float: "float 6s ease-in-out infinite",
        "grow-x": "grow-x 1.1s cubic-bezier(.2,.7,.2,1) both",
        "grow-y": "grow-y 1s cubic-bezier(.2,.7,.2,1) both",
        draw: "draw 1.4s cubic-bezier(.2,.7,.2,1) both",
        drift: "drift 18s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "pop-in": "pop-in .5s cubic-bezier(.2,.7,.2,1) both",
        pulse2: "pulse2 2s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
