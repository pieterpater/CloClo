import './style.css';
import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { world, hour } from './state.js';
import { buildWorld, updateWorld } from './world/index.js';
import { buildCloClo } from './clo/model.js';
import { createBrain } from './clo/brain.js';
import { animateCloClo } from './clo/animate.js';
import { updateLight } from './lighting.js';
import { cam, setupControls, updateCamera } from './controls.js';
import { write, setupHud, updateHud, updateBubble } from './hud.js';
import { updateParticles } from './particles.js';

const stage = document.getElementById('stage');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  stage.insertAdjacentHTML('beforeend', '<div class="err">Your browser doesn’t support WebGL, so the 3D village can’t be shown.</div>');
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
  write('Good morning, Mosdorp! What shall I do today?');

  const clock = new THREE.Clock();
  let anim = 0, hudT = 0;

  function frame() {
    const rd = Math.min(clock.getDelta(), .1); // real seconds
    const gd = rd * world.speed;               // game minutes
    anim += rd;
    world.T += gd;

    brain.update(gd);
    const h = hour(), isNight = h >= 20.5 || h < 6.3;
    const chasing = brain.S.mode === 'doing' && brain.S.act === 'butterflies';
    updateWorld({ anim, rd, gd, swinging: brain.isSwinging(), chaseAt: chasing ? model.clo.position : null, isNight });
    animateCloClo(model, brain.S, anim, rd, brain.mood(), isNight);
    updateParticles(rd);
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
