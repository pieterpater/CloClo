import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, rnd, clamp } from '../helpers.js';
import { LOC } from './locations.js';

function tree(x, z, s) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  scene.add(t);
  mesh(new THREE.CylinderGeometry(.18 * s, .25 * s, 1.3 * s, 6), mat(0x8a5a3b), 0, .65 * s, 0, t);
  if (rnd() < .45) mesh(new THREE.ConeGeometry(1.1 * s, 2.6 * s, 7), mat(0x2d6a4f), 0, 2.4 * s, 0, t);
  else mesh(new THREE.IcosahedronGeometry(1.2 * s), mat(rnd() < .5 ? 0x52b788 : 0x74c69d), 0, 2.1 * s, 0, t);
}

// Distance from a point to the road leading to location L.
const segD = (px, pz, L) => {
  const ux = -L.dir.x, uz = -L.dir.z, t = clamp(px * ux + pz * uz, 0, L.spot.length() + 2);
  return Math.hypot(px - ux * t, pz - uz * t);
};

export function buildTrees() {
  // scattered at random, but not on roads or buildings
  let placed = 0;
  for (let i = 0; i < 260 && placed < 55; i++) {
    const a = rnd() * Math.PI * 2, r = 10 + rnd() * 34, x = Math.cos(a) * r, z = Math.sin(a) * r;
    let ok = true;
    for (const k in LOC) {
      const L = LOC[k];
      if (!L.dir) continue;
      if (segD(x, z, L) < 3 || Math.hypot(x - L.x, z - L.z) < L.clear) ok = false;
    }
    if (ok) { tree(x, z, .8 + rnd() * .6); placed++; }
  }
  // three fixed trees in the park
  for (const [lx, lz] of [[-4.5, -1], [4.5, -1], [0, -4.5]]) {
    const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), LOC.park.rot);
    tree(LOC.park.x + v.x, LOC.park.z + v.z, 1.1);
  }
}
