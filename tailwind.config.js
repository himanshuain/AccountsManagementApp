/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-bebas)", "var(--font-dm-sans)", "system-ui", "sans-serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
        accent: ["var(--font-permanent-marker)", "cursive"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Superhero Theme Colors
        spider: {
          red: "#E62429",
          black: "#1A1A2E",
          pink: "#FF4D6D",
          web: "#2D2D44",
        },
        ironman: {
          gold: "#B8860B",
          red: "#8B0000",
          cyan: "#00D4FF",
          metal: "#2D1810",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "web-pattern": "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L30 60M0 30L60 30M0 0L60 60M60 0L0 60' stroke='%23E62429' stroke-width='0.5' fill='none' opacity='0.1'/%3E%3C/svg%3E\")",
        "hex-pattern": "url(\"data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9z' fill='%23B8860B' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E\")",
        "metallic-gradient": "linear-gradient(135deg, #2D1810 0%, #4A2A1F 25%, #2D1810 50%, #4A2A1F 75%, #2D1810 100%)",
        "arc-glow": "radial-gradient(circle, rgba(0,212,255,0.3) 0%, rgba(0,212,255,0) 70%)",
      },
      animation: {
        glitch: "glitch 0.3s ease-in-out",
        "arc-pulse": "arcPulse 2s ease-in-out infinite",
        "web-swing": "webSwing 0.5s ease-out",
        "metal-shine": "metalShine 3s ease-in-out infinite",
      },
      keyframes: {
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
        },
        arcPulse: {
          "0%, 100%": { boxShadow: "0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 15px #00D4FF" },
          "50%": { boxShadow: "0 0 10px #00D4FF, 0 0 20px #00D4FF, 0 0 30px #00D4FF" },
        },
        webSwing: {
          "0%": { transform: "translateY(-20px) rotate(-5deg)", opacity: "0" },
          "100%": { transform: "translateY(0) rotate(0)", opacity: "1" },
        },
        metalShine: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
