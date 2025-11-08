/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mirage: "#16232A",
        blaze: "#FF5B04",
        deepSea: "#075056",
        wildSand: "#E4EEF0",
      },
    },
  },
  plugins: [],
};


