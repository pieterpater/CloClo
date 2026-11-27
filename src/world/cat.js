import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';

// Draws Biscuit, the village cat. Where she goes and what she does comes from the simulation (sim/cat.js).
let group = null, parts = null;

export function buildCat() {
  const g = new THREE.Group();
  const fur = mat(0xf4a261), light = mat(0xfff1e0), dark = new THREE.MeshStandardMaterial({ color: 0x14213d, roughness: .3 });
  const body = new THREE.Group();
  g.add(body);
  mesh(new THREE.SphereGeometry(.26, 14, 10), fur, 0, .36, 0, body).scale.set(1, .85, 1.45);
  mesh(new THREE.SphereGeometry(.16, 10, 8), light, 0, .33, .22, body).scale.set(1, .9, .6);
  const head = new THREE.Group();
  head.position.set(0, .58, .36);
  body.add(head);
  mesh(new THREE.SphereGeometry(.21, 14, 10), fur, 0, 0, 0, head).scale.set(1.1, .95, 1);
  mesh(new THREE.SphereGeometry(.1, 10, 8), light, 0, -.06, .15, head).scale.set(1.3, .8, .8);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(.08, .17, 4), fur, s * .12, .2, -.02, head);
    ear.rotation.z = -s * .25;
    mesh(new THREE.SphereGeometry(.035, 8, 6), dark, s * .08, .03, .18, head);
    for (const k of [-1, 1]) {
      const w = mesh(box(.16, .008, .008), light, s * .17, -.06 + k * .02, .16, head);
      w.rotation.z = s * k * .15;
    }
  }
  mesh(new THREE.SphereGeometry(.025, 6, 4), mat(0xff8fab), 0, -.03, .21, head);
  const legs = [[-.12, .2], [.12, .2], [-.12, -.2], [.12, -.2]].map(([x, z]) => mesh(new THREE.CylinderGeometry(.05, .05, .2, 6), fur, x, .1, z, g));
  const tail = new THREE.Group();
  tail.position.set(0, .45, -.32);
  body.add(tail);
  const t1 = mesh(new THREE.CylinderGeometry(.04, .05, .45, 6), fur, 0, .2, -.05, tail);
  t1.rotation.x = -.3;
  mesh(new THREE.SphereGeometry(.055, 8, 6), light, 0, .42, -.12, tail);
  g.position.set(4, 0, 3);
  scene.add(g);
  group = g;
  parts = { body, head, legs, tail };
}

// c: { x, z, face, walking, sleeping, meeting } from the simulation
export function updateCat(c, rd, anim) {
  const g = group;
  g.position.set(c.x, 0, c.z);
  let dr = c.face - g.rotation.y;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  g.rotation.y += dr * Math.min(1, rd * 6);

  // animation
  const { body, head, legs, tail } = parts;
  const { walking, sleeping, meeting } = c;
  const w = anim * 12;
  legs.forEach(l => l.visible = !sleeping);
  legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(w + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .6 : 0);
  body.position.y = walking ? Math.abs(Math.sin(w)) * .03 : 0;
  body.scale.set(1, sleeping ? .75 : 1 + Math.sin(anim * 2) * .02, 1);
  body.rotation.x = sleeping ? .15 : 0;
  head.rotation.x = sleeping ? .5 : Math.sin(anim * .7) * .1;
  head.rotation.y = sleeping ? .8 : meeting && !walking ? Math.sin(anim * 3) * .25 : Math.sin(anim * .4) * .3;
  tail.rotation.z = Math.sin(anim * (meeting ? 6 : 2)) * (sleeping ? .1 : .45);
  tail.rotation.x = sleeping ? 1.2 : 0;
}
