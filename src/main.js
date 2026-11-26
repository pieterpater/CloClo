import './style.css';
import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { world, hour } from './state.js';
import { buildWorld, updateWorld } from './world/index.js';
import { buildCloClo } from './clo/model.js';
import { animateCloClo } from './clo/animate.js';
import { updateLight } from './lighting.js';
import { cam, setupControls, updateCamera } from './controls.js';
import { write, updateHud, updateBubble } from './hud.js';
import { updateParticles } from './particles.js';
import { connect } from './source.js';
import { isNightAt } from './sim/simulation.js';

const stage = document.getElementById('stage');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  stage.insertAdjacentHTML('beforeend', '<div class="err">Your browser doesn’t support WebGL, so the 3D village can’t be shown.</div>');
}

if (renderer) start(renderer);

async function start(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  buildWorld();
  const model = buildCloClo();
  setupControls(stage);

  const source = await connect(write);
  // Only a copy running in this browser can be sped up; the live CloClo runs at the server's pace.
  document.getElementById('speed').hidden = source.remote;
  document.getElementById('brainNote').textContent = !source.remote
    ? 'This copy of Mosdorp runs only in your browser. CloClo decides with simple rules based on the time of day.'
    : source.brain
      ? 'Everyone watching sees the same CloClo, live. What he does, thinks, feels and writes in his diary is decided freely by a language model (Claude Haiku 5.5).'
      : 'Everyone watching sees the same CloClo, live. He decides with simple rules based on the time of day.';

  // What the drawing code needs to know about CloClo, filled from the simulation each frame.
  const V = { mode: null, act: null, thought: '', anchor: null, face: 0, hop: false, wow: false };
  const anchor = new THREE.Vector3();
  let seenHop = null, seenWow = null, first = true;

  const clock = new THREE.Clock();
  let anim = 0, hudT = 0;

  function frame() {
    const rd = Math.min(clock.getDelta(), .1); // real seconds
    anim += rd;
    const view = source.view(rd);
    if (source.remote) {
      world.T = view.T;
      world.speed = view.speed;
    }

    const c = view.clo;
    V.mode = c.mode;
    V.act = c.act;
    V.thought = c.thought;
    V.plan = c.plan;
    V.idea = view.idea;
    V.anchor = c.anchor ? anchor.fromArray(c.anchor) : null;
    // while dancing or chasing butterflies he spins on his own (see animate.js)
    if (!(c.mode === 'doing' && (c.act === 'dance' || c.act === 'butterflies'))) V.face = c.face;
    if (seenHop !== null && c.hop !== seenHop) V.hop = true;
    if (seenWow !== null && c.wow !== seenWow) V.wow = true;
    seenHop = c.hop;
    seenWow = c.wow;
    model.clo.position.set(c.x, c.y, c.z);
    model.clo.visible = c.visible;
    for (const k in model.items) model.items[k].visible = k === c.item;
    if (first) {
      model.clo.rotation.y = c.face;
      cam.target.copy(model.clo.position);
      first = false;
    }

    const isNight = isNightAt(hour());
    const doing = c.mode === 'doing';
    updateWorld({ anim, rd, swinging: doing && c.act === 'swing', chaseAt: doing && c.act === 'butterflies' ? model.clo.position : null, growth: view.growth, cat: view.cat, yard: view.yard });
    animateCloClo(model, V, anim, rd, view.mood, isNight);
    updateParticles(rd);
    updateLight(stage);

    updateCamera(rd, model.clo.position, V.anchor);
    renderer.render(scene, camera);

    updateBubble(stage, model.clo.position, V);
    hudT -= rd;
    if (hudT < 0) { updateHud(view.mood, V, view.viewers, source.connected, view.speed); hudT = .25; }
    requestAnimationFrame(frame);
  }

  new ResizeObserver(() => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }).observe(stage);

  requestAnimationFrame(frame);
}
