import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC } from './locations.js';
import { emit } from '../particles.js';

// The prizes CloClo wins for tidying up that stand somewhere in the village (see sim/tidy.js):
// a trophy at the block yard and a golden statue of him on the square. Hidden until he has won them.
let trophy = null, statue = null, lastStars = null;
const gold = () => mat(0xffc300, { metalness: .65, roughness: .25 });

export function buildRewards() {
  // trophy on a little stone pedestal beside the block yard's crate
  const L = LOC.blocks;
  trophy = new THREE.Group();
  trophy.position.set(L.x, 0, L.z);
  trophy.rotation.y = L.rot;
  scene.add(trophy);
  const t = new THREE.Group();
  t.position.set(-5.2, 0, 2.2);
  trophy.add(t);
  mesh(box(.7, .8, .7), mat(0xcfc6b8), 0, .4, 0, t);
  mesh(new THREE.CylinderGeometry(.08, .2, .25, 10), gold(), 0, .93, 0, t);
  mesh(new THREE.CylinderGeometry(.32, .12, .5, 14, 1, true), gold(), 0, 1.3, 0, t);
  for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(.13, .03, 6, 12, Math.PI), gold(), s * .36, 1.35, 0, t).rotation.z = s * Math.PI / 2;
  trophy.visible = false;

  // golden statue of CloClo on the square, between two roads, facing the fountain
  statue = new THREE.Group();
  // halfway between two roads where there is no bench (the benches stand in every other gap)
  const angles = Object.values(LOC).filter(L => L.ang !== undefined).map(L => L.ang).sort((x, y) => x - y);
  let a0 = angles[1], a1 = angles[2];
  if (a1 < a0) a1 += Math.PI * 2;
  const a = (a0 + a1) / 2;
  statue.position.set(Math.cos(a) * 5.5, 0, Math.sin(a) * 5.5);
  statue.rotation.y = Math.atan2(-statue.position.x, -statue.position.z);
  scene.add(statue);
  mesh(new THREE.CylinderGeometry(.62, .7, .6, 16), mat(0xcfc6b8), 0, .3, 0, statue);
  mesh(new THREE.SphereGeometry(.62, 20, 16), gold(), 0, 1.25, 0, statue).scale.y = .95;
  for (const s of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(.1, .32, 8), gold(), s * .3, 1.82, 0, statue);
    horn.rotation.z = -s * .35;
    mesh(new THREE.SphereGeometry(.17, 10, 8), gold(), s * .2, 1.45, .45, statue); // eyes
    mesh(new THREE.SphereGeometry(.13, 8, 6), gold(), s * .58, 1.15, .05, statue); // arms
    mesh(new THREE.SphereGeometry(.18, 8, 6), gold(), s * .26, .7, .15, statue).scale.set(1, .6, 1.3); // feet
  }
  statue.visible = false;
}

// tidy: { stars, prizes } from the simulation; cloPos: where he is (for the burst of stars)
export function updateRewards(tidy, cloPos) {
  if (!tidy) return;
  trophy.visible = tidy.prizes.includes('trophy');
  statue.visible = tidy.prizes.includes('statue');
  // a burst of stars above him whenever he earns some (not when the page has just opened)
  if (lastStars !== null && tidy.stars > lastStars) {
    const p = cloPos.clone();
    p.y += 2.2;
    emit('star', p, Math.min(8, 2 + tidy.stars - lastStars));
  }
  lastStars = tidy.stars;
}
