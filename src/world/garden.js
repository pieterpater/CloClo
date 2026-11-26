import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC } from './locations.js';

// groei: schaal van de plantjes; CloClo laat ze groeien door water te geven.
export const garden = { groei: .6, plants: [] };

export function buildGarden() {
  const gt = new THREE.Group();
  gt.position.set(LOC.tuin.x, 0, LOC.tuin.z);
  gt.rotation.y = LOC.tuin.rot;
  scene.add(gt);
  for (let r = 0; r < 3; r++) {
    mesh(box(5, .3, .9), mat(0x8d6346), 0, .15, -r * 1.6, gt);
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Group();
      p.position.set(-2 + i, .3, -r * 1.6);
      gt.add(p);
      mesh(new THREE.CylinderGeometry(.05, .05, .5, 5), mat(0x2d6a4f), 0, .25, 0, p);
      mesh(new THREE.IcosahedronGeometry(.25), mat(r === 1 ? 0xe63946 : r ? 0xf4a261 : 0x52b788), 0, .55, 0, p);
      p.scale.setScalar(.6);
      garden.plants.push(p);
    }
  }
}

// Zonder water krimpen de plantjes heel langzaam.
export function updateGarden(gd) {
  garden.groei = Math.max(.5, garden.groei - gd * .0004);
  garden.plants.forEach((p, i) => p.scale.setScalar(garden.groei * (.9 + (i % 3) * .08)));
}
