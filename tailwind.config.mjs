/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Neue Haas Grotesk', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Editorial New', 'Georgia', 'serif'],
      },
      colors: {
        bone: '#F5F2ED',
        ink: '#050505',
        ash: '#8C8C8C',
        dust: '#D9D4CC',
        rust: '#C4522A',
        'rust-dark': '#A03D1C',
        violetCustom: '#7e22ce',
      },
      letterSpacing: {
        widest: '0.2em',
        ultra: '0.35em',
      },
      gridTemplateColumns: {
        'catalog': 'repeat(auto-fill, minmax(280px, 1fr))',
        'catalog-sm': 'repeat(auto-fill, minmax(200px, 1fr))',
      },
    },
  },
  plugins: [],
};
