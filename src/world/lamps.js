import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, bulbMat } from '../helpers.js';
import { LOC } from './locations.js';

// Lantaarns rond het plein, tussen de wegen. Elke tweede krijgt een echt lichtpunt.
export const lamps = [];

export function buildLamps() {
  const ra = Object.values(LOC).filter(L => L.ang !== undefined).map(L => L.ang).sort((a, b) => a - b);
  ra.forEach((a, i) => {
    let b = ra[(i + 1) % ra.length];
    if (b < a) b += Math.PI * 2;
    const m = (a + b) / 2, x = Math.cos(m) * 7.6, z = Math.sin(m) * 7.6;
    mesh(new THREE.CylinderGeometry(.08, .1, 3, 6), mat(0x30475e), x, 1.5, z);
    mesh(new THREE.SphereGeometry(.28, 12, 8), bulbMat, x, 3.1, z);
    if (i % 2 === 0) {
      const pl = new THREE.PointLight(0xffc46b, 0, 14, 2);
      pl.position.set(x, 3, z);
      scene.add(pl);
      lamps.push(pl);
    }
  });
}
