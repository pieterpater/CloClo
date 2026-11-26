import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC, HILL, heightAt } from './locations.js';

// The lookout hill with a telescope on top, for stargazing.
export function buildHill() {
  const L = LOC.hill;
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const r = HILL.r * i / 16;
    pts.push(new THREE.Vector2(Math.max(r, .001), heightAt(L.x + r, L.z)));
  }
  const hill = mesh(new THREE.LatheGeometry(pts, 40), mat(0x86c873), L.x, 0, L.z);
  hill.castShadow = false;

  const g = new THREE.Group();
  g.position.set(L.x, HILL.h, L.z);
  g.rotation.y = L.rot;
  scene.add(g);
  // telescope on a tripod, pointing up and away from the square
  const t = new THREE.Group();
  t.position.set(0, 0, -1);
  g.add(t);
  for (let i = 0; i < 3; i++) {
    const leg = mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 5), mat(0x30475e), Math.cos(i * 2.1) * .25, .6, Math.sin(i * 2.1) * .25, t);
    leg.rotation.set(Math.sin(i * 2.1) * .3, 0, -Math.cos(i * 2.1) * .3);
  }
  const tube = mesh(new THREE.CylinderGeometry(.09, .14, 1.1, 10), mat(0x3d5a80), 0, 1.35, -.15, t);
  tube.rotation.x = -.9;
  mesh(new THREE.CylinderGeometry(.15, .15, .06, 10), mat(0xffd166), 0, 1.68, -.6, t).rotation.x = -.9;
  // a little flag on top
  mesh(new THREE.CylinderGeometry(.03, .03, 2, 5), mat(0xffffff), 1.3, 1, .6, g);
  mesh(box(.7, .4, .03), mat(0xff6b6b), 1.65, 1.75, .6, g);
  // a bench to rest on
  mesh(box(1.4, .1, .45), mat(0x8a5a3b), -1.4, .45, .3, g);
  for (const x of [-1.95, -.85]) mesh(box(.1, .45, .4), mat(0x8a5a3b), x, .22, .3, g);
}
