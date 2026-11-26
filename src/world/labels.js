import * as THREE from 'three';
import { scene } from '../scene.js';
import { LOC } from './locations.js';

function label(text, x, y, z) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = '600 56px Fredoka, sans-serif';
  const w = Math.ceil(g.measureText(text).width) + 64;
  c.width = w; c.height = 96;
  const r = 40;
  g.fillStyle = 'rgba(255,255,255,.93)';
  g.beginPath(); g.moveTo(r, 4); g.lineTo(w - r, 4);
  g.arc(w - r, 48, 44, -Math.PI / 2, Math.PI / 2); g.lineTo(r, 92);
  g.arc(r, 48, 44, Math.PI / 2, Math.PI * 1.5); g.fill();
  g.font = '600 56px Fredoka, sans-serif';
  g.fillStyle = '#12302c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, 52);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false }));
  s.scale.set(w / 96 * 1.1, 1.1, 1);
  s.position.set(x, y, z);
  scene.add(s);
}

// Naambordjes pas tekenen als het lettertype geladen is.
export function buildLabels() {
  const mk = () => {
    for (const k of ['huis', 'bakkerij', 'bieb', 'park', 'vijver', 'tuin']) {
      const L = LOC[k], h = L.b ? L.b.h + 3.4 : k === 'park' ? 4.8 : 2.2;
      label(L.name, L.x, h, L.z);
    }
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(mk);
}
