/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
     "./node_modules/@relume_io/relume-ui/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        'heading': ['Oxanium', 'Arial Black', 'Arial', 'sans-serif'],
        'display': ['Righteous', 'Impact', 'Arial', 'sans-serif'],
        'accent': ['Josefin Sans', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
      },
    },
    screens: {
      vsm:'414px',
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1366px',
      xlg: '1440px',
    },
  },
  presets: [require("@relume_io/relume-tailwind")],
  plugins: [],
};
