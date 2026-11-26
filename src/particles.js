import * as THREE from 'three';
import { scene } from './scene.js';

// Little floating symbols (hearts, music notes, stars, z's) that show how CloClo feels.
const GLYPHS = {
  heart: ['♥', '#ff5d8f'],
  note: ['♪', '#7b5cff'],
  star: ['★', '#ffd166'],
  zzz: ['z', '#c3d0ff'],
  sparkle: ['✦', '#3fbfb0'],
  wow: ['!', '#ff6b6b']
};
const maps = {};
function texture(type) {
  if (maps[type]) return maps[type];
  const [ch, colour] = GLYPHS[type];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = '700 50px Fredoka, "Segoe UI Symbol", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.strokeText(ch, 32, 36);
  g.fillStyle = colour;
  g.fillText(ch, 32, 36);
  return (maps[type] = new THREE.CanvasTexture(c));
}

const live = [];

export function emit(type, pos, count = 1) {
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture(type), transparent: true, depthWrite: false }));
    s.position.copy(pos).add(new THREE.Vector3((Math.random() - .5) * .8, Math.random() * .3, (Math.random() - .5) * .8));
    s.userData = { age: 0, life: 1.8 + Math.random() * .6, vx: (Math.random() - .5) * .3, wob: Math.random() * 6, size: .45 + Math.random() * .2 };
    scene.add(s);
    live.push(s);
  }
}

export function updateParticles(rd) {
  for (let i = live.length - 1; i >= 0; i--) {
    const s = live[i], u = s.userData;
    u.age += rd;
    const t = u.age / u.life;
    s.position.y += rd * .8;
    s.position.x += Math.sin(u.age * 3 + u.wob) * rd * .3 + u.vx * rd;
    const pop = Math.min(1, u.age * 5);
    s.scale.setScalar(u.size * pop);
    s.material.opacity = t < .7 ? 1 : 1 - (t - .7) / .3;
    if (t >= 1) {
      scene.remove(s);
      s.material.dispose();
      live.splice(i, 1);
    }
  }
}
