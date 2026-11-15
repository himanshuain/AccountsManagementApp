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
          main: isDark ? "#fafafa" : "#18181b",
        },
        background: {
          default: isDark ? "#0f0f10" : "#fafafa",
          paper: isDark ? "#161618" : "#ffffff",
        },
        text: {
          primary: isDark ? "#fafafa" : "#18181b",
          secondary: isDark ? "#a1a1aa" : "#71717a",
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
