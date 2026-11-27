// Blocks anywhere in Mosdorp. The village is a grid of 1-metre spots; on every spot blocks can be
// stacked up to 12 high, except inside buildings, in the pond and on the fountain. What CloClo
// builds stays.
//   x grows to the east, z grows to the south, (0, 0) is the fountain on the square
//   y is the level: 0 = on the ground (on the hill, the ground follows the slope)
// A block can go on top of a stack, or at a chosen level if it rests on a block below it or touches
// a block beside it at the same level (so bridges, arches and windows are possible).
import { LOC } from '../world/locations.js';

export const MAX_H = 12, MAX_BLOCKS = 400, RADIUS = 44;
export const COLOURS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white'];
const LETTERS = 'roygbpw';

export const yard = {
  cols: new Map(), // "x,z" → colours from level 0 up; null = empty level
  idea: ''         // the last thing he built
};

const key = (x, z) => `${x},${z}`;
const trim = c => { while (c.length && c[c.length - 1] == null) c.pop(); };
const at = (x, z, y) => { const c = yard.cols.get(key(x, z)); return c ? c[y] ?? null : null; };

export const blockCount = () => { let n = 0; for (const c of yard.cols.values()) n += c.filter(v => v != null).length; return n; };

// Places where blocks can't go: buildings, the pond, the fountain, the vegetable beds.
export function blocked(x, z) {
  if (!Number.isInteger(x) || !Number.isInteger(z) || Math.hypot(x, z) > RADIUS) return true;
  if (Math.hypot(x, z) < 2.4) return true; // fountain
  for (const k of ['home', 'bakery', 'library', 'post']) {
    const L = LOC[k];
    if (Math.hypot(x - L.x, z - L.z) < Math.max(L.b.w, L.b.d) / 2 + .8) return true;
  }
  const near = (L, r, off = 0) => Math.hypot(x - (L.x - L.dir.x * off), z - (L.z - L.dir.z * off)) < r;
  return near(LOC.pond, 4.9) || near(LOC.icecream, 2.4) || near(LOC.garden, 3.2, 1.6);
}

// One step (all positions are spots on the village grid):
//   { action: 'place', x, z, y, color }   y = -1: on top of the stack; otherwise that level
//   { action: 'remove', x, z, y }          y = -1: the top block; otherwise the block at that level
//   { action: 'take', x, z, y } / { action: 'put', x, z, y }   moving a block (see expandSteps)
//   { action: 'clearcol', x, z }           a whole stack back in the crate
// Returns the colour index involved, or -1 when it can't be done.
export function applyStep(st, carrying = null) {
  const k = key(st.x, st.z);
  const c = yard.cols.get(k);
  const y = Number.isInteger(st.y) ? st.y : -1;
  if (st.action === 'clearcol') {
    if (!c || !c.length) return -1;
    yard.cols.delete(k);
    return 0;
  }
  if (st.action === 'remove' || st.action === 'take') {
    if (!c || !c.length) return -1;
    const level = y < 0 ? c.length - 1 : y;
    const v = c[level];
    if (v == null) return -1;
    c[level] = null;
    trim(c);
    if (!c.length) yard.cols.delete(k);
    return v;
  }
  // place / put
  const i = st.action === 'put' ? carrying : COLOURS.indexOf(st.color);
  if (i == null || i < 0 || blocked(st.x, st.z) || blockCount() >= MAX_BLOCKS) return -1;
  const col = c || [];
  let level = y;
  if (level < 0) level = col.length;
  if (level >= MAX_H || col[level] != null) return -1;
  const supported = level === 0 || col[level - 1] != null ||
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => at(st.x + dx, st.z + dz, level) != null);
  if (!supported) return -1;
  while (col.length < level) col.push(null);
  col[level] = i;
  yard.cols.set(k, col);
  return i;
}

// Turn the model's steps into simple ones he can do one at a time:
//   move  → take it from where it is, then put it at the new place
//   clear → every stack within 2 spots of (x, z) back in the crate
export function expandSteps(steps) {
  const out = [];
  for (const st of steps) {
    if (st.action === 'move') {
      out.push({ action: 'take', x: st.x, z: st.z, y: st.y });
      out.push({ action: 'put', x: st.to_x, z: st.to_z, y: st.to_y });
    } else if (st.action === 'clear') {
      for (const [k, c] of yard.cols) {
        const [x, z] = k.split(',').map(Number);
        if (c.length && Math.abs(x - st.x) <= 2 && Math.abs(z - st.z) <= 2) out.push({ action: 'clearcol', x, z });
      }
    } else out.push(st);
  }
  return out;
}

// Compact text for viewers and saving: "x,z:letters;…" per stack ('.' = empty level).
export const yardToString = () => [...yard.cols].map(([k, c]) => `${k}:${c.map(i => (i == null ? '.' : LETTERS[i])).join('')}`).join(';');

