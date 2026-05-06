import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Manrope", "Inter", "system-ui", "sans-serif"],
        manrope: ["Manrope", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        /* Stitch design system extra tokens */
        "surface-container": "hsl(var(--surface-container))",
        "surface-container-low": "hsl(var(--surface-container-low))",
        "surface-container-high": "hsl(var(--surface-container-high))",
        "on-surface-variant": "hsl(var(--on-surface-variant))",
        emerald: {
          DEFAULT: "#4edea3",
          soft: "#d1fae5",
          dark: "#006c49",
        },
        coral: {
          DEFAULT: "#ba1a1a",
          soft: "#ffdad6",
        },
        navy: {
          DEFAULT: "#0f172a",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#1d4ed8",
          800: "#1e3a5f",
          900: "#0f172a",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        /* ── Coin / money animations ── */
        "coin-bounce": {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "30%":       { transform: "translateY(-12px) scale(1.05)" },
          "60%":       { transform: "translateY(-6px) scale(1.02)" },
        },
        "coin-spin": {
          "0%":   { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
        "float-up": {
          "0%":   { transform: "translateY(0px) translateX(0px)", opacity: "0.75" },
          "50%":  { transform: "translateY(-28px) translateX(8px)", opacity: "0.5" },
          "100%": { transform: "translateY(-56px) translateX(-8px)", opacity: "0" },
        },
        "coin-flip": {
          "0%, 100%": { transform: "rotateY(0deg) scale(1)" },
          "50%":       { transform: "rotateY(180deg) scale(0.85)" },
        },
        "sparkle": {
          "0%, 100%": { opacity: "0", transform: "scale(0.5) rotate(0deg)" },
          "50%":       { opacity: "1", transform: "scale(1) rotate(180deg)" },
        },
        "money-rain": {
          "0%": { transform: "translateY(-10vh) rotate(0deg)" },
          "100%": { transform: "translateY(110vh) rotate(360deg)" }
        },
        "coin-clink": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" }
        },
        "vault-fill": {
          "0%": { strokeDashoffset: "var(--circumference)" },
          "100%": { strokeDashoffset: "var(--offset)" }
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        },
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-down-fade": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(12px)" }
        },
        "fade-in-page": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "fade-out-page": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" }
        },
        "stagger-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(var(--primary), 0.4)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 0 4px rgba(var(--primary), 0)" }
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(4)", opacity: "0" }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "pulse-soft":     "pulse-soft 2s ease-in-out infinite",
        "coin-bounce":    "coin-bounce 2s ease-in-out infinite",
        "coin-spin":      "coin-spin 3s linear infinite",
        "float-up":       "float-up 3.5s ease-in-out infinite",
        "coin-flip":      "coin-flip 2.4s ease-in-out infinite",
        "sparkle":        "sparkle 1.6s ease-in-out infinite",
        "money-rain":     "money-rain 10s linear infinite",
        "coin-clink":     "coin-clink 0.3s ease-in-out",
        "vault-fill":     "vault-fill 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "shimmer":        "shimmer 2s infinite",
        "slide-up-fade":  "slide-up-fade 0.4s ease-out forwards",
        "slide-down-fade":"slide-down-fade 0.3s ease-in forwards",
        "fade-in-page":   "fade-in-page 0.25s ease-out forwards",
        "fade-out-page":  "fade-out-page 0.2s ease-in forwards",
        "stagger-in":     "stagger-in 0.5s ease-out forwards",
        "pulse-glow":     "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ripple":         "ripple 0.6s linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
