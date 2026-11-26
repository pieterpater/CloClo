import * as THREE from 'three';
import { mesh, mat, box } from '../helpers.js';
import { LOC } from './locations.js';

export function buildGround() {
  const ground = mesh(new THREE.CircleGeometry(48, 48), mat(0x8fd07e), 0, 0, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  const plaza = mesh(new THREE.CylinderGeometry(7, 7, .06, 40), mat(0xeadfc8), 0, .03, 0);
  plaza.castShadow = false;
}

// Een weg van de rand van het plein naar elke plek.
export function buildRoads() {
  for (const k in LOC) {
    const L = LOC[k];
    if (!L.dir) continue;
    const S = L.spot.length() + (L.b ? .4 : 0), Ls = S - 5, u = L.dir.clone().negate();
    const road = mesh(box(2.6, .04, Ls), mat(0xdccba8), u.x * (5 + Ls / 2), .02, u.z * (5 + Ls / 2));
    road.rotation.y = L.rot;
    road.castShadow = false;
  }
}
