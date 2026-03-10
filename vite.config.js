import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Add this

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Add this to the list
  ],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  }
})