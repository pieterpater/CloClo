// Tidy stars: CloClo's reward for cleaning up the blocks lying around the village.
// "Mess" is every block outside the block yard (building in the yard is always fine). He earns a star
// for each block that disappears from around the village, but only once the village is tidier than
// it has been ("low", the tidiest it has been), so building a mess and taking it away again earns
// nothing. Each night the bar loosens a little, so keeping things tidy stays worth it.
import { LOC } from '../world/locations.js';
import { yard } from './blocks.js';

export const PRIZES = [
  { stars: 10, id: 'croissant', name: 'a golden croissant from the baker' },
  { stars: 25, id: 'medal', name: 'a shiny tidy medal to wear' },
  { stars: 50, id: 'gold', name: 'gold blocks to build with' },
  { stars: 100, id: 'trophy', name: 'a trophy at the block yard' },
  { stars: 200, id: 'statue', name: 'a golden statue of himself on the square' }
];

export const tidy = { stars: 0, low: null, prizes: [] };

// Is spot (x, z) inside the block yard's sandy plot?
export function inYard(x, z) {
  const L = LOC.blocks, dx = x - L.x, dz = z - L.z, c = Math.cos(L.rot), s = Math.sin(L.rot);
  return Math.abs(dx * c - dz * s) <= 4.2 && Math.abs(dx * s + dz * c) <= 4.2;
}

// Blocks lying around the village (outside the block yard).
export function messCount() {
  let n = 0;
  for (const [k, c] of yard.cols) {
    const [x, z] = k.split(',').map(Number);
    if (!inYard(x, z)) n += c.filter(v => v != null).length;
  }
  return n;
}

export const nextPrize = () => PRIZES.find(p => !tidy.prizes.includes(p.id)) || null;
export const hasPrize = id => tidy.prizes.includes(id);

// After he has built or cleaned: how many stars did he earn, and which prizes came with them?
export function settle() {
  const mess = messCount();
  if (tidy.low === null) tidy.low = mess; // first time: start counting from here
  const earned = Math.max(0, tidy.low - mess);
  tidy.low = Math.min(tidy.low, mess);
  if (!earned) return { earned: 0, prizes: [] };
  tidy.stars += earned;
  const prizes = PRIZES.filter(p => tidy.stars >= p.stars && !tidy.prizes.includes(p.id));
  tidy.prizes.push(...prizes.map(p => p.id));
  return { earned, prizes };
}

// Each night: the bar for stars loosens a little (up to 3 blocks), never above today's mess.
export function nightly() {
  const mess = messCount();
  if (tidy.low === null) tidy.low = mess;
  tidy.low = Math.min(mess, tidy.low + 3);
}

export const tidySave = () => ({ ...tidy });
export function tidyLoad(d) {
  tidy.stars = d?.stars || 0;
  tidy.low = d?.low ?? null;
  tidy.prizes = d?.prizes || [];
}
