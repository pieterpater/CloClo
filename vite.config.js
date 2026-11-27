import { defineConfig, loadEnv } from 'vite';
import { apiMiddleware, startSim } from './server/api.js';

export default defineConfig(({ mode }) => {
  // Make ANTHROPIC_API_KEY from a local .env file available to the /api routes.
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

  return {
    // Relative paths, so the build also works from a subfolder (e.g. GitHub Pages).
    base: './',
    // Three.js alone is ~500 kB; that is fine for now.
    build: { chunkSizeWarningLimit: 800 },
    // The live world (one CloClo for everyone), also during `npm run dev` and `npm run preview`.
    plugins: [{
      name: 'cloclo-world',
      configureServer: server => { startSim(); server.middlewares.use(apiMiddleware); },
      configurePreviewServer: server => { startSim(); server.middlewares.use(apiMiddleware); }
    }]
  };
});
