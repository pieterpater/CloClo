import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';

// Biscuit, the village cat. She strolls around the square, naps by the fountain at night,
// and comes over when CloClo wants to play.
export const cat = { group: null, meetAt: null, lookAt: null };

const RING = 4.4;
let queue = [], idle = 0, face = 0, parts = null;
const tmp = new THREE.Vector3();

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
  cat.group = g;
  parts = { body, head, legs, tail };
}

const ringPt = a => new THREE.Vector3(Math.cos(a) * RING, 0, Math.sin(a) * RING);

// Walk via the ring around the fountain, like CloClo does.
function path(to) {
  const p = cat.group.position, a1 = Math.atan2(p.z, p.x), a2 = Math.atan2(to.z, to.x);
  let d = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
  const q = [];
  if (Math.abs(d) > .6) {
    q.push(ringPt(a1));
    const n = Math.ceil(Math.abs(d) / .35);
    for (let i = 1; i <= n; i++) q.push(ringPt(a1 + d * i / n));
  }
  q.push(to.clone());
  return q;
}

// CloClo calls Biscuit to a spot on the square; she looks at `lookAt` once there.
export function catMeet(point, lookAt) {
  cat.meetAt = point.clone();
  cat.lookAt = lookAt.clone();
  queue = path(point);
}
export function catRelease() {
  cat.meetAt = cat.lookAt = null;
  queue = [];
  idle = 5;
}
export const catArrived = () => cat.meetAt && !queue.length;

export function updateCat(gd, rd, anim, isNight) {
  const g = cat.group;
  if (!cat.meetAt && !queue.length) {
    idle -= gd;
    if (idle < 0 && !isNight) {
      const a = Math.atan2(g.position.z, g.position.x) + (Math.random() - .5) * 2.4, r = 2.6 + Math.random() * 3.6;
      queue = path(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      idle = 8 + Math.random() * 25;
    } else if (idle < 0 && isNight) {
      const a = Math.atan2(g.position.z, g.position.x);
      queue = path(new THREE.Vector3(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4));
      idle = 60;
    }
  }
  let step = 3 * gd, walking = queue.length > 0;
  while (step > 0 && queue.length) {
    tmp.subVectors(queue[0], g.position);
    tmp.y = 0;
    const d = tmp.length();
    if (d <= step) { g.position.copy(queue[0]); queue.shift(); step -= d; }
    else { g.position.addScaledVector(tmp, step / d); face = Math.atan2(tmp.x, tmp.z); step = 0; }
  }
  if (!walking && cat.lookAt) face = Math.atan2(cat.lookAt.x - g.position.x, cat.lookAt.z - g.position.z);
  let dr = face - g.rotation.y;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  g.rotation.y += dr * Math.min(1, rd * 6);

  // animation
  const { body, head, legs, tail } = parts;
  const sleeping = isNight && !walking && !cat.meetAt;
  const w = anim * 12;
  legs.forEach(l => l.visible = !sleeping);
  legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(w + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .6 : 0);
  body.position.y = walking ? Math.abs(Math.sin(w)) * .03 : 0;
  body.scale.set(1, sleeping ? .75 : 1 + Math.sin(anim * 2) * .02, 1);
  body.rotation.x = sleeping ? .15 : 0;
  head.rotation.x = sleeping ? .5 : Math.sin(anim * .7) * .1;
  head.rotation.y = sleeping ? .8 : cat.meetAt && !walking ? Math.sin(anim * 3) * .25 : Math.sin(anim * .4) * .3;
  tail.rotation.z = Math.sin(anim * (cat.meetAt ? 6 : 2)) * (sleeping ? .1 : .45);
  tail.rotation.x = sleeping ? 1.2 : 0;
}
