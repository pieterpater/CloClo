import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC } from './locations.js';
import { SIZE } from '../sim/blocks.js';
import { emit } from '../particles.js';

// Draws the block yard and whatever CloClo has built there (the blocks themselves come from sim/blocks.js).
const CELL = .9, BLOCK = .84;
const COLOURS = { r: 0xe63946, o: 0xf4a261, y: 0xffd166, g: 0x52b788, b: 0x4cc9f0, p: 0x9b5de5, w: 0xf8f9fa };
const geo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
let group = null, last = null;
const meshes = new Map(); // "x,z,level" → mesh
const tmp = new THREE.Vector3();

export function buildBlockYard() {
  const L = LOC.blocks;
  group = new THREE.Group();
  group.position.set(L.x, 0, L.z);
  group.rotation.y = L.rot;
  scene.add(group);
  // sandy plot with a low wooden edge
  const plot = mesh(box(SIZE * CELL + .6, .1, SIZE * CELL + .6), mat(0xf2d7a1), 0, .05, 0, group);
  plot.castShadow = false;
  const edge = SIZE * CELL / 2 + .35;
  for (const s of [-1, 1]) {
    mesh(box(SIZE * CELL + .8, .25, .15), mat(0x8a5a3b), 0, .12, s * edge, group);
    mesh(box(.15, .25, SIZE * CELL + .8), mat(0x8a5a3b), s * edge, .12, 0, group);
  }
  // a crate with spare blocks beside the yard
  mesh(box(1.1, .6, 1.1), mat(0x8a5a3b), edge + 1.1, .3, 1.6, group);
  'rgbyp'.split('').forEach((c, i) => {
    const b = mesh(new THREE.BoxGeometry(.4, .4, .4), mat(COLOURS[c]), edge + .8 + (i % 3) * .3, .75 + Math.floor(i / 3) * .3, 1.4 + (i % 2) * .35, group);
    b.rotation.y = i * .7;
  });
}

// yard: the compact string from the simulation, e.g. "rry,,b,…" (one group per spot, bottom to top)
export function updateBlockYard(yard, anim) {
  if (yard !== last) {
    const firstTime = last === null;
    const cols = yard.split(',');
    const want = new Map();
    for (let i = 0; i < SIZE * SIZE; i++) {
      const x = i % SIZE, z = Math.floor(i / SIZE);
      [...(cols[i] || '')].forEach((c, level) => want.set(`${x},${z},${level}`, c));
    }
    // remove blocks that are gone or changed colour
    for (const [key, m] of meshes) {
      if (want.get(key) !== m.userData.c) {
        group.remove(m);
        meshes.delete(key);
      }
    }
    // add new ones; they pop in (except when the page has just opened)
    for (const [key, c] of want) {
      if (meshes.has(key)) continue;
      const [x, z, level] = key.split(',').map(Number);
      const m = mesh(geo, mat(COLOURS[c] ?? 0xffffff), -2.25 + x * CELL, .1 + BLOCK / 2 + level * BLOCK, 2.25 - z * CELL, group);
      m.userData = { c, born: firstTime ? -10 : anim };
      meshes.set(key, m);
      if (!firstTime) emit('sparkle', m.getWorldPosition(tmp).setY(m.position.y + .6));
    }
    last = yard;
  }
  // pop-in: a quick bouncy grow
  for (const m of meshes.values()) {
    const t = (anim - m.userData.born) / .35;
    if (t < 1) m.scale.setScalar(Math.max(.01, 1 + Math.sin(t * Math.PI) * .25 - (1 - t) * .9));
    else if (m.scale.x !== 1) m.scale.setScalar(1);
  }
}
