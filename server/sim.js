// The one and only CloClo: the simulation runs here, and every viewer watches the same world
// through /api/stream (Server-Sent Events).
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { world } from '../src/state.js';
import { createSimulation } from '../src/sim/simulation.js';
import { MODEL, brainAvailable, decide, planBuild, summarizeDay, usage } from './brain.js';

const SPEED = Number(process.env.SIM_SPEED) || 1;            // game minutes per real second
const DATA = process.env.CLOCLO_DATA || 'data/world.json';  // where the world is saved
const TICK_MS = 100, SEND_MS = 200, SAVE_MS = 30e3;

// Spending guard for the language model: at most this many decisions per minute and per day.
const PER_MINUTE = Number(process.env.BRAIN_MAX_PER_MINUTE) || 10;
const PER_DAY = Number(process.env.BRAIN_MAX_PER_DAY) || 4000;
// The language model decides around the clock, also when nobody is watching.
// Set BRAIN_WHEN_EMPTY=0 to use it only while someone watches (cheaper; the rules decide otherwise).
const WHEN_EMPTY = process.env.BRAIN_WHEN_EMPTY !== '0';

let minute = { start: 0, n: 0 }, day = { start: 0, n: 0 }, backoffUntil = 0, failures = 0;
const viewers = new Set();

function withinLimits() {
  const now = Date.now();
  if (now - minute.start > 60e3) minute = { start: now, n: 0 };
  if (now - day.start > 86400e3) day = { start: now, n: 0 };
  return minute.n < PER_MINUTE && day.n < PER_DAY;
}

// Each call counts towards the limits; after an error the rules take over for a while.
function limited(fn, describe) {
  return async state => {
    minute.n++;
    day.n++;
    try {
      const out = await fn(state);
      failures = 0;
      console.log(`[brain] ${describe(out).padEnd(30)} in ${out.usage.input}+${out.usage.cacheRead}c out ${out.usage.output}  $${out.usage.cost.toFixed(5)}  (total $${usage.cost.toFixed(4)} over ${usage.calls} calls)`);
      return out;
    } catch (e) {
      failures++;
      // wait longer after each failure: 30 s, 60 s, … up to 10 minutes
      backoffUntil = Date.now() + Math.min(600e3, 30e3 * failures);
      console.warn('[brain] call failed, using the rules for now:', e.message);
      return null;
    }
  };
}

const llm = {
  canDecide: () => brainAvailable() && (viewers.size > 0 || WHEN_EMPTY) && Date.now() > backoffUntil && withinLimits(),
  decide: limited(decide, out => out.activity),
  planBuild: limited(planBuild, out => `build: ${out.idea} (${out.steps.length} steps)`),
  summarize: limited(summarizeDay, () => 'day summary')
};

const send = (res, event, data) => res.write(`${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`);

// Start the world once per process (Vite may load this file more than once).
export function startSim() {
  if (globalThis.__clocloSim) return globalThis.__clocloSim;
  world.speed = SPEED;
  const sim = createSimulation({ ...llm, onDiary: entry => viewers.forEach(res => send(res, 'diary', entry)) });
  try {
    sim.load(JSON.parse(readFileSync(DATA, 'utf8')));
    console.log(`[world] CloClo continues his life from ${DATA}`);
  } catch {
    sim.write('Good morning, Mosdorp! What shall I do today?');
    console.log('[world] A new day in Mosdorp');
  }

  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    sim.tick(Math.min(1, (now - last) / 1000) * SPEED); // never jump more than a second
    last = now;
  }, TICK_MS);
  setInterval(() => {
    if (!viewers.size) return;
    const snap = { ...sim.snapshot(), viewers: viewers.size };
    viewers.forEach(res => send(res, null, snap));
  }, SEND_MS);
  const save = () => {
    try {
      mkdirSync(dirname(DATA), { recursive: true });
      writeFileSync(DATA + '.tmp', JSON.stringify(sim.save()));
      renameSync(DATA + '.tmp', DATA);
    } catch (e) {
      console.warn('[world] could not save:', e.message);
    }
  };
  setInterval(save, SAVE_MS);
  process.once('SIGINT', () => { save(); process.exit(0); });
  process.once('SIGTERM', () => { save(); process.exit(0); });

  globalThis.__clocloSim = sim;
  return sim;
}

// GET /api/stream: a welcome message (with the diary), then a snapshot 5× per second and every new diary line.
export function stream(req, res) {
  const sim = startSim();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 3000\n\n');
  viewers.add(res);
  send(res, 'hello', { diary: sim.diary, snapshot: { ...sim.snapshot(), viewers: viewers.size }, brain: brainAvailable() ? MODEL : null });
  req.on('close', () => viewers.delete(res));
}

export const status = () => ({
  brain: brainAvailable() ? MODEL : null, viewers: viewers.size, usage,
  limits: { perMinute: PER_MINUTE, perDay: PER_DAY, decisionsToday: day.n, whenEmpty: WHEN_EMPTY }
});
