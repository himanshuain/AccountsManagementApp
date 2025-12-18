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
          main: "#3b82f6",
        },
        background: {
          default: isDark ? "#000000" : "#ffffff",
          paper: isDark ? "#1a1a1a" : "#ffffff",
        },
        text: {
          primary: isDark ? "#ffffff" : "#000000",
          secondary: isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
        },
      },
      typography: {
        fontFamily: 'var(--font-outfit), system-ui, sans-serif',
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

  return (
    <MuiThemeProvider theme={theme}>
      {children}
    </MuiThemeProvider>
  );
}

