import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';

// Draws Pip the puppy. Where he is and what he does comes from the simulation (sim/pip.js).
let group = null, parts = null, trickT = 0, lastTries = -1, walkBlend = 0, spin = 0;

export function buildPip() {
  const g = new THREE.Group();
  const fur = mat(0xe9c46a), light = mat(0xfff3d6), ear = mat(0x9c6644), dark = new THREE.MeshStandardMaterial({ color: 0x14213d, roughness: .3 });
  const body = new THREE.Group();
  g.add(body);
  mesh(new THREE.SphereGeometry(.3, 14, 10), fur, 0, .42, 0, body).scale.set(1, .85, 1.5);
  mesh(new THREE.SphereGeometry(.18, 10, 8), light, 0, .38, .26, body).scale.set(1, .9, .6);
  mesh(new THREE.TorusGeometry(.16, .035, 6, 14), mat(0xe63946), 0, .6, .38, body).rotation.x = Math.PI / 2.3; // collar
  const head = new THREE.Group();
  head.position.set(0, .68, .46);
  body.add(head);
  mesh(new THREE.SphereGeometry(.24, 14, 10), fur, 0, 0, 0, head);
  mesh(new THREE.SphereGeometry(.13, 10, 8), light, 0, -.06, .18, head).scale.set(1.1, .8, 1);
  mesh(new THREE.SphereGeometry(.05, 8, 6), dark, 0, -.02, .3, head); // nose
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(.04, 8, 6), dark, s * .1, .06, .2, head);
    const e = mesh(new THREE.SphereGeometry(.1, 8, 6), ear, s * .2, .02, -.02, head);
    e.scale.set(.6, 1.4, .9);
    e.rotation.z = s * .4;
  }
  const tongue = mesh(new THREE.SphereGeometry(.05, 8, 6), mat(0xff8fab), 0, -.14, .22, head);
  tongue.scale.set(1, .5, 1.3);
  const legs = [[-.14, .24], [.14, .24], [-.14, -.24], [.14, -.24]].map(([x, z]) => {
    const l = new THREE.Group();
    l.position.set(x, .26, z);
    g.add(l);
    mesh(new THREE.CylinderGeometry(.055, .05, .26, 6), fur, 0, -.13, 0, l);
    return l;
  });
  const tail = new THREE.Group();
  tail.position.set(0, .55, -.42);
  body.add(tail);
  const t = mesh(new THREE.CylinderGeometry(.03, .05, .32, 6), fur, 0, .14, -.04, tail);
  t.rotation.x = -.5;
  const ball = mesh(new THREE.SphereGeometry(.12, 10, 8), mat(0xc7f464), 0, -.16, .26, head);
  ball.visible = false;
  scene.add(g);
  group = g;
  parts = { body, head, legs, tail, tongue, ball };
}

// p: { x, z, face, mode, doing, walking, sleeping, tries } from the simulation
export function updatePip(p, rd, anim) {
  const g = group, { body, head, legs, tail, tongue, ball } = parts;
  g.position.set(p.x, 0, p.z);
  let dr = p.face - g.rotation.y;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  g.rotation.y += dr * Math.min(1, rd * 8);

  // rest pose
  body.position.set(0, 0, 0);
  body.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);
  legs.forEach(l => { l.rotation.set(0, 0, 0); l.visible = true; });
  ball.visible = false;
  tongue.visible = true;

  // a new try at a trick starts the animation from the beginning
  if (p.tries !== lastTries) { trickT = 0; lastTries = p.tries; }
  trickT += rd;

  // blend the trot in and out, so a short pause doesn't make his legs snap still
  walkBlend += ((p.walking ? 1 : 0) - walkBlend) * Math.min(1, rd * 8);
  const w = anim * 14;
  legs.forEach((l, i) => l.rotation.x = Math.sin(w + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .7 * walkBlend);
  body.position.y = Math.abs(Math.sin(w)) * .05 * walkBlend;
  if (p.walking) {
    if (p.doing === 'jump') body.position.y = Math.abs(Math.sin(anim * 5)) * .7; // bounding over the hurdle
    if (p.doing === 'fetch') ball.visible = true;
  } else if (p.sleeping) {
    body.position.y = -.18;
    body.rotation.x = .1;
    head.rotation.set(.5, .6, 0);
    legs.forEach(l => l.visible = false);
    tongue.visible = false;
  } else if (p.doing === 'sit' || p.doing === 'paw') {
    body.rotation.x = -.55;
    body.position.y = -.05;
    legs[2].visible = legs[3].visible = false;
    if (p.doing === 'paw') legs[1].rotation.x = -1.3 + Math.sin(anim * 6) * .15;
  } else if (p.doing === 'roll_over') {
    const t = Math.min(1, trickT / 1.2);
    body.rotation.z = t * Math.PI * 2;
    body.position.y = Math.sin(t * Math.PI) * .15;
  } else if (p.doing === 'fetch') {
    ball.visible = true;
  }
  // didn't get it: chases his own tail instead (the whole body spins, his heading stays smooth)
  spin = p.doing === 'oops' && !p.walking ? spin + rd * 7 : spin * Math.max(0, 1 - rd * 6);
  body.rotation.y = spin;
  // always a waggy tail, faster when he's with CloClo
  tail.rotation.z = Math.sin(anim * (p.mode === 'home' ? 6 : 14)) * (p.sleeping ? .05 : .6);
  if (!p.sleeping) head.rotation.z = Math.sin(anim * 1.3) * .12;
}
