import { defineConfig } from 'vite'

/**
 * Vite configuration for Planet B
 */
export default defineConfig({
  build: {
    outDir: 'dist', // Output to standard dist directory
  },
  server: {
    port: 5173,
    open: true
  },
  publicDir: 'public' // Serve public directory at root
}) 