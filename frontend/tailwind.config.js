/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
      },
      fontFamily: {
        sans: ["Segoe UI", "Nunito", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(14, 165, 233, 0.12)",
        bubble: "0 1px 3px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
