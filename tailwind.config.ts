// shadcn/ui necesita un tailwind.config.ts para v3.
// Tailwind v4 usa @theme en CSS, pero shadcn todavía lee este archivo.
// Lo mantenemos mínimo: solo el content path que shadcn necesita.

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;