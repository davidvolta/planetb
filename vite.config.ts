import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Add a build script for standalone mode
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
