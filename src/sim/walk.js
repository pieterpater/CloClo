// Walking, climbing and getting around blocks.
// CloClo stands on a "floor": level 0 is the ground; on a stack of blocks he can stand on top. He is
// about two blocks tall, so a floor needs two free levels above it. He can step up one block at a time
// and jump down from up to three blocks, so he can climb stairs, stand on what he builds, and walk
// under (or over) a bridge.
// Walk points carry the floor in their y: (x, floor, z).
import * as THREE from 'three';
import { yard, MAX_H } from './blocks.js';

export const STEP_UP = 1, JUMP_DOWN = 3;
const cellOf = v => [Math.round(v.x), Math.round(v.z)];

// The floors he can stand on at spot (x, z), lowest first.
export function floorsAt(x, z) {
  const c = yard.cols.get(`${x},${z}`);
  if (!c) return [0];
  const out = [];
  for (let y = 0; y <= MAX_H; y++) if ((y === 0 || c[y - 1] != null) && c[y] == null && c[y + 1] == null) out.push(y);
  return out;
}
const canStand = (x, z, f) => floorsAt(x, z).includes(f);

// Is a spot in his way at ground level? (A block on level 0 or 1.)
export function cellBlocked(x, z) {
  const c = yard.cols.get(`${x},${z}`);
  return !!c && (c[0] != null || c[1] != null);
}

// Can he walk the straight line from a to b on floor f? (The spot he starts in doesn't count.)
export function lineClear(a, b, f = 0) {
  const [sx, sz] = cellOf(a);
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / .2);
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = Math.round(a.x + (b.x - a.x) * t), z = Math.round(a.z + (b.z - a.z) * t);
    if ((x !== sx || z !== sz) && !canStand(x, z, f)) return false;
  }
  return true;
}

// A* over (x, z, floor): 8 directions on one floor without cutting corners, and up one block or down
// up to three onto a neighbouring spot. Ends at any floor of the goal spot. If the goal can't be
// reached, the path leads to the reachable spot closest to it.
function findPath(from, fromFloor, to) {
  const [sx, sz] = cellOf(from), [gx, gz] = cellOf(to);
  const sf = fromFloor;
  const pad = 16, minX = Math.min(sx, gx) - pad, maxX = Math.max(sx, gx) + pad, minZ = Math.min(sz, gz) - pad, maxZ = Math.max(sz, gz) + pad;
  const key = (x, z, f) => ((x + 1000) * 4000 + (z + 1000)) * 32 + f;
  const h = (x, z) => { const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return Math.max(dx, dz) + .414 * Math.min(dx, dz); };
  const floors = new Map();
  const fl = (x, z) => { const k = x * 10000 + z; if (!floors.has(k)) floors.set(k, floorsAt(x, z)); return floors.get(k); };
  const open = [[h(sx, sz), sx, sz, sf]], g = new Map([[key(sx, sz, sf), 0]]), came = new Map(), closed = new Set();
  let best = [sx, sz, sf], bestH = h(sx, sz), n = 0;
  while (open.length && n++ < 12000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, x, z, f] = open.splice(bi, 1)[0], k = key(x, z, f);
    if (closed.has(k)) continue;
    closed.add(k);
    const hh = h(x, z);
    if (hh < bestH) { bestH = hh; best = [x, z, f]; }
    if (x === gx && z === gz) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;
      for (const nf of fl(nx, nz)) {
        if (nf - f > STEP_UP || f - nf > JUMP_DOWN) continue;
        // diagonally only on one floor, with room on both sides (no squeezing past corners)
        if (dx && dz && (nf !== f || !fl(x + dx, z).includes(f) || !fl(x, z + dz).includes(f))) continue;
        const nk = key(nx, nz, nf);
        const ng = g.get(k) + (dx && dz ? 1.414 : 1) + (nf > f ? .8 : 0) + (nf < f ? .3 * (f - nf) : 0);
        if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); came.set(nk, k); open.push([ng + h(nx, nz), nx, nz, nf]); }
      }
    }
  }
  const reached = best[0] === gx && best[1] === gz;
  const pts = [];
  for (let k = key(...best); k !== undefined; k = came.get(k)) {
    const f = k % 32, rest = (k - f) / 32, x = Math.floor(rest / 4000) - 1000, z = rest % 4000 - 1000;
    pts.unshift(new THREE.Vector3(x, f, z));
    if (k === key(sx, sz, sf)) break;
  }
  pts.shift(); // his own spot
  if (reached) {
    const last = pts.length ? pts[pts.length - 1].y : sf;
    pts[Math.max(0, pts.length - 1)] = new THREE.Vector3(to.x, last, to.z); // end exactly where he meant to go
  }
  return { pts, reached };
}

// Drop the in-between spots wherever he can walk straight on along one floor.
function straighten(from, pts) {
  const out = [];
  let at = from, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !(pts.slice(i, j + 1).every(p => p.y === at.y) && lineClear(at, pts[j], at.y))) j--;
    out.push(pts[j]);
    at = pts[j];
    i = j + 1;
  }
  return out;
}

// Plan a walk from `from` (standing on floor `fromFloor`) through the points `pts` (his usual route),
// climbing over or going around blocks where needed. { pts, reached }: if something is walled off, the
// walk ends as close as he can get. Each point's y is the floor he stands on there.
export function planWalk(from, fromFloor, pts) {
  const out = [];
  let at = new THREE.Vector3(from.x, fromFloor, from.z);
  for (const p of pts) {
    const q = new THREE.Vector3(p.x, at.y, p.z);
    if (lineClear(at, q, at.y) && canStand(...cellOf(q), at.y)) { out.push(q); at = q; continue; }
    const path = findPath(at, at.y, q);
    out.push(...straighten(at, path.pts));
    if (!path.reached) return { pts: out, reached: false };
    at = out[out.length - 1] || at;
  }
  return { pts: out, reached: true };
}

// ---- getting out of a box ----
// The fewest blocked spots (at ground level) he has to clear to walk from `from` to `to`, in the order
// he meets them: a path search on the ground that may push through blocks at an extra cost.
export function wayOut(from, to) {
  const [sx, sz] = cellOf(from), [gx, gz] = cellOf(to);
  const key = (x, z) => (x + 1000) * 4000 + (z + 1000);
  const h = (x, z) => Math.hypot(x - gx, z - gz);
  const open = [[h(sx, sz), sx, sz]], g = new Map([[key(sx, sz), 0]]), came = new Map(), closed = new Set();
  let n = 0;
  while (open.length && n++ < 20000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, x, z] = open.splice(bi, 1)[0], k = key(x, z);
    if (closed.has(k)) continue;
    closed.add(k);
    if (x === gx && z === gz) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, nk = key(nx, nz);
      const ng = g.get(k) + 1 + (cellBlocked(nx, nz) ? 25 : 0);
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); came.set(nk, k); open.push([ng + h(nx, nz), nx, nz]); }
    }
  }
  const cells = [];
  for (let k = key(gx, gz); k !== undefined && k !== key(sx, sz); k = came.get(k)) {
    const x = Math.floor(k / 4000) - 1000, z = k % 4000 - 1000;
    if (cellBlocked(x, z)) cells.unshift([x, z]);
  }
  return cells;
}

export { cellOf };
