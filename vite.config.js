import { defineConfig } from 'vite';

export default defineConfig({
  // Relatieve paden, zodat de build ook vanuit een submap (bijv. GitHub Pages) werkt.
  base: './',
  // Three.js alleen is al ~500 kB; dat is voor nu prima.
  build: { chunkSizeWarningLimit: 800 }
});
