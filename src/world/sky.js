import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, rnd } from '../helpers.js';

const clouds = [];
export let starMat;

export function buildSky() {
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const p = mesh(new THREE.IcosahedronGeometry(1.4 + rnd()), mat(0xffffff), j * 1.6 - 2.4, rnd() * .6, rnd() - .5, c);
      p.castShadow = false;
    }
    c.position.set(rnd() * 80 - 40, 20 + rnd() * 6, rnd() * 80 - 40);
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
    if (c.position.x > 55) c.position.x = -55;
  });
}
