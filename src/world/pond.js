import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, rnd } from '../helpers.js';
import { LOC } from './locations.js';

let ducks = [];

export function buildPond() {
  const g = new THREE.Group();
  g.position.set(LOC.pond.x, 0, LOC.pond.z);
  g.rotation.y = LOC.pond.rot;
  scene.add(g);
  const water = mesh(new THREE.CylinderGeometry(4.4, 4.4, .08, 36), new THREE.MeshStandardMaterial({ color: 0x4cc9f0, roughness: .2, metalness: .1 }), 0, .06, 0, g);
  water.castShadow = false;
  // stones all around, with a gap on the side of the path
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2;
    if (Math.abs(Math.sin(a / 2)) < .12) continue;
    mesh(new THREE.DodecahedronGeometry(.35 + rnd() * .2), mat(0xb8b8b0), Math.sin(a) * 4.6, .15, Math.cos(a) * 4.6, g);
  }
  ducks = [0, 1].map(i => {
    const d = new THREE.Group();
    mesh(new THREE.SphereGeometry(.35, 10, 8), mat(i ? 0xffffff : 0xffd166), 0, .3, 0, d).scale.set(1, .8, 1.3);
    mesh(new THREE.SphereGeometry(.22, 10, 8), mat(i ? 0xffffff : 0xffd166), 0, .65, .35, d);
    const bk = mesh(new THREE.ConeGeometry(.08, .25, 6), mat(0xff9f1c), 0, .62, .62, d);
    bk.rotation.x = Math.PI / 2;
    g.add(d);
    return d;
  });
}

export function updatePond(anim) {
  ducks.forEach((d, i) => {
    const a = anim * .25 + i * Math.PI;
    d.position.set(Math.cos(a) * 2.6, .08 + Math.sin(anim * 2 + i) * .03, Math.sin(a) * 2.6);
    d.rotation.y = -a;
  });
}
