import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths, so the build also works from a subfolder (e.g. GitHub Pages).
  base: './',
  // Three.js alone is ~500 kB; that is fine for now.
  build: { chunkSizeWarningLimit: 800 }
});
