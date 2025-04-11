import { defineConfig } from 'vite'

/**
 * Vite configuration for standalone mode (no React)
 */
export default defineConfig({
  // Set output directory
  build: {
    outDir: 'dist-standalone',
  },
  // We'll use the root index.html as entry point
  publicDir: 'public'
}) 