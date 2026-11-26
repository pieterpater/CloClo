// The /api routes, shared by the Vite dev/preview server and the production server.
//   GET  /api/brain   → { enabled, model, usage }
//   POST /api/decide  → { activity, thought, diary }  (or an error: the browser then uses its rules)
import { MODEL, brainAvailable, decide, usage } from './brain.js';

// Spending guard: at most this many decisions per minute and per day, over all visitors together.
const PER_MINUTE = Number(process.env.BRAIN_MAX_PER_MINUTE) || 20;
const PER_DAY = Number(process.env.BRAIN_MAX_PER_DAY) || 2000;
let minute = { start: 0, n: 0 }, day = { start: 0, n: 0 };

function allow() {
  const now = Date.now();
  if (now - minute.start > 60e3) minute = { start: now, n: 0 };
  if (now - day.start > 86400e3) day = { start: now, n: 0 };
  if (minute.n >= PER_MINUTE || day.n >= PER_DAY) return false;
  minute.n++;
  day.n++;
  return true;
}

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 20e3) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Connect-style middleware: (req, res, next)
export async function apiMiddleware(req, res, next) {
  const path = req.url.split('?')[0];
  if (path === '/api/brain' && req.method === 'GET') {
    return send(res, 200, { enabled: brainAvailable(), model: MODEL, usage, limits: { perMinute: PER_MINUTE, perDay: PER_DAY } });
  }
  if (path === '/api/decide' && req.method === 'POST') {
    if (!brainAvailable()) return send(res, 503, { error: 'no API key configured' });
    if (!allow()) return send(res, 429, { error: 'decision limit reached' });
    try {
      const state = JSON.parse(await readBody(req));
      const out = await decide(state);
      console.log(`[brain] ${out.activity.padEnd(11)} in ${out.usage.input}+${out.usage.cacheRead}c out ${out.usage.output}  $${out.usage.cost.toFixed(5)}  (total $${usage.cost.toFixed(4)} over ${usage.calls} calls)`);
      return send(res, 200, { activity: out.activity, thought: out.thought, diary: out.diary });
    } catch (e) {
      console.warn('[brain] decision failed:', e.message);
      return send(res, 502, { error: 'decision failed' });
    }
  }
  next();
}
