/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Paleta Yaya via CSS variables em blog/src/styles/theme.css
        // Dark é o default; light mode via prefers-color-scheme do SO/browser.
        'yaya-night': 'rgb(var(--yaya-night) / <alpha-value>)',
        'yaya-cloud': 'rgb(var(--yaya-cloud) / <alpha-value>)',
        'yaya-purple': 'rgb(var(--yaya-purple) / <alpha-value>)',
        'yaya-glow': 'rgb(var(--yaya-glow) / <alpha-value>)',
        'yaya-blush': 'rgb(var(--yaya-blush) / <alpha-value>)',
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
