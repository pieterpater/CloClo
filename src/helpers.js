import * as THREE from 'three';
import { scene } from './scene.js';

const mats = {};
export const mat = (c, o) => {
  const k = c + JSON.stringify(o || {});
  return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, flatShading: true }, o)));
};
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

export function mesh(geo, m, x, y, z, parent) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  (parent || scene).add(o);
  return o;
}

// Vaste seed: het dorp ziet er bij elke start hetzelfde uit.
// Let op: de volgorde waarin de wereld gebouwd wordt bepaalt de uitkomst.
let seed = 7;
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Ramen en lampen gloeien 's nachts (zie lighting.js).
export const winMat = new THREE.MeshStandardMaterial({ color: 0x3d5a80, emissive: 0xffd27a, emissiveIntensity: 0, roughness: .4 });
export const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 0 });
