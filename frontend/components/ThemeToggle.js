"use client";

import { useTheme } from "@/context/ThemeContext";

/**
 * Sun / moon toggle — works on every page
 */
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <button
        type="button"
        className={`h-9 w-9 rounded-xl border border-sky-100 dark:border-slate-600 ${className}`}
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg transition border shadow-sm
        bg-white/80 hover:bg-sky-50 border-sky-100 text-sky-700
        dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-amber-300
        ${className}`}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
