import * as THREE from 'three';
import { scene, hemi, sun } from './scene.js';
import { hour } from './state.js';
import { clamp, winMat, bulbMat } from './helpers.js';
import { lamps } from './world/lamps.js';
import { starMat } from './world/sky.js';

const cNight = new THREE.Color(0x17203b), cDay = new THREE.Color(0x86bfe3), cDusk = new THREE.Color(0xffa987), sky = new THREE.Color();

// Day/night cycle: sky, sun, windows, street lamps and stars.
export function updateLight(stage) {
  const h = hour(), a = (h - 6) / 12 * Math.PI, el = Math.sin(a);
  const k = THREE.MathUtils.smoothstep(el, -.15, .3), dusk = el > -.25 ? clamp(1 - Math.abs(el) / .3, 0, 1) : 0;
  sky.copy(cNight).lerp(cDay, k).lerp(cDusk, dusk * .55);
  scene.background = sky;
  scene.fog.color.copy(sky);
  stage.style.background = '#' + sky.getHexString();
  const sx = Math.cos(a) * -45, sy = Math.abs(el) * 55 + 8;
  sun.position.set(el > 0 ? sx : -sx, sy, 20);
  sun.color.set(el > 0 ? 0xfff4e0 : 0x9fb4ff);
  sun.intensity = el > 0 ? .2 + .55 * k : .2; // softer daylight: easier on the eyes
  hemi.intensity = .2 + .3 * k;
  const n = 1 - k;
  winMat.emissiveIntensity = n * 1.2;
  bulbMat.emissiveIntensity = n * 1.6;
  lamps.forEach(l => l.intensity = n * 1.1);
  starMat.opacity = clamp(n * 1.3 - .2, 0, 1);
}
