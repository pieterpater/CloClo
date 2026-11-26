import * as THREE from 'three';
import { world, hour } from '../state.js';
import { createBrain } from './brain.js';
import { createCat } from './cat.js';
import { garden, growGarden } from './garden.js';

// Everything that happens in Mosdorp, without any drawing. It runs on the server (one CloClo for
// everyone, see server/sim.js) or, without a server, in the browser.
//   opts.decide / opts.canDecide: an optional language-model brain (see sim/brain.js)
//   opts.onDiary(entry): called with { T, text } for every new diary line
export const DIARY_MAX = 40;
export const isNightAt = h => h >= 20.5 || h < 6.3;

export function createSimulation(opts = {}) {
  const diary = [];
  const write = text => {
    const entry = { T: world.T, text };
    diary.unshift(entry);
    diary.length = Math.min(diary.length, DIARY_MAX);
    opts.onDiary?.(entry);
  };
  const body = { position: new THREE.Vector3(), visible: true, item: null };
  const cat = createCat();
  const brain = createBrain(body, cat, write, opts);
  let hopN = 0, wowN = 0;

  // gd: game minutes to advance
  function tick(gd) {
    world.T += gd;
    brain.update(gd);
    cat.update(gd, isNightAt(hour()));
    growGarden(gd);
    // one-off moments become counters, so viewers can't miss them between two updates
    if (brain.S.hop) { hopN++; brain.S.hop = false; }
    if (brain.S.wow) { wowN++; brain.S.wow = false; }
  }

  const r2 = v => Math.round(v * 100) / 100;

  // Everything a viewer needs to draw the current moment.
  function snapshot() {
    const S = brain.S, p = body.position;
    return {
      t: Date.now(), T: r2(world.T), speed: world.speed,
      clo: {
        x: r2(p.x), y: r2(p.y), z: r2(p.z), face: r2(S.face), visible: body.visible, item: body.item,
        mode: S.mode, act: S.act, thought: S.thought, plan: S.plan,
        anchor: S.anchor ? [S.anchor.x, S.anchor.y, S.anchor.z] : null,
        hop: hopN, wow: wowN
      },
      mood: S.mood,
      cat: {
        x: r2(cat.pos.x), z: r2(cat.pos.z), face: r2(cat.face),
        walking: cat.walking, sleeping: cat.sleeping, meeting: !!cat.meetAt
      },
      growth: r2(garden.growth)
    };
  }

  // Saving and loading, so a server restart doesn't wipe CloClo's life. On load he picks
  // something new to do from where he was.
  function save() {
    const S = brain.S;
    return {
      version: 1, T: world.T, mood: S.mood, growth: garden.growth, diary, memory: brain.memory,
      last: S.last, prev: S.act, plan: S.plan, here: { ang: S.here.ang, pts: S.here.pts.map(v => v.toArray()) },
      pos: body.position.toArray(), cat: cat.pos.toArray()
    };
  }
  function load(d) {
    if (!d || d.version !== 1) return;
    const S = brain.S;
    world.T = d.T;
    S.mood = d.mood || 'happy';
    garden.growth = d.growth;
    diary.splice(0, diary.length, ...d.diary.slice(0, DIARY_MAX));
    brain.memory.splice(0, brain.memory.length, ...d.memory);
    S.last = d.last;
    S.prev = d.prev;
    S.plan = d.plan || '';
    S.here = { ang: d.here.ang, pts: d.here.pts.map(a => new THREE.Vector3().fromArray(a)) };
    body.position.fromArray(d.pos);
    body.visible = true;
    body.item = null;
    S.anchor = null;
    S.mode = 'choosing';
    cat.pos.fromArray(d.cat);
  }

  return { tick, snapshot, diary, write, save, load, brain };
}
