import * as THREE from 'three';
import { camera } from './scene.js';
import { world, dayLabel } from './state.js';
import { LOC } from './world/locations.js';
import { ACTS, NEEDS } from './sim/acts.js';

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

const needsEl = document.getElementById('needs');
const clockEl = document.getElementById('clock'), nowTxt = document.getElementById('nowTxt'), nowLoc = document.getElementById('nowLoc'), bubble = document.getElementById('bubble');

export function setupHud() {
  needsEl.innerHTML = NEEDS.map(([k, l, c]) => `<div class="need"><span>${l}</span><div class="bar"><i id="b-${k}" style="background:${c}"></i></div><em id="v-${k}"></em></div>`).join('');
}

const viewersEl = document.getElementById('viewers');

// Clock, viewers, need bars and "currently doing".
export function updateHud(need, S, viewers, connected) {
  clockEl.textContent = connected ? dayLabel(world.T) : 'Reconnecting…';
  viewersEl.hidden = !viewers;
  viewersEl.textContent = viewers === 1 ? '1 watching' : viewers + ' watching';
  for (const [k] of NEEDS) {
    document.getElementById('b-' + k).style.width = need[k].toFixed(0) + '%';
    document.getElementById('v-' + k).textContent = need[k].toFixed(0);
  }
  const a = ACTS[S.act];
  if (!a) return;
  const L = LOC[a.loc];
  nowTxt.textContent = S.mode === 'thinking' ? 'is deciding what to do next' : S.mode === 'walking'
    ? (a.loc === 'home' ? 'walking home' : 'walking to the ' + (a.loc === 'square' ? 'square' : L.name.toLowerCase()))
    : a.txt;
  nowLoc.textContent = L.name;
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
