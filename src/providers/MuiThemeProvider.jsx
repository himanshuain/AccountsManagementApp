"use client";

import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";

export function MuiProvider({ children }) {
  const { theme: nextTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = useMemo(() => {
    const isDark = mounted && (nextTheme === "dark" || resolvedTheme === "dark");

    return createTheme({
      palette: {
        mode: isDark ? "dark" : "light",
        primary: {
          main: isDark ? "#60a5fa" : "#3b82f6",
        },
        background: {
          default: isDark ? "#0c0f14" : "#f8fafc",
          paper: isDark ? "#151a22" : "#ffffff",
        },
        text: {
          primary: isDark ? "#f1f5f9" : "#0f172a",
          secondary: isDark ? "#94a3b8" : "#64748b",
        },
      },
      typography: {
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
            },
          },
        },
      },
    });
  }, [nextTheme, resolvedTheme, mounted]);

  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
}
