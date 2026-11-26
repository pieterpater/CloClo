import * as THREE from 'three';
import { camera } from './scene.js';
import { world, dayLabel } from './state.js';
import { LOC } from './world/locations.js';
import { ACTS, NEEDS } from './clo/acts.js';

const diaryEl = document.getElementById('diary');

export function write(txt) {
  const li = document.createElement('li');
  const tm = document.createElement('time');
  tm.textContent = dayLabel(world.T);
  li.append(tm, document.createTextNode(txt));
  diaryEl.prepend(li);
  while (diaryEl.children.length > 40) diaryEl.lastChild.remove();
}

const needsEl = document.getElementById('needs');
const clockEl = document.getElementById('clock'), nowTxt = document.getElementById('nowTxt'), nowLoc = document.getElementById('nowLoc'), bubble = document.getElementById('bubble');

export function setupHud() {
  needsEl.innerHTML = NEEDS.map(([k, l, c]) => `<div class="need"><span>${l}</span><div class="bar"><i id="b-${k}" style="background:${c}"></i></div><em id="v-${k}"></em></div>`).join('');
}

// Clock, need bars and "currently doing".
export function updateHud(need, S) {
  clockEl.textContent = dayLabel(world.T);
  for (const [k] of NEEDS) {
    document.getElementById('b-' + k).style.width = need[k].toFixed(0) + '%';
    document.getElementById('v-' + k).textContent = need[k].toFixed(0);
  }
  const a = ACTS[S.act];
  if (!a) return;
  const L = LOC[a.loc];
  nowTxt.textContent = S.mode === 'walking'
    ? 'loopt naar ' + (a.loc === 'square' ? 'het plein' : a.loc === 'home' ? 'huis' : 'de ' + L.name.toLowerCase())
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
