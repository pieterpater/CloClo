// Walking around blocks. CloClo can't walk through blocks: a spot on the village grid is in his way
// when it has a block at level 0 or 1 (he is about two blocks tall), so he can walk under a bridge
// or an arch whose two lowest levels are free.
import * as THREE from 'three';
import { yard } from './blocks.js';

const cellOf = v => [Math.round(v.x), Math.round(v.z)];

export function cellBlocked(x, z) {
  const c = yard.cols.get(`${x},${z}`);
  return !!c && (c[0] != null || c[1] != null);
}

// Is the straight line from a to b free of blocks? (The spot he starts in doesn't count, so he can
// always walk out of a spot that got built up around him.)
export function lineClear(a, b) {
  const [sx, sz] = cellOf(a);
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / .2);
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = Math.round(a.x + (b.x - a.x) * t), z = Math.round(a.z + (b.z - a.z) * t);
    if ((x !== sx || z !== sz) && cellBlocked(x, z)) return false;
  }
  return true;
}

// A* over the 1 m grid, 8 directions without cutting corners. Returns the spots to walk through, and
// whether it reaches the goal; if not, the path leads to the reachable spot closest to the goal.
function findPath(from, to) {
  const [sx, sz] = cellOf(from), [gx, gz] = cellOf(to);
  const pad = 16, minX = Math.min(sx, gx) - pad, maxX = Math.max(sx, gx) + pad, minZ = Math.min(sz, gz) - pad, maxZ = Math.max(sz, gz) + pad;
  const key = (x, z) => x * 100000 + z;
  const h = (x, z) => { const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return Math.max(dx, dz) + .414 * Math.min(dx, dz); };
  const open = [[h(sx, sz), sx, sz]], g = new Map([[key(sx, sz), 0]]), came = new Map(), closed = new Set();
  let best = [sx, sz], bestH = h(sx, sz), n = 0;
  while (open.length && n++ < 8000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, x, z] = open.splice(bi, 1)[0], k = key(x, z);
    if (closed.has(k)) continue;
    closed.add(k);
    const hh = h(x, z);
    if (hh < bestH) { bestH = hh; best = [x, z]; }
    if (x === gx && z === gz) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < minX || nx > maxX || nz < minZ || nz > maxZ || cellBlocked(nx, nz)) continue;
      if (dx && dz && (cellBlocked(x + dx, z) || cellBlocked(x, z + dz))) continue; // no squeezing past corners
      const nk = key(nx, nz), ng = g.get(k) + (dx && dz ? 1.414 : 1);
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); came.set(nk, k); open.push([ng + h(nx, nz), nx, nz]); }
    }
  }
  const reached = best[0] === gx && best[1] === gz;
  const cells = [];
  for (let k = key(best[0], best[1]); k !== undefined; k = came.get(k)) {
    const x = Math.round(k / 100000), z = k - x * 100000;
    cells.unshift(new THREE.Vector3(x, 0, z));
    if (k === key(sx, sz)) break;
  }
  cells.shift(); // his own spot
  if (reached) cells[Math.max(0, cells.length - 1)] = new THREE.Vector3(to.x, 0, to.z); // end exactly where he meant to go
  return { pts: cells, reached };
}

// Drop the in-between spots of a path wherever he can walk straight on, so he walks smooth lines.
function straighten(from, pts) {
  const out = [];
  let at = from, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineClear(at, pts[j])) j--;
    out.push(pts[j]);
    at = pts[j];
    i = j + 1;
  }
  return out;
}

// Plan a walk from `from` through the points `pts` (his usual route), going around blocks where
// needed. { pts, reached }: if something is walled off, the walk ends as close as he can get.
export function planWalk(from, pts) {
  const out = [];
  let at = from.clone().setY(0);
  for (const p of pts) {
    const q = new THREE.Vector3(p.x, 0, p.z);
    if (lineClear(at, q)) { out.push(q); at = q; continue; }
    const path = findPath(at, q);
    out.push(...straighten(at, path.pts));
    if (!path.reached) return { pts: out, reached: false };
    at = q;
  }
  return { pts: out, reached: true };
}

export { cellOf };
