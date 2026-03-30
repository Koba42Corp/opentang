/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // OpenTang Design System — Primary Orange
        "ot-orange": {
          900: "#7C2D00",
          800: "#9A3900",
          700: "#C24E00",
          600: "#EA6300",
          500: "#F97316", // Main CTA / active
          400: "#FB923C", // Hover states
          300: "#FDBA74", // Soft accents
          200: "#FED7AA", // Backgrounds, chips
          100: "#FFF7ED", // Surface tints
        },
        // Background surfaces
        "ot-bg": "#0A0A0B",       // App background
        "ot-surface": "#111113",   // Primary surface
        "ot-elevated": "#1A1A1E",  // Cards, panels
        "ot-overlay": "#242428",   // Modals, dropdowns
        // Borders
        "ot-border": "#2E2E34",
        "ot-border-subtle": "#1E1E22",
        // Text
        "ot-text": "#F8F8F8",
        "ot-text-secondary": "#A0A0A8",
        "ot-text-muted": "#606068",
        "ot-text-inverse": "#0A0A0B",
        // Status
        "ot-success": "#22C55E",
        "ot-warning": "#EAB308",
        "ot-error": "#EF4444",
        "ot-info": "#3B82F6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "Consolas", "monospace"],
      },
      keyframes: {
        orangePulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(249, 115, 22, 0)" },
        },
        fadeSlideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "orange-pulse": "orangePulse 1.5s ease-in-out infinite",
        "fade-slide-up": "fadeSlideUp 200ms ease-out",
      },
    },
  },
  plugins: [],
};
