import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "pos-wide": "960px",
      "waiter-wide": "768px",
      "nav-desktop": "1024px",
      "pos-nav-desktop": "1280px",
    },
    extend: {
      colors: {
        background: "#eceef1",
        foreground: "#393a3d",
        primary: "#2ca01c",
        secondary: "#0077c5",
      },
      boxShadow: {
        panel: "0 8px 32px 0 rgba(0, 0, 0, 0.1)",
      },
      fontFamily: {
        arabic: ["Noto Naskh Arabic", "Scheherazade New", "Tahoma", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