export function yardFromString(s) {
  yard.cols.clear();
  s = String(s || '');
  if (!s) return;
  if (s.includes(':')) {
    for (const part of s.split(';')) {
      const [k, letters = ''] = part.split(':');
      const [x, z] = k.split(',').map(Number);
      if (!Number.isInteger(x) || !Number.isInteger(z)) continue;
      const c = [...letters.slice(0, MAX_H)].map(ch => (LETTERS.includes(ch) ? LETTERS.indexOf(ch) : null));
      trim(c);
      if (c.length) yard.cols.set(key(x, z), c);
    }
    return;
  }
  // an older save: the block yard's own small grid (6×6 or 8×8), placed where the yard is
  const parts = s.split(','), n = Math.round(Math.sqrt(parts.length));
  if (n * n !== parts.length) return;
  const L = LOC.blocks, half = (n - 1) / 2 * .9;
  parts.forEach((p, i) => {
    const lx = -half + (i % n) * .9, lz = half - Math.floor(i / n) * .9;
    const x = Math.round(L.x + lx * Math.cos(L.rot) + lz * Math.sin(L.rot));
    const z = Math.round(L.z - lx * Math.sin(L.rot) + lz * Math.cos(L.rot));
    const k = key(x, z);
    if (!p || yard.cols.has(k)) return;
    const c = [...p.slice(0, MAX_H)].map(ch => (LETTERS.includes(ch) ? LETTERS.indexOf(ch) : null));
    trim(c);
    if (c.length) yard.cols.set(k, c);
  });
}

// The closest named place to a spot, for describing where things are.
export function nearestPlace(x, z) {
  let best = 'the square', bd = Math.hypot(x, z) - 4;
  for (const k in LOC) {
    const L = LOC[k], d = Math.hypot(x - L.x, z - L.z);
    if (d < bd) { bd = d; best = L.name; }
  }
  return best;
}

// What stands where, in words, for the language model: grouped by the nearest place.
export function describeYard() {
  if (!yard.cols.size) return 'There are no blocks anywhere yet.';
  const groups = new Map();
  for (const [k, c] of yard.cols) {
    const [x, z] = k.split(',').map(Number);
    const place = nearestPlace(x, z);
    if (!groups.has(place)) groups.set(place, []);
    groups.get(place).push(`(${x}, ${z}): ${c.map(i => (i == null ? '_' : COLOURS[i])).join(', ')}`);
  }
  return [...groups].map(([place, lines]) => `Near ${place}:\n${lines.join('\n')}`).join('\n');
}

// Without the language model: a small, simple plan somewhere in the village. Now and then (and
// always when there are many blocks) he first tidies up somewhere.
export function rulesPlan() {
  const rnd = n => Math.floor(Math.random() * n), colour = () => COLOURS[rnd(COLOURS.length)];
  const steps = [];
  let tidy = false;
  const stacks = [...yard.cols.keys()];
  if (stacks.length && (blockCount() > MAX_BLOCKS * .4 || Math.random() < .25)) {
    const [x, z] = stacks[rnd(stacks.length)].split(',').map(Number);
    steps.push({ action: 'clear', x, z });
    tidy = true;
  }
  // a site near a random place, on free ground
  const places = Object.values(LOC).filter(L => L.dir);
  let sx = 0, sz = 0;
  for (let i = 0; i < 40; i++) {
    const L = places[rnd(places.length)], a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 4;
    sx = Math.round(L.x + Math.cos(a) * r);
    sz = Math.round(L.z + Math.sin(a) * r);
    if (!blocked(sx, sz) && !blocked(sx + 3, sz) && !blocked(sx, sz + 1)) break;
  }
  const kind = rnd(3);
  let idea;
  if (kind === 0) {
    const a = colour(), b = colour(), h = 4 + rnd(7);
    for (let i = 0; i < h; i++) steps.push({ action: 'place', x: sx, z: sz, y: -1, color: i % 2 ? b : a });
    idea = 'a tall tower near ' + nearestPlace(sx, sz);
  } else if (kind === 1) {
    const c = colour();
    for (let x = sx; x < sx + 5; x++) steps.push({ action: 'place', x, z: sz, y: -1, color: c });
    idea = 'a little wall near ' + nearestPlace(sx, sz);
  } else {
    const c = colour(), d = colour();
    for (const x of [sx, sx + 3]) for (let y = 0; y < 2; y++) steps.push({ action: 'place', x, z: sz, y: -1, color: c });
    for (let x = sx; x <= sx + 3; x++) steps.push({ action: 'place', x, z: sz, y: 2, color: d });
    idea = 'a little bridge near ' + nearestPlace(sx, sz);
  }
  return { idea, thought: tidy ? 'First I tidy up a bit, then I build!' : 'I know just the place for it.', steps };
}
