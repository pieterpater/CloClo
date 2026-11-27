import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box, winMat } from '../helpers.js';
import { LOC, NEIGHBOURS } from './locations.js';

function building(L) {
  const o = L.b, g = new THREE.Group();
  g.position.set(L.x, 0, L.z);
  g.rotation.y = L.rot;
  scene.add(g);
  mesh(box(o.w, o.h, o.d), mat(o.wall), 0, o.h / 2, 0, g);
  const hs = o.w / 2 + .45, rg = new THREE.ConeGeometry(hs * Math.SQRT2, 2.4, 4);
  rg.rotateY(Math.PI / 4);
  const roof = mesh(rg, mat(o.roof), 0, o.h + 1.2, 0, g);
  roof.scale.z = (o.d / 2 + .45) / hs;
  mesh(box(1.2, 2, .12), mat(0x8a5a3b), 0, 1, o.d / 2 + .06, g);
  for (const x of [-o.w / 2 + 1.05, o.w / 2 - 1.05]) mesh(box(.9, .9, .1), winMat, x, o.h * .6, o.d / 2 + .05, g);
  for (const s of [-1, 1]) mesh(box(.1, .9, .9), winMat, s * (o.w / 2 + .05), o.h * .6, 0, g);
  return g;
}

export function buildBuildings() {
  // house with chimney
  const house = building(LOC.home);
  mesh(box(.6, 1.6, .6), mat(0xb5838d), 1.2, LOC.home.b.h + 1.6, -.6, house);

  // bakery with awning and sign
  const bakery = building(LOC.bakery);
  const aw = mesh(box(5.6, .15, 1.4), mat(0xff8fab), 0, 2.55, 2.85, bakery);
  aw.rotation.x = .35;
  mesh(new THREE.CylinderGeometry(.7, .7, .1, 16), mat(0xffffff), 2.2, 1, 4.3, bakery);
  mesh(new THREE.CylinderGeometry(.08, .08, 1, 6), mat(0x8a5a3b), 2.2, .5, 4.3, bakery);

  // library with columns and steps
  const library = building(LOC.library);
  for (const x of [-1.4, 1.4]) mesh(new THREE.CylinderGeometry(.22, .22, 3.4, 10), mat(0xffffff), x, 1.7, 2.9, library);
  mesh(box(4, .25, 1), mat(0xd6d0c4), 0, .12, 3, library);

  // post office with a red mailbox and an envelope sign
  const post = building(LOC.post);
  const o = LOC.post.b;
  mesh(new THREE.CylinderGeometry(.08, .08, 1.1, 6), mat(0x30475e), 1.75, .55, o.d / 2 + 1.25, post);
  mesh(box(.6, .7, .45), mat(0xd62828), 1.75, 1.35, o.d / 2 + 1.25, post);
  const lid = mesh(new THREE.CylinderGeometry(.3, .3, .45, 12, 1, false, 0, Math.PI), mat(0xd62828), 1.75, 1.7, o.d / 2 + 1.25, post);
  lid.rotation.set(0, Math.PI / 2, Math.PI / 2);
  mesh(box(.4, .05, .02), mat(0x14213d), 1.75, 1.5, o.d / 2 + 1.48, post);
  mesh(box(1.3, .85, .08), mat(0xffffff), 0, o.h - .2, o.d / 2 + .08, post);
  const flap = mesh(box(.92, .92, .06), mat(0xd62828), 0, o.h - .05, o.d / 2 + .1, post);
  flap.rotation.z = Math.PI / 4;
  flap.scale.set(1, .55, 1);

  // little picket fence and flower boxes at CloClo's house
  const h = LOC.home.b;
  for (let i = 0; i < 7; i++) {
    for (const s of [-1, 1]) mesh(box(.12, .7, .08), mat(0xffffff), s * (1.45 + i * .3), .35, h.d / 2 + 2.2, house);
  }
  for (const s of [-1, 1]) {
    mesh(box(2, .08, .06), mat(0xffffff), s * 2.35, .5, h.d / 2 + 2.2, house);
    mesh(box(1, .22, .25), mat(0x8a5a3b), s * (h.w / 2 - 1.05), h.h * .6 - .55, h.d / 2 + .2, house);
    for (const x of [-.3, 0, .3]) mesh(new THREE.IcosahedronGeometry(.13), mat(x ? 0xff8fab : 0xffd166), s * (h.w / 2 - 1.05) + x, h.h * .6 - .38, h.d / 2 + .22, house);
  }

  // Pip's doghouse beside CloClo's house
  const dh = new THREE.Group();
  dh.position.set(4.3, 0, 1.4);
  house.add(dh);
  mesh(box(1.4, 1, 1.4), mat(0xd4a373), 0, .5, 0, dh);
  const dr = mesh(new THREE.ConeGeometry(1.15, .8, 4), mat(0x7f5539), 0, 1.4, 0, dh);
  dr.rotation.y = Math.PI / 4;
  mesh(new THREE.CylinderGeometry(.32, .32, .05, 12, 1, false, 0, Math.PI), mat(0x3a2a1a), 0, .32, .71, dh).rotation.x = Math.PI / 2;
  mesh(box(.55, .5, .06), mat(0x3a2a1a), 0, .22, .71, dh);
  mesh(new THREE.CylinderGeometry(.22, .18, .1, 12), mat(0xe63946), .8, .05, .5, dh); // food bowl
  mesh(box(.5, .14, .06), mat(0xffffff), 0, 1.02, .72, dh);                         // name board

  // the neighbours' houses, each with a chimney and a little fence
  for (const n of NEIGHBOURS) {
    const g = building(n);
    mesh(box(.5, 1.3, .5), mat(0xb5838d), -.9, n.b.h + 1.4, -.4, g);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) mesh(box(.1, .6, .07), mat(0xffffff), s * (1.2 + i * .3), .3, n.b.d / 2 + 1.6, g);
    for (const s of [-1, 1]) mesh(box(1.6, .07, .05), mat(0xffffff), s * 1.8, .45, n.b.d / 2 + 1.6, g);
  }
}
