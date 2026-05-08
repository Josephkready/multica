/** @type {import('tailwindcss').Config} */
// Token values transcribed once from packages/ui/styles/tokens.css (OKLCH → HSL).
// See _features/ios-mobile/design-system.md — change web tokens, sync here.
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(0 0% 100%)",
        foreground: "hsl(240 10% 4%)",
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(240 10% 4%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(240 10% 4%)",
        },
        primary: {
          DEFAULT: "hsl(240 6% 10%)",
          foreground: "hsl(0 0% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(240 5% 96%)",
          foreground: "hsl(240 6% 10%)",
        },
        muted: {
          DEFAULT: "hsl(240 5% 96%)",
          foreground: "hsl(240 4% 46%)",
        },
        accent: {
          DEFAULT: "hsl(240 5% 96%)",
          foreground: "hsl(240 6% 10%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84% 60%)",
          foreground: "hsl(0 0% 98%)",
        },
        border: "hsl(240 6% 90%)",
        input: "hsl(240 6% 90%)",
        ring: "hsl(240 5% 64%)",
        brand: {
          DEFAULT: "hsl(220 60% 50%)",
          foreground: "hsl(0 0% 98%)",
        },
        success: "hsl(140 50% 40%)",
        warning: "hsl(45 80% 55%)",
        info: "hsl(220 60% 50%)",
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
    },
  },
  plugins: [],
};
