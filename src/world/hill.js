import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC, HILL, heightAt } from './locations.js';

// The lookout hill with a telescope on top, for stargazing.
// Its shape is heightAt() from locations.js, the same height CloClo walks on.
export function buildHill() {
  const L = LOC.hill;

  // a grid that follows heightAt; just above the grass inside the hill, tucked under it outside
  const size = HILL.r * 2 + 1;
  const geo = new THREE.PlaneGeometry(size, size, 72, 72);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, Math.hypot(x, z) < HILL.r ? heightAt(L.x + x, L.z + z) + .02 : -.1);
  }
  geo.computeVertexNormals();
  const hill = mesh(geo, mat(0x86c873), L.x, 0, L.z);
  hill.castShadow = false;

  // the props stand on the slope: each one at the ground height where it is
  const g = new THREE.Group();
  g.position.set(L.x, 0, L.z);
  g.rotation.y = L.rot;
  scene.add(g);
  const c = Math.cos(L.rot), s = Math.sin(L.rot);
  const groundY = (lx, lz) => heightAt(L.x + lx * c + lz * s, L.z - lx * s + lz * c);

  // telescope on a tripod, pointing up and away from the square
  const t = new THREE.Group();
  t.position.set(0, groundY(0, -1), -1);
  g.add(t);
  for (let i = 0; i < 3; i++) {
    const leg = mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 5), mat(0x30475e), Math.cos(i * 2.1) * .25, .6, Math.sin(i * 2.1) * .25, t);
    leg.rotation.set(Math.sin(i * 2.1) * .3, 0, -Math.cos(i * 2.1) * .3);
  }
  const tube = mesh(new THREE.CylinderGeometry(.09, .14, 1.1, 10), mat(0x3d5a80), 0, 1.35, -.15, t);
  tube.rotation.x = -.9;
  mesh(new THREE.CylinderGeometry(.15, .15, .06, 10), mat(0xffd166), 0, 1.68, -.6, t).rotation.x = -.9;

  // a little flag
  const fy = groundY(1.3, .6);
  mesh(new THREE.CylinderGeometry(.03, .03, 2.1, 5), mat(0xffffff), 1.3, fy + .95, .6, g);
  mesh(box(.7, .4, .03), mat(0xff6b6b), 1.65, fy + 1.75, .6, g);

  // a bench to rest on; its legs reach down to the slope
  const by = groundY(-1.4, .3);
  mesh(box(1.4, .1, .45), mat(0x8a5a3b), -1.4, by + .45, .3, g);
  for (const x of [-1.95, -.85]) {
    const ly = groundY(x, .3);
    const h = by + .45 - ly + .05;
    mesh(box(.1, h, .4), mat(0x8a5a3b), x, ly + h / 2 - .05, .3, g);
  }
}
