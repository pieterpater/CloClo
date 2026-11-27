import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC } from './locations.js';

// A small ice cream stand with a striped awning and a giant cone on the roof.
export function buildIceCream() {
  const L = LOC.icecream;
  const g = new THREE.Group();
  g.position.set(L.x, 0, L.z);
  g.rotation.y = L.rot;
  scene.add(g);
  mesh(box(3.2, 1.1, 1.4), mat(0xfff1f5), 0, .55, 0, g);
  mesh(box(3.4, .12, 1.6), mat(0xffc8dd), 0, 1.16, 0, g);
  for (const x of [-1.5, 1.5]) mesh(new THREE.CylinderGeometry(.07, .07, 2, 6), mat(0xffffff), x, 2.1, -.5, g);
  mesh(box(3.4, 1.6, .1), mat(0xfff1f5), 0, 2, -.6, g);
  // striped awning
  for (let i = 0; i < 7; i++) {
    const s = mesh(box(3.6 / 7, .1, 1.7), mat(i % 2 ? 0xffffff : 0xff8fab), -1.8 + 3.6 / 14 + i * 3.6 / 7, 3, .15, g);
    s.rotation.x = .25;
  }
  // tubs of ice cream on the counter
  [0xffc8dd, 0xbde0fe, 0xfff3b0, 0x8d6346].forEach((c, i) => mesh(new THREE.SphereGeometry(.2, 10, 8), mat(c), -1.1 + i * .73, 1.3, .25, g));
  // giant cone on the roof
  const cone = mesh(new THREE.ConeGeometry(.55, 1.4, 12), mat(0xf4a261), 0, 3.85, -.4, g);
  cone.rotation.x = Math.PI;
  mesh(new THREE.SphereGeometry(.6, 14, 10), mat(0xff8fab), 0, 4.65, -.4, g);
  mesh(new THREE.SphereGeometry(.12, 8, 6), mat(0xe63946), 0, 5.3, -.4, g);
  // a sun umbrella with a little table next to it
  mesh(new THREE.CylinderGeometry(.05, .05, 2.2, 6), mat(0xffffff), 2.9, 1.1, 1.2, g);
  mesh(new THREE.ConeGeometry(1.2, .5, 8), mat(0x4cc9f0), 2.9, 2.35, 1.2, g);
  mesh(new THREE.CylinderGeometry(.45, .45, .06, 12), mat(0xffffff), 2.9, .75, 1.2, g);
}
