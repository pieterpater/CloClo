import * as THREE from 'three';
import { camera } from './scene.js';
import { world, dayLabel } from './state.js';
import { LOC } from './world/locations.js';
import { ACTS } from './sim/acts.js';

const diaryEl = document.getElementById('diary');

// entry: { T: game time, text }
export function write(entry) {
  const li = document.createElement('li');
  const tm = document.createElement('time');
  tm.textContent = dayLabel(entry.T);
  li.append(tm, document.createTextNode(entry.text));
  diaryEl.prepend(li);
  while (diaryEl.children.length > 40) diaryEl.lastChild.remove();
}

const clockEl = document.getElementById('clock'), nowTxt = document.getElementById('nowTxt'), nowLoc = document.getElementById('nowLoc'), bubble = document.getElementById('bubble');
const viewersEl = document.getElementById('viewers'), planEl = document.getElementById('nowPlan'), moodEl = document.getElementById('nowMood');

// Clock, viewers, and what he is doing, feeling and planning.
export function updateHud(mood, S, viewers, connected, speed) {
  clockEl.textContent = !connected ? 'Reconnecting…' : dayLabel(world.T) + (speed > 1 ? ` · ${speed}×` : '');
  viewersEl.hidden = !viewers;
  viewersEl.textContent = viewers === 1 ? '1 watching' : viewers + ' watching';
  moodEl.textContent = mood ? 'Feeling ' + mood : '';
  const a = ACTS[S.act];
  if (!a) return;
  const L = LOC[a.loc];
  nowTxt.textContent = S.mode === 'thinking' ? 'is deciding what to do next' : S.mode === 'stuck' ? 'is stuck: blocks are in the way' : S.mode === 'walking'
    ? (a.loc === 'home' ? 'walking home' : 'walking to the ' + (a.loc === 'square' ? 'square' : L.name.toLowerCase()))
    : S.act === 'build' && S.idea ? 'is building ' + S.idea : a.txt;
  nowLoc.textContent = L.name;
  planEl.hidden = !S.plan;
  planEl.textContent = S.plan ? 'Plan: ' + S.plan : '';
}

const up = new THREE.Vector3(0, 2.4, 0);

// Thought bubble above CloClo's head (or above the building he is in).
export function updateBubble(stage, cloPos, S) {
  const anc = S.anchor ? S.anchor.clone() : cloPos.clone().add(up);
  anc.project(camera);
  const W = stage.clientWidth, H = stage.clientHeight;
  if (anc.z < 1 && Math.abs(anc.x) < 1.1 && Math.abs(anc.y) < 1.1) {
    bubble.style.opacity = 1;
    bubble.style.left = ((anc.x + 1) / 2 * W) + 'px';
    bubble.style.top = ((1 - anc.y) / 2 * H - 6) + 'px';
  } else bubble.style.opacity = 0;
  if (bubble.textContent !== S.thought) bubble.textContent = S.thought;
}
