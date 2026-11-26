import * as THREE from 'three';
import { camera, sun, mobile } from './scene.js';
import { world } from './state.js';
import { clamp } from './helpers.js';

// Orbit camera around CloClo (or the village), controlled by dragging, scrolling and pinching.
export const cam = { theta: .7, phi: .72, dist: mobile ? 26 : 22, follow: true, target: new THREE.Vector3() };

export function setupControls(stage) {
  const ptrs = new Map();
  let pinch0 = 0, dist0 = 0;
  const hint = document.getElementById('hint');
  const hideHint = () => hint.style.opacity = 0;
  setTimeout(hideHint, 7000);

  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.setPointerCapture(e.pointerId);
    hideHint();
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
      dist0 = cam.dist;
    }
  });
  stage.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    if (ptrs.size === 1) {
      cam.theta -= (e.clientX - p.x) * .006;
      cam.phi = clamp(cam.phi + (e.clientY - p.y) * .005, .3, 1.25);
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      cam.dist = clamp(dist0 * pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), 9, 80);
    }
  });
  const up = e => ptrs.delete(e.pointerId);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    hideHint();
    cam.dist = clamp(cam.dist * (1 + Math.sign(e.deltaY) * .1), 9, 80);
  }, { passive: false });

  const camBtn = document.getElementById('cam');
  camBtn.addEventListener('click', () => {
    cam.follow = !cam.follow;
    cam.dist = cam.follow ? (mobile ? 26 : 22) : 62;
    cam.phi = cam.follow ? .72 : .95;
    camBtn.textContent = cam.follow ? 'Overview' : 'Follow CloClo';
  });

  const spBtn = document.getElementById('speed');
  const SP = [1, 5, 20];
  spBtn.addEventListener('click', () => {
    world.speed = SP[(SP.indexOf(world.speed) + 1) % SP.length];
    spBtn.textContent = 'Speed ' + world.speed + '×';
  });
}

const tmp = new THREE.Vector3();

// focus: CloClo's position, or the point above the building he is in.
export function updateCamera(rd, cloPos, anchor) {
  const focus = cam.follow ? (anchor ? tmp.copy(anchor).setY(1) : cloPos) : tmp.set(0, 0, 0);
  cam.target.lerp(focus, Math.min(1, rd * 2.5));
  camera.position.set(
    cam.target.x + Math.sin(cam.theta) * Math.cos(cam.phi) * cam.dist,
    cam.target.y + Math.sin(cam.phi) * cam.dist,
    cam.target.z + Math.cos(cam.theta) * Math.cos(cam.phi) * cam.dist
  );
  camera.lookAt(cam.target.x, cam.target.y + 1, cam.target.z);
  sun.target.position.copy(cam.target);
}
