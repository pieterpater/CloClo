import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box, rnd } from '../helpers.js';
import { LOC } from './locations.js';

const butterflies = [];
const centre = new THREE.Vector3();

// A flower meadow with butterflies and a bench.
export function buildMeadow() {
  const L = LOC.meadow;
  const g = new THREE.Group();
  g.position.set(L.x, 0, L.z);
  g.rotation.y = L.rot;
  scene.add(g);
  const patch = mesh(new THREE.CircleGeometry(4, 28), mat(0x5fa86f), 0, .015, 0, g);
  patch.rotation.x = -Math.PI / 2;
  patch.castShadow = false;
  const colours = [0xff8fab, 0xffd166, 0xffffff, 0xbde0fe, 0xc77dff];
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = 1 + rnd() * 2.8, x = Math.cos(a) * r, z = Math.sin(a) * r - .6;
    if (z > 1.4 && Math.abs(x) < 1.2) continue; // keep CloClo's spot free
    const s = .7 + rnd() * .5;
    mesh(new THREE.CylinderGeometry(.025, .025, .45 * s, 4), mat(0x2d6a4f), x, .22 * s, z, g);
    mesh(new THREE.IcosahedronGeometry(.12 * s), mat(colours[Math.floor(rnd() * colours.length)]), x, .47 * s, z, g);
  }
  // bench
  mesh(box(1.6, .1, .5), mat(0x8a5a3b), 0, .45, -3.6, g);
  mesh(box(1.6, .5, .08), mat(0x8a5a3b), 0, .75, -3.85, g);
  for (const x of [-.65, .65]) mesh(box(.1, .45, .45), mat(0x8a5a3b), x, .22, -3.6, g);

  const wingC = [0xffd166, 0x4cc9f0, 0xff8fab, 0xffffff, 0xc77dff];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: wingC[i], side: THREE.DoubleSide, roughness: .6 });
    const wings = [-1, 1].map(s => {
      const hinge = new THREE.Group();
      b.add(hinge);
      const w = new THREE.Mesh(new THREE.CircleGeometry(.14, 8), m);
      w.position.x = s * .13;
      w.rotation.x = -Math.PI / 2;
      w.scale.y = .8;
      w.castShadow = true;
      hinge.add(w);
      return hinge;
    });
    mesh(new THREE.CylinderGeometry(.02, .02, .2, 4), mat(0x14213d), 0, 0, 0, b).rotation.x = Math.PI / 2;
    b.userData = { wings, phase: i * 1.3, r: 1.4 + i * .35, speed: .5 + i * .08 };
    scene.add(b);
    butterflies.push(b);
  }
}

// Butterflies flutter around the meadow, or around CloClo when he chases them.
export function updateMeadow(anim, rd, chaseAt) {
  const L = LOC.meadow;
  const target = chaseAt ? chaseAt : centre.set(L.x, 0, L.z);
  butterflies.forEach(b => {
    const u = b.userData, t = anim * u.speed + u.phase;
    const r = chaseAt ? .9 + u.r * .3 : u.r;
    const x = target.x + Math.cos(t) * r + Math.sin(t * 2.3) * .3;
    const z = target.z + Math.sin(t) * r;
    const y = (chaseAt ? chaseAt.y + 1.4 : .9) + Math.sin(t * 3.1) * .35;
    const dx = x - b.position.x, dz = z - b.position.z;
    b.position.x += dx * Math.min(1, rd * 3);
    b.position.z += dz * Math.min(1, rd * 3);
    b.position.y += (y - b.position.y) * Math.min(1, rd * 3);
    b.rotation.y = Math.atan2(dx, dz);
    const flap = Math.sin(anim * 18 + u.phase) * .9;
    u.wings[0].rotation.z = flap;
    u.wings[1].rotation.z = -flap;
  });
}
