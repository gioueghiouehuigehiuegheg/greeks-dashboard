/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"],
      },
      colors: {
        bg:      "#07090d",
        panel:   "#0d1117",
        elevated:"#131a24",
        border:  "#1e2732",
        text:    "#e6edf3",
        subtext: "#7d8590",
        grid:    "#1a232f",
        pos:     "#2dd4a4",
        neg:     "#f87171",
        accent:  "#fbbf24",
        vanna:   "#c084fc",
        charm:   "#f472b6",
        delta:   "#38bdf8",
        gamma:   "#2dd4a4",
      },
    },
  },
  plugins: [],
};
