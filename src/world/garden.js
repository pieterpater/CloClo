import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC } from './locations.js';

// The plants are drawn here; how big they are comes from the simulation (sim/garden.js).
const plants = [];

export function buildGarden() {
  const g = new THREE.Group();
  g.position.set(LOC.garden.x, 0, LOC.garden.z);
  g.rotation.y = LOC.garden.rot;
  scene.add(g);
  for (let r = 0; r < 3; r++) {
    mesh(box(5, .3, .9), mat(0x8d6346), 0, .15, -r * 1.6, g);
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Group();
      p.position.set(-2 + i, .3, -r * 1.6);
      g.add(p);
      mesh(new THREE.CylinderGeometry(.05, .05, .5, 5), mat(0x2d6a4f), 0, .25, 0, p);
      mesh(new THREE.IcosahedronGeometry(.25), mat(r === 1 ? 0xe63946 : r ? 0xf4a261 : 0x52b788), 0, .55, 0, p);
      p.scale.setScalar(.6);
      plants.push(p);
    }
  }
}

export function updateGarden(growth) {
  plants.forEach((p, i) => p.scale.setScalar(growth * (.9 + (i % 3) * .08)));
}
