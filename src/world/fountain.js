import * as THREE from 'three';
import { mesh, mat } from '../helpers.js';

let water, spray;

export function buildFountain() {
  mesh(new THREE.CylinderGeometry(1.8, 1.9, .6, 24), mat(0xcfc6b8), 0, .3, 0);
  water = mesh(new THREE.CylinderGeometry(1.55, 1.55, .06, 24), new THREE.MeshStandardMaterial({ color: 0x6fd3f5, roughness: .2 }), 0, .6, 0);
  mesh(new THREE.CylinderGeometry(.22, .3, 1.4, 10), mat(0xcfc6b8), 0, 1.2, 0);
  mesh(new THREE.CylinderGeometry(.7, .4, .3, 16), mat(0xcfc6b8), 0, 1.9, 0);
  spray = mesh(new THREE.SphereGeometry(.35, 12, 8), new THREE.MeshStandardMaterial({ color: 0xbdefff, transparent: true, opacity: .7 }), 0, 2.2, 0);
}

export function updateFountain(anim) {
  spray.scale.y = 1 + Math.sin(anim * 6) * .15;
  water.position.y = .6 + Math.sin(anim * 3) * .01;
}
