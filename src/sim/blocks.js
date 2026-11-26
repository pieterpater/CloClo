// The block yard: a 6×6 grid of spots where blocks stack up to 6 high. What CloClo builds stays.
//   x: 0–5 from left to right as CloClo faces the yard; z: 0–5 from the front (closest to him) to the back
export const SIZE = 6, MAX_H = 6;
export const COLOURS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white'];
const LETTERS = 'roygbpw';

export const yard = {
  cols: Array.from({ length: SIZE * SIZE }, () => []), // colour indices, bottom to top
  idea: '' // what he built (or is building) there
};

const col = (x, z) => yard.cols[z * SIZE + x];
export const blockCount = () => yard.cols.reduce((n, c) => n + c.length, 0);

// One step: { action: 'place' | 'remove', x, z, color }. Returns false when it can't be done.
export function applyStep(st) {
  const c = col(st.x, st.z);
  if (!c) return false;
  if (st.action === 'remove') return c.pop() !== undefined;
  const i = COLOURS.indexOf(st.color);
  if (i < 0 || c.length >= MAX_H) return false;
  c.push(i);
  return true;
}

// Compact text for viewers and saving: one group of colour letters per spot, e.g. "rry,,b,…".
export const yardToString = () => yard.cols.map(c => c.map(i => LETTERS[i]).join('')).join(',');
export function yardFromString(s) {
  const parts = String(s || '').split(',');
  yard.cols.forEach((c, i) => {
    c.length = 0;
    for (const ch of parts[i] || '') if (LETTERS.includes(ch) && c.length < MAX_H) c.push(LETTERS.indexOf(ch));
  });
}

// What stands there, in words, for the language model.
export function describeYard() {
  const lines = [];
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const c = col(x, z);
    if (c.length) lines.push(`x${x} z${z}: ${c.map(i => COLOURS[i]).join(', ')}`);
  }
  return lines.length ? lines.join('\n') : 'The yard is empty.';
}

// Without the language model: a small, simple plan.
export function rulesPlan() {
  const rnd = n => Math.floor(Math.random() * n), colour = () => COLOURS[rnd(COLOURS.length)];
  const steps = [];
  if (blockCount() > 70) {
    for (let i = 0; i < 10; i++) steps.push({ action: 'remove', x: rnd(SIZE), z: rnd(SIZE), color: 'red' });
    return { idea: 'a tidier yard', thought: 'Time to tidy up a bit!', steps };
  }
  const kind = rnd(3);
  if (kind === 0) {
    const x = rnd(SIZE), z = rnd(SIZE), a = colour(), b = colour(), h = 3 + rnd(4);
    for (let i = 0; i < h; i++) steps.push({ action: 'place', x, z, color: i % 2 ? b : a });
    return { idea: 'a tall tower', thought: 'Up, up, up!', steps };
  }
  if (kind === 1) {
    const z = rnd(SIZE), c = colour();
    for (let x = 0; x < SIZE; x++) steps.push({ action: 'place', x, z, color: c });
    return { idea: 'a long wall', thought: 'A wall! For… something important.', steps };
  }
  for (let i = 0; i < 7; i++) steps.push({ action: 'place', x: 1 + rnd(4), z: 1 + rnd(4), color: colour() });
  return { idea: 'a colourful something', thought: 'I’ll know what it is when it’s done.', steps };
}
