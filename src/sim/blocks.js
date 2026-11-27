// The block yard: an 8×8 grid of spots where blocks can be stacked up to 10 high. What CloClo builds stays.
//   x: 0–7 from left to right as CloClo faces the yard; z: 0–7 from the front (closest to him) to the back
//   y: the level, 0 = on the ground
// A block can go on top of a stack, or at a chosen level if it rests on a block below it or touches a
// block beside it at the same level (so bridges, arches and windows are possible).
export const SIZE = 8, MAX_H = 10;
export const COLOURS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white'];
const LETTERS = 'roygbpw';
export const CAPACITY = SIZE * SIZE * MAX_H;

export const yard = {
  // per spot (z * SIZE + x) the colours from level 0 up; null = empty level
  cols: Array.from({ length: SIZE * SIZE }, () => []),
  idea: '' // what he built (or is building) there
};

const inGrid = (x, z) => Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < SIZE && z < SIZE;
const col = (x, z) => (inGrid(x, z) ? yard.cols[z * SIZE + x] : null);
const at = (x, z, y) => { const c = col(x, z); return c && y >= 0 ? c[y] ?? null : null; };
const trim = c => { while (c.length && c[c.length - 1] == null) c.pop(); };

export const blockCount = () => yard.cols.reduce((n, c) => n + c.filter(v => v != null).length, 0);

// One step:
//   { action: 'place', x, z, y, color }   y = -1 (or missing): on top of the stack; otherwise that level
//   { action: 'remove', x, z, y }          y = -1: the top block; otherwise the block at that level
//   { action: 'clear' }                    put every block back in the crate (see expandClear)
//   { action: 'clearcol', x, z }           one spot's whole stack back in the crate
// Returns false when it can't be done (full, unsupported, nothing there…).
export function applyStep(st) {
  const c = col(st.x, st.z);
  if (st.action === 'clearcol') { if (!c || !c.length) return false; c.length = 0; return true; }
  if (!c) return false;
  const y = Number.isInteger(st.y) ? st.y : -1;
  if (st.action === 'remove') {
    if (!c.length) return false;
    if (y < 0) { c.pop(); trim(c); return true; }
    if (c[y] == null) return false;
    c[y] = null;
    trim(c);
    return true;
  }
  const i = COLOURS.indexOf(st.color);
  if (i < 0) return false;
  if (y < 0) {
    if (c.length >= MAX_H) return false;
    c.push(i);
    return true;
  }
  if (y >= MAX_H || c[y] != null) return false;
  const supported = y === 0 || c[y - 1] != null ||
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => at(st.x + dx, st.z + dz, y) != null);
  if (!supported) return false;
  while (c.length < y) c.push(null);
  c[y] = i;
  return true;
}

// 'clear' becomes one step per non-empty spot, so he tidies up stack by stack.
export function expandClear(steps) {
  const out = [];
  for (const st of steps) {
    if (st.action !== 'clear') { out.push(st); continue; }
    for (let z = SIZE - 1; z >= 0; z--) for (let x = 0; x < SIZE; x++) out.push({ action: 'clearcol', x, z });
  }
  return out;
}

// Compact text for viewers and saving: one group per spot, a colour letter per level, '.' for an
// empty level, e.g. "rry,,b.b,…".
export const yardToString = () => yard.cols.map(c => c.map(i => (i == null ? '.' : LETTERS[i])).join('')).join(',');
export function yardFromString(s) {
  const parts = String(s || '').split(',');
  // an older, smaller yard (6×6) is placed in the middle of this one
  const n = Math.round(Math.sqrt(parts.length));
  const old = n * n === parts.length && n < SIZE ? n : SIZE;
  const off = Math.floor((SIZE - old) / 2);
  yard.cols.forEach(c => { c.length = 0; });
  parts.forEach((p, i) => {
    const x = (i % old) + off, z = Math.floor(i / old) + off;
    const c = col(x, z);
    if (!c) return;
    for (const ch of p.slice(0, MAX_H)) c.push(LETTERS.includes(ch) ? LETTERS.indexOf(ch) : null);
    trim(c);
  });
}

// What stands there, in words, for the language model.
export function describeYard() {
  const lines = [];
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const c = col(x, z);
    if (c.length) lines.push(`x${x} z${z}: ${c.map(i => (i == null ? '_' : COLOURS[i])).join(', ')}`);
  }
  return lines.length ? lines.join('\n') : 'The yard is empty.';
}

// Without the language model: a small, simple plan. Now and then (and always when it gets crowded)
// he tidies everything up first.
export function rulesPlan() {
  const rnd = n => Math.floor(Math.random() * n), colour = () => COLOURS[rnd(COLOURS.length)];
  const steps = [];
  let tidy = false;
  if (blockCount() > CAPACITY * .15 || (blockCount() > 20 && Math.random() < .25)) {
    steps.push({ action: 'clear' });
    tidy = true;
  }
  const kind = rnd(4);
  let idea;
  if (kind === 0) {
    const x = rnd(SIZE), z = rnd(SIZE), a = colour(), b = colour(), h = 4 + rnd(6);
    for (let i = 0; i < h; i++) steps.push({ action: 'place', x, z, y: -1, color: i % 2 ? b : a });
    idea = 'a tall tower';
  } else if (kind === 1) {
    const z = rnd(SIZE), c = colour();
    for (let x = 0; x < SIZE; x++) steps.push({ action: 'place', x, z, y: -1, color: c });
    idea = 'a long wall';
  } else if (kind === 2) {
    // a little bridge: two pillars and a deck between them
    const z = 1 + rnd(SIZE - 2), x0 = rnd(SIZE - 4), c = colour(), d = colour();
    for (const x of [x0, x0 + 3]) for (let y = 0; y < 2; y++) steps.push({ action: 'place', x, z, y: -1, color: c });
    for (let x = x0; x <= x0 + 3; x++) steps.push({ action: 'place', x, z, y: 2, color: d });
    idea = 'a little bridge';
  } else {
    for (let i = 0; i < 8; i++) steps.push({ action: 'place', x: 1 + rnd(SIZE - 2), z: 1 + rnd(SIZE - 2), y: -1, color: colour() });
    idea = 'a colourful something';
  }
  return { idea, thought: tidy ? 'First I tidy up, then I build!' : 'I’ll know what it is when it’s done.', steps };
}
