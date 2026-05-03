/** @type {import('tailwindcss').Config} */
const withVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: withVar("--c-bg"),
          alt: withVar("--c-bg-alt"),
          elev: withVar("--c-bg-elev"),
          card: withVar("--c-bg-card"),
          line: withVar("--c-bg-line"),
          subtle: withVar("--c-bg-subtle"),
        },
        ink: {
          DEFAULT: withVar("--c-ink"),
          soft: withVar("--c-ink-soft"),
          mute: withVar("--c-ink-mute"),
          dim: withVar("--c-ink-dim"),
          faint: withVar("--c-ink-faint"),
        },
        accent: {
          DEFAULT: withVar("--c-accent"),
          hover: withVar("--c-accent-hover"),
          soft: withVar("--c-accent-soft"),
          tint: withVar("--c-accent-tint"),
        },
        good: withVar("--c-good"),
        bad: withVar("--c-bad"),
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        serif: [
          "Source Serif 4",
          "ui-serif",
          "Georgia",
          "serif",
        ],
      },
      boxShadow: {
        card: "0 1px 0 rgb(0 0 0 / 0.04)",
        soft: "0 2px 12px -6px rgb(0 0 0 / 0.10)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};
