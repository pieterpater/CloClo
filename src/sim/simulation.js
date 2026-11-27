import * as THREE from 'three';
import { world, hour } from '../state.js';
import { createBrain } from './brain.js';
import { createCat } from './cat.js';
import { createPip } from './pip.js';
import { garden, growGarden } from './garden.js';
import { yard, yardToString, yardFromString } from './blocks.js';
import { tidy, tidyLoad, tidySave, messCount } from './tidy.js';

// Everything that happens in Mosdorp, without any drawing. It runs on the server (one CloClo for
// everyone, see server/sim.js) or, without a server, in the browser.
//   opts.decide / opts.canDecide: an optional language-model brain (see sim/brain.js)
//   opts.onDiary(entry): called with { T, text } for every new diary line
export const DIARY_MAX = 40;
export const isNightAt = h => h >= 20.5 || h < 6.3;
// While CloClo sleeps the clock runs this much faster, so viewers don't watch a dark house for ten minutes.
export const SLEEP_SPEEDUP = 6;

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
  const pip = createPip();
  const brain = createBrain(body, cat, pip, write, opts);
  let hopN = 0, wowN = 0;

  // gd: game minutes to advance
  const asleep = () => brain.S.mode === 'doing' && brain.S.act === 'sleep';

  // gd: game minutes to advance at normal pace
  function tick(gd) {
    if (asleep()) gd *= SLEEP_SPEEDUP;
    world.T += gd;
    brain.update(gd);
    cat.update(gd, isNightAt(hour()));
    pip.update(gd, body.position, body.visible, isNightAt(hour()));
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
      t: Date.now(), T: r2(world.T), speed: world.speed * (asleep() ? SLEEP_SPEEDUP : 1),
      clo: {
        x: r2(p.x), y: r2(p.y), z: r2(p.z), face: r2(S.face), visible: body.visible, item: body.item,
        mode: S.mode, act: S.act, thought: S.thought, plan: S.plan, moving: !!S.moving, climbing: !!S.climbing, floor: S.floor,
        anchor: S.anchor ? [S.anchor.x, S.anchor.y, S.anchor.z] : null,
        hop: hopN, wow: wowN
      },
      mood: S.mood,
      cat: {
        x: r2(cat.pos.x), z: r2(cat.pos.z), face: r2(cat.face),
        walking: cat.walking, sleeping: cat.sleeping, meeting: !!cat.meetAt
      },
      pip: {
        x: r2(pip.pos.x), z: r2(pip.pos.z), face: r2(pip.face), mode: pip.mode, doing: pip.doing,
        walking: pip.walking, sleeping: pip.sleeping, tries: pip.tries
      },
      growth: r2(garden.growth),
      yard: yardToString(), idea: yard.idea,
      tidy: { stars: tidy.stars, prizes: tidy.prizes }
    };
  }

  // Saving and loading, so a server restart doesn't wipe CloClo's life. On load he picks
  // something new to do from where he was.
  function save() {
    const S = brain.S;
    return {
      version: 1, T: world.T, mood: S.mood, tidy: tidySave(), yard: yardToString(), idea: yard.idea, growth: garden.growth, diary, memory: brain.memory,
      last: S.last, prev: S.act, plan: S.plan,
      memories: S.memories, today: S.today, todayActs: S.todayActs, here: { ang: S.here.ang, pts: S.here.pts.map(v => v.toArray()) },
      pos: body.position.toArray(), floor: S.floor, cat: cat.pos.toArray(), pip: pip.save(), learned: S.learned || []
    };
  }
  function load(d) {
    if (!d || d.version !== 1) return;
    const S = brain.S;
    world.T = d.T;
    S.mood = d.mood || 'happy';
    yardFromString(d.yard);
    tidyLoad(d.tidy);
    if (tidy.low === null) tidy.low = messCount(); // from now on, cleaning up what lies around earns stars
    yard.idea = d.idea || '';
    garden.growth = d.growth;
    diary.splice(0, diary.length, ...d.diary.slice(0, DIARY_MAX));
    brain.memory.splice(0, brain.memory.length, ...d.memory);
    S.last = d.last;
    S.prev = d.prev;
    S.plan = d.plan || '';
    S.memories = d.memories || [];
    S.today = d.today || [];
    S.todayActs = d.todayActs || [];
    S.here = { ang: d.here.ang, pts: d.here.pts.map(a => new THREE.Vector3().fromArray(a)) };
    body.position.fromArray(d.pos);
    S.floor = S.fy = d.floor || 0;
    body.visible = true;
    body.item = null;
    S.anchor = null;
    S.mode = 'choosing';
    cat.pos.fromArray(d.cat);
    pip.load(d.pip);
    S.learned = d.learned || [];
  }

  return { tick, snapshot, diary, write, save, load, brain, pip };
}
