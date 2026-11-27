import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box, bulbMat } from '../helpers.js';
import { LOC, heightAt } from './locations.js';
import { lamps } from './lamps.js';
import { emit } from '../particles.js';

// Draws the block yard (his workshop with the crate) and all blocks in the village (they come from sim/blocks.js).
// the yard's sandy plot keeps its old size; blocks themselves stand on the village grid (1 m spots)
const SIZE = 8, CELL = .9, BLOCK = .94;
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
  const plot = mesh(box(SIZE * CELL + .6, .1, SIZE * CELL + .6), mat(0xd2b787), 0, .05, 0, group);
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

  // string lights between two posts at the back corners, and a lamp, so he can see what he builds at night
  const postH = 5.2, corners = [[-edge - .3, -edge - .3], [edge + .3, -edge - .3]];
  for (const [x, z] of corners) {
    mesh(new THREE.CylinderGeometry(.08, .1, postH, 6), mat(0x8a5a3b), x, postH / 2, z, group);
    mesh(new THREE.SphereGeometry(.18, 10, 8), bulbMat, x, postH + .1, z, group);
  }
  const [a, b] = corners, n = 13;
  for (let i = 1; i < n; i++) {
    const t = i / n, sag = Math.sin(t * Math.PI) * .9;
    mesh(new THREE.SphereGeometry(.09, 8, 6), bulbMat, a[0] + (b[0] - a[0]) * t, postH - .15 - sag, a[1], group).castShadow = false;
  }
  const light = new THREE.PointLight(0xffc46b, 0, 16, 2);
  light.position.set(0, postH + .4, edge * .4); // above the middle, a bit to the front, so the faces he looks at are lit
  group.add(light);
  lamps.push(light); // lighting.js turns it on at dusk, like the street lamps
}

// yard: the compact string from the simulation, "x,z:letters;…" per stack ('.' = empty level),
// with x, z spots on the village grid (1 m apart)
export function updateBlockYard(yard, anim) {
  if (yard != null && yard !== last) {
    const firstTime = last === null;
    const want = new Map();
    for (const part of yard ? yard.split(';') : []) {
      const [k, letters = ''] = part.split(':');
      [...letters].forEach((c, level) => { if (c !== '.') want.set(`${k},${level}`, c); });
    }
    // remove blocks that are gone or changed colour (a few sparkles when he tidies up)
    let sparkles = 0;
    for (const [k, m] of meshes) {
      if (want.get(k) !== m.userData.c) {
        if (!firstTime && sparkles++ < 3) emit('sparkle', m.position);
        scene.remove(m);
        meshes.delete(k);
      }
    }
    // add new ones; they pop in (except when the page has just opened)
    for (const [k, c] of want) {
      if (meshes.has(k)) continue;
      const [x, z, level] = k.split(',').map(Number);
      const m = mesh(geo, mat(COLOURS[c] ?? 0xffffff), x, heightAt(x, z) + BLOCK / 2 + level * BLOCK, z);
      m.userData = { c, born: firstTime ? -10 : anim };
      meshes.set(k, m);
      if (!firstTime) emit('sparkle', tmp.copy(m.position).setY(m.position.y + .7));
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
