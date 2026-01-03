"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Superhero-themed toggle
 * Light mode: Miles Morales (Spider-Man)
 * Dark mode: Iron Man
 */
export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full bg-muted",
          className
        )}
      >
        <span className="h-5 w-5 rounded-full bg-muted-foreground/20" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative h-10 w-10 rounded-full transition-all duration-300",
        "flex items-center justify-center overflow-hidden",
        "active:scale-95",
        isDark
          ? "bg-ironman.metal border-iron-gold border-2"
          : "border-2 border-spider-black bg-spider-red",
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Spider-Man icon (light mode) */}
      <svg
        viewBox="0 0 24 24"
        className={cn(
          "absolute h-5 w-5 transition-all duration-300",
          isDark ? "rotate-180 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
        fill="white"
      >
        {/* Spider symbol */}
        <path d="M12 2C12 2 10 6 10 8C10 10 12 12 12 12C12 12 14 10 14 8C14 6 12 2 12 2Z" />
        <path
          d="M12 12L4 8M12 12L20 8M12 12L8 20M12 12L16 20M12 12L4 16M12 12L20 16"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="12" cy="12" r="2" fill="white" />
      </svg>

      {/* Iron Man icon (dark mode) - Arc Reactor */}
      <div
        className={cn(
          "absolute transition-all duration-300",
          isDark ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
      >
        {/* Arc reactor glow effect */}
        <div
          className={cn(
            "h-6 w-6 rounded-full",
            "bg-gradient-to-br from-cyan-400 to-blue-500",
            isDark && "animate-arc-pulse"
          )}
        >
          <div className="absolute inset-1 rounded-full bg-cyan-200/80" />
          <div className="absolute inset-2 rounded-full bg-cyan-100/90" />
        </div>
      </div>
    </button>
  );
}

/**
 * Enhanced theme toggle with label
 */
export function ThemeToggleWithLabel({ className }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="skeleton-hero h-10 w-10 rounded-full bg-muted" />
        <div className="skeleton-hero h-4 w-20 rounded bg-muted" />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors",
        "hover:bg-accent",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <ThemeToggle />
      <div>
        <p className="font-medium">{isDark ? "Iron Man Mode" : "Spider-Verse Mode"}</p>
        <p className="text-xs text-muted-foreground">
          {isDark ? "Dark theme with arc reactor effects" : "Light theme with web patterns"}
        </p>
      </div>
    </div>
  );
}

export default ThemeToggle;
