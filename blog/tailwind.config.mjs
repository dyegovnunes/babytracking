/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Yaya (Nocturnal Sanctuary)
        'yaya-night': '#0d0a27',
        'yaya-purple': '#b79fff',
        'yaya-glow': '#ab8ffe',
        'yaya-blush': '#ff96b9',
        'yaya-cloud': '#e7e2ff',
      },
      fontFamily: {
        // Manrope = display/headlines/logo; Plus Jakarta Sans = body
        display: ['Manrope', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
