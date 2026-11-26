import './style.css';
import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { world } from './state.js';
import { buildWorld, updateWorld } from './world/index.js';
import { buildCloClo } from './clo/model.js';
import { createBrain } from './clo/brain.js';
import { animateCloClo } from './clo/animate.js';
import { updateLight } from './lighting.js';
import { cam, setupControls, updateCamera } from './controls.js';
import { write, setupHud, updateHud, updateBubble } from './hud.js';

const stage = document.getElementById('stage');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  stage.insertAdjacentHTML('beforeend', '<div class="err">Je browser ondersteunt geen WebGL, dus het 3D-dorp kan niet getoond worden.</div>');
}

if (renderer) start(renderer);

function start(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  buildWorld();
  const model = buildCloClo();
  const brain = createBrain(model, write);
  setupControls(stage);
  setupHud();
  write('Goeiemorgen Mosdorp! Wat zal ik vandaag eens doen?');

  const clock = new THREE.Clock();
  let anim = 0, hudT = 0;

  function frame() {
    const rd = Math.min(clock.getDelta(), .1); // echte seconden
    const gd = rd * world.speed;               // spelminuten
    anim += rd;
    world.T += gd;

    brain.update(gd);
    updateWorld({ anim, rd, gd, swinging: brain.isSwinging() });
    animateCloClo(model, brain.S, anim, rd);
    updateLight(stage);

    updateCamera(rd, model.clo.position, brain.S.anchor);
    renderer.render(scene, camera);

    updateBubble(stage, model.clo.position, brain.S);
    hudT -= rd;
    if (hudT < 0) { updateHud(brain.need, brain.S); hudT = .25; }
    requestAnimationFrame(frame);
  }

  new ResizeObserver(() => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }).observe(stage);

  cam.target.copy(model.clo.position);
  requestAnimationFrame(frame);
}
