/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        boxing: {
          navy: "#0F172A",
          gold: "#EAB308",
          red: "#EF4444",
          gray: "#F8FAFC",
        }
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
      animation: {
        meteor: "meteor 5s linear infinite",
        marquee: "marquee var(--duration) linear infinite",
      },
      keyframes: {
        meteor: {
          "0%": { transform: "rotate(215deg) translate3d(0, 0, 0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "rotate(215deg) translate3d(-950px, 0, 0)", opacity: "0" }
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" }
        }
      }
    },
  },
  plugins: [],
}
