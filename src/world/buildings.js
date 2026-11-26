import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box, winMat } from '../helpers.js';
import { LOC } from './locations.js';

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
}
