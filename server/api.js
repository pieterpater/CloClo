// The /api routes, shared by the Vite dev/preview server and the production server.
//   GET /api/stream  → the live world (Server-Sent Events), see server/sim.js
//   GET /api/brain   → which brain CloClo uses, viewers, language-model usage and costs
import { startSim, stream, status } from './sim.js';

// Connect-style middleware: (req, res, next)
export function apiMiddleware(req, res, next) {
  const path = req.url.split('?')[0];
  if (req.method === 'GET' && path === '/api/stream') return stream(req, res);
  if (req.method === 'GET' && path === '/api/brain') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify(status()));
  }
  next();
}

export { startSim };
