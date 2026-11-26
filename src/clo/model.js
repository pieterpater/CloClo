import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat } from '../helpers.js';

// Het 3D-model van CloClo. `clo` is de hele figuur, `body` alles behalve de voetjes.
export function buildCloClo() {
  const clo = new THREE.Group();
  scene.add(clo);
  const body = new THREE.Group();
  clo.add(body);
  const tealM = new THREE.MeshStandardMaterial({ color: 0x5fd3c4, roughness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14213d, roughness: .3 });

  mesh(new THREE.SphereGeometry(.9, 28, 20), tealM, 0, .95, 0, body).scale.y = .95;
  mesh(new THREE.SphereGeometry(.6, 20, 14), new THREE.MeshStandardMaterial({ color: 0xc9f5ee, roughness: .6 }), 0, .78, .5, body).scale.z = .45;

  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * .3, 1.25, .7);
    body.add(e);
    mesh(new THREE.SphereGeometry(.27, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3 }), 0, 0, 0, e);
    mesh(new THREE.SphereGeometry(.14, 12, 10), dark, 0, 0, .2, e);
    mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), .05, .06, .32, e);
    eyes.push(e);
  }

  // hoorntjes
  for (const s of [-1, 1]) {
    const h = mesh(new THREE.ConeGeometry(.14, .45, 10), new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: .5 }), s * .42, 1.78, 0, body);
    h.rotation.z = -s * .35;
  }

  const mouth = mesh(new THREE.TorusGeometry(.12, .035, 8, 16, Math.PI), dark, 0, .98, .86, body);
  mouth.rotation.z = Math.PI;

  const feet = [-1, 1].map(s => {
    const f = mesh(new THREE.SphereGeometry(.26, 12, 10), new THREE.MeshStandardMaterial({ color: 0x3fb0a2, roughness: .6 }), s * .38, .14, .2, clo);
    f.scale.set(1, .6, 1.3);
    return f;
  });
  const arms = [-1, 1].map(s => {
    const a = new THREE.Group();
    a.position.set(s * .82, .95, .05);
    body.add(a);
    mesh(new THREE.SphereGeometry(.18, 10, 8), tealM, s * .1, -.15, 0, a).scale.set(.8, 1.3, .8);
    return a;
  });

  // spullen in zijn rechterhand
  const rod = new THREE.Group();
  arms[1].add(rod);
  mesh(new THREE.CylinderGeometry(.03, .03, 2.2, 5), mat(0x8a5a3b), 0, .7, .6, rod).rotation.x = .9;
  rod.visible = false;
  const can = new THREE.Group();
  arms[1].add(can);
  mesh(new THREE.CylinderGeometry(.18, .2, .35, 10), mat(0x4ea8de), .1, -.35, .2, can);
  can.visible = false;

  return { clo, body, eyes, mouth, feet, arms, rod, can };
}
