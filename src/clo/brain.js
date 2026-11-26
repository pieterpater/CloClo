import * as THREE from 'three';
import { world, hour } from '../state.js';
import { pick, clamp } from '../helpers.js';
import { LOC } from '../world/locations.js';
import { garden } from '../world/garden.js';
import { ACTS, DECAY } from './acts.js';

// Het brein van CloClo: behoeften, keuzes en looproutes.
// Modi: 'kiezen' → 'lopen' → 'doen' → 'kiezen' …
export function createBrain(model, write) {
  const { clo, rod, can } = model;
  const need = { buik: 72, energie: 82, plezier: 55, nieuws: 65 };
  const S = {
    mode: 'kiezen', act: null, left: 0, queue: [],
    here: { ang: LOC.huis.ang, pts: [LOC.huis.spot.clone()] },
    last: [], face: 0, thought: 'Goeiemorgen!', tNext: 0, anchor: null
  };
  clo.position.copy(LOC.huis.spot);
  clo.rotation.y = LOC.huis.rot;

  // Routes lopen via een ring rond het plein.
  const RING = 4.4, ring = a => new THREE.Vector3(Math.cos(a) * RING, 0, Math.sin(a) * RING);

  function targetFor(a) {
    const L = LOC[a.loc];
    if (a.loc === 'plein') {
      const ang = Math.random() * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(ang) * 3, 0, Math.sin(ang) * 3);
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
      if (S.last.includes(k)) s *= .35;
      if (s > bs) { bs = s; best = k; }
    }
    const a = ACTS[best];
    S.act = best;
    S.last = [best, ...S.last].slice(0, 2);
    const tgt = targetFor(a);
    S.tgt = tgt;
    S.queue = route(S.here, tgt);
    S.here = { ang: tgt.ang, pts: tgt.pts };
    S.thought = pick(a.why);
    write(S.thought);
    S.mode = 'lopen';
    clo.visible = true;
    S.anchor = null;
  }

  function arrive() {
    const a = ACTS[S.act];
    S.mode = 'doen';
    S.left = a.dur(hour());
    S.face = S.tgt.face;
    S.tNext = world.T + 8;
    if (a.inside) {
      clo.visible = false;
      const L = LOC[a.loc];
      S.anchor = new THREE.Vector3(L.x, L.b.h + 3.2, L.z);
    }
    rod.visible = S.act === 'vissen';
    can.visible = S.act === 'tuinieren';
  }

  function finish() {
    const a = ACTS[S.act];
    if (Math.random() < .75) write(pick(a.end));
    rod.visible = can.visible = false;
    clo.visible = true;
    S.anchor = null;
    if (S.act === 'schommelen') clo.position.copy(LOC.park.spot);
    S.mode = 'kiezen';
  }

  const tmp = new THREE.Vector3();

  // gd = verstreken spelminuten deze frame
  function update(gd) {
    for (const k in need) need[k] -= gd * DECAY[k];
    if (S.mode === 'kiezen') choose();
    else if (S.mode === 'lopen') {
      let step = 2.4 * gd;
      need.energie -= gd * .03;
      while (step > 0 && S.queue.length) {
        const p = S.queue[0];
        tmp.subVectors(p, clo.position);
        tmp.y = 0;
        const d = tmp.length();
        if (d <= step) { clo.position.copy(p); S.queue.shift(); step -= d; }
        else { clo.position.addScaledVector(tmp, step / d); S.face = Math.atan2(tmp.x, tmp.z); step = 0; }
      }
      if (!S.queue.length) arrive();
    } else if (S.mode === 'doen') {
      const a = ACTS[S.act];
      for (const k in a.eff) need[k] += a.eff[k] * gd;
      S.left -= gd;
      if (S.act === 'tuinieren') garden.groei = Math.min(1.6, garden.groei + gd * .004);
      if (S.act === 'vissen' && Math.random() < gd * .012) {
        S.thought = 'Beet!';
        write('Een vis gevangen! Ik heb hem teruggezet, hij keek zo verdrietig.');
        S.tNext = world.T + 6;
      } else if (world.T > S.tNext) {
        S.thought = pick(a.mid);
        S.tNext = world.T + 14 + Math.random() * 12;
      }
      if (S.left <= 0) finish();
    }
    for (const k in need) need[k] = clamp(need[k], 0, 100);
  }

  return { need, S, update, isSwinging: () => S.mode === 'doen' && S.act === 'schommelen' };
}
