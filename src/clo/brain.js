import * as THREE from 'three';
import { world, hour } from '../state.js';
import { pick, clamp } from '../helpers.js';
import { LOC, heightAt } from '../world/locations.js';
import { garden } from '../world/garden.js';
import { catMeet, catRelease } from '../world/cat.js';
import { ACTS, DECAY } from './acts.js';

// CloClo's brain: needs, choices and walking routes.
// Modes: 'choosing' → 'walking' → 'doing' → 'choosing' …
// Sometimes a letter from Grandma is waiting when he wakes up.
const GRANDMA = [
  'A letter from Grandma on the doormat! She says hi to the ducks.',
  'Grandma wrote back! She sent a pressed flower and a sticker.',
  'Grandma’s letter says she is knitting me a scarf. Yellow, my favourite!'
];

export function createBrain(model, write) {
  const { clo, items } = model;
  const need = { fullness: 72, energy: 82, fun: 55, curiosity: 65, company: 60 };
  const S = {
    mode: 'choosing', act: null, left: 0, queue: [],
    here: { ang: LOC.home.ang, pts: [LOC.home.spot.clone()] },
    last: [], face: 0, thought: 'Good morning!', tNext: 0, anchor: null, hop: false, wow: false
  };
  clo.position.copy(LOC.home.spot);
  clo.rotation.y = LOC.home.rot;

  // Routes run via a ring around the square.
  const RING = 4.4, ring = a => new THREE.Vector3(Math.cos(a) * RING, 0, Math.sin(a) * RING);

  function targetFor(a) {
    const L = LOC[a.loc];
    if (a.loc === 'square') {
      const ang = Math.random() * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(ang) * 3, 0, Math.sin(ang) * 3);
      if (a === ACTS.cat) {
        // Biscuit comes to sit right next to him
        const c = new THREE.Vector3(Math.cos(ang + .36) * 3, 0, Math.sin(ang + .36) * 3);
        return { ang, pts: [p], face: Math.atan2(c.x - p.x, c.z - p.z), L, cat: c };
      }
      return { ang, pts: [p], face: Math.atan2(-p.x, -p.z), L };
    }
    return { ang: L.ang, pts: [L.spot.clone()], face: L.rot + Math.PI, L };
  }

  function route(from, to) {
    const q = [...from.pts].reverse().slice(1);
    q.push(ring(from.ang));
    let d = to.ang - from.ang;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const n = Math.ceil(Math.abs(d) / .35);
    for (let i = 1; i <= n; i++) q.push(ring(from.ang + d * i / n));
    q.push(...to.pts);
    return q;
  }

  function choose() {
    const h = hour();
    let best = null, bs = -1;
    for (const k in ACTS) {
      let s = ACTS[k].score(need, h) + Math.random() * 25;
      const recent = S.last.indexOf(k);
      if (recent >= 0) s *= [.3, .5, .7, .85][recent];
      if (s > bs) { bs = s; best = k; }
    }
    const a = ACTS[best];
    S.act = best;
    S.last = [best, ...S.last].slice(0, 4);
    const tgt = targetFor(a);
    S.tgt = tgt;
    S.queue = route(S.here, tgt);
    S.here = { ang: tgt.ang, pts: tgt.pts };
    if (tgt.cat) catMeet(tgt.cat, tgt.pts[0]);
    S.thought = pick(a.why);
    write(S.thought);
    S.mode = 'walking';
    clo.visible = true;
    S.anchor = null;
  }

  function arrive() {
    const a = ACTS[S.act];
    S.mode = 'doing';
    S.left = a.dur(hour());
    S.face = S.tgt.face;
    S.tNext = world.T + 8;
    if (a.inside) {
      clo.visible = false;
      const L = LOC[a.loc];
      S.anchor = new THREE.Vector3(L.x, L.b.h + 3.2, L.z);
    } else S.hop = true;
    for (const k in items) items[k].visible = k === a.item;
  }

  function finish() {
    const a = ACTS[S.act];
    if (Math.random() < .75) write(pick(a.end));
    if (S.act === 'sleep' && Math.random() < .3) write(pick(GRANDMA));
    if (S.act === 'cat') catRelease();
    for (const k in items) items[k].visible = false;
    clo.visible = true;
    S.anchor = null;
    if (S.act === 'swing') clo.position.copy(LOC.park.spot);
    S.mode = 'choosing';
  }

  const tmp = new THREE.Vector3();

  // gd = game minutes elapsed this frame
  function update(gd) {
    for (const k in need) need[k] -= gd * DECAY[k];
    if (S.mode === 'choosing') choose();
    else if (S.mode === 'walking') {
      let step = 2.4 * gd;
      need.energy -= gd * .03;
      while (step > 0 && S.queue.length) {
        const p = S.queue[0];
        tmp.subVectors(p, clo.position);
        tmp.y = 0;
        const d = tmp.length();
        if (d <= step) { clo.position.copy(p); S.queue.shift(); step -= d; }
        else { clo.position.addScaledVector(tmp, step / d); S.face = Math.atan2(tmp.x, tmp.z); step = 0; }
      }
      if (!S.queue.length) arrive();
    } else if (S.mode === 'doing') {
      const a = ACTS[S.act];
      for (const k in a.eff) need[k] += a.eff[k] * gd;
      S.left -= gd;
      if (S.act === 'gardening') garden.growth = Math.min(1.6, garden.growth + gd * .004);
      if (S.act === 'fish' && Math.random() < gd * .012) {
        S.thought = 'A bite!';
        S.wow = true;
        write('Caught a fish! I put it back, it looked so sad.');
        S.tNext = world.T + 6;
      } else if (world.T > S.tNext) {
        S.thought = pick(a.mid);
        S.tNext = world.T + 14 + Math.random() * 12;
      }
      if (S.left <= 0) finish();
    }
    if (!(S.mode === 'doing' && S.act === 'swing')) clo.position.y = heightAt(clo.position.x, clo.position.z);
    for (const k in need) need[k] = clamp(need[k], 0, 100);
  }

  // Overall mood from 0 (miserable) to 100 (delighted); the lowest need weighs extra.
  const mood = () => {
    const v = Object.values(need);
    return v.reduce((a, b) => a + b, 0) / v.length * .6 + Math.min(...v) * .4;
  };

  return { need, S, update, mood, isSwinging: () => S.mode === 'doing' && S.act === 'swing' };
}
