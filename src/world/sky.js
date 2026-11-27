import * as THREE from 'three';
import { scene, camera } from '../scene.js';
import { mesh, rnd } from '../helpers.js';

const clouds = [];
export let starMat;

export function buildSky() {
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    // each cloud has its own material so it can fade out when the camera flies through it
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, flatShading: true, transparent: true });
    c.userData.mat = m;
    for (let j = 0; j < 4; j++) {
      const p = mesh(new THREE.IcosahedronGeometry(1.4 + rnd()), m, j * 1.6 - 2.4, rnd() * .6, rnd() - .5, c);
      p.castShadow = false;
    }
    c.position.set(rnd() * 110 - 55, 22 + rnd() * 6, rnd() * 110 - 55);
    scene.add(c);
    clouds.push(c);
  }
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 400; i++) {
    const a = Math.random() * Math.PI * 2, e = .15 + Math.random() * 1.3;
    sp.push(Math.cos(a) * Math.cos(e) * 150, Math.sin(e) * 150, Math.sin(a) * Math.cos(e) * 150);
  }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, fog: false, transparent: true, opacity: 0 });
  scene.add(new THREE.Points(sg, starMat));
}

export function updateSky(rd) {
  clouds.forEach((c, i) => {
    c.position.x += rd * (.4 + i * .05);
    if (c.position.x > 75) c.position.x = -75;
    const o = Math.min(1, Math.max(0, (camera.position.distanceTo(c.position) - 10) / 12));
    c.userData.mat.opacity = o;
    c.visible = o > .02;
  });
}
