import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC } from './locations.js';

export const park = { pivot: null, seatTop: null, swingAmp: 0 };

export function buildPark() {
  const gp = new THREE.Group();
  gp.position.set(LOC.park.x, 0, LOC.park.z);
  gp.rotation.y = LOC.park.rot;
  scene.add(gp);
  for (const x of [-1.4, 1.4]) mesh(new THREE.CylinderGeometry(.12, .12, 3.6, 8), mat(0xe76f51), x, 1.8, 0, gp);
  const bar = mesh(new THREE.CylinderGeometry(.1, .1, 3, 8), mat(0xe76f51), 0, 3.55, 0, gp);
  bar.rotation.z = Math.PI / 2;
  const pivot = new THREE.Group();
  pivot.position.set(0, 3.5, 0);
  gp.add(pivot);
  for (const x of [-.55, .55]) mesh(new THREE.CylinderGeometry(.03, .03, 2.4, 4), mat(0x555555), x, -1.2, 0, pivot);
  const seat = mesh(box(1.4, .12, .6), mat(0x8a5a3b), 0, -2.45, 0, pivot);
  const seatTop = new THREE.Object3D();
  seatTop.position.set(0, .06, 0);
  seat.add(seatTop);
  park.pivot = pivot;
  park.seatTop = seatTop;
}

// De schommel zwaait uit zodra CloClo erop zit en komt daarna langzaam tot rust.
export function updatePark(anim, rd, swinging) {
  park.swingAmp += ((swinging ? .75 : 0) - park.swingAmp) * Math.min(1, rd * 1.2);
  park.pivot.rotation.x = Math.sin(anim * 2.2) * park.swingAmp;
}
