import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isVercel = process.env.VERCEL === '1'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Only externalize native plugins for Vercel web builds
      ...(isVercel ? { external: ['@capacitor/browser', '@capacitor/app', '@capacitor/share', '@capacitor/filesystem'] } : {}),
    },
  },
})
