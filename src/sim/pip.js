import * as THREE from 'three';
import { DOGHOUSE } from '../world/locations.js';

// Pip, CloClo's puppy: where he is, what he does and which tricks he knows. (He is drawn by world/pip.js.)
//   home:   pottering around his doghouse beside CloClo's house; asleep in it at night
//   follow: trotting along with CloClo (after a walk)
//   train:  on the training field, practising a trick with CloClo
export const TRICKS = ['sit', 'paw', 'jump', 'roll_over', 'fetch'];
export const TRICK_NAMES = { sit: 'sit', paw: 'give a paw', jump: 'jump over the hurdle', roll_over: 'roll over', fetch: 'fetch the ball' };

export function createPip() {
  const pip = {
    pos: new THREE.Vector3(DOGHOUSE.door.x, 0, DOGHOUSE.door.z), face: DOGHOUSE.rot,
    mode: 'home', follow: 0,          // game minutes he still walks along
    tricks: Object.fromEntries(TRICKS.map(t => [t, 0])), // 0–100: how well he knows each trick
    doing: null, ok: false, tries: 0, oks: 0, // the trick he is doing right now, and how it goes
    walking: false, sleeping: false
  };
  let target = null, idle = 0, rep = 0, train = null, runPhase = 0, chasing = false, speed = 0;
  const tmp = new THREE.Vector3();

  const goTo = (x, z) => { target = new THREE.Vector3(x, 0, z); };

  // ---- what CloClo can do with him ----
  pip.walkies = minutes => { pip.follow = minutes; pip.mode = 'follow'; };
  pip.startTraining = (spot, faceOfClo, trick) => {
    pip.mode = 'train';
    // Pip sits in front of CloClo, facing him
    const fx = Math.sin(faceOfClo), fz = Math.cos(faceOfClo);
    train = { spot: spot.clone(), front: new THREE.Vector3(spot.x + fx * 2.2, 0, spot.z + fz * 2.2), fx, fz, trick };
    pip.tries = pip.oks = 0;
    rep = 2;
    goTo(train.front.x, train.front.z);
  };
  // returns how the session went: { trick, before, after, tries, oks }
  pip.endTraining = () => {
    const t = train && train.trick;
    const result = t ? { trick: t, after: pip.tricks[t], tries: pip.tries, oks: pip.oks } : null;
    train = null;
    pip.doing = null;
    pip.mode = pip.follow > 0 ? 'follow' : 'home';
    return result;
  };
  pip.bedtime = () => { pip.follow = 0; if (pip.mode === 'follow') pip.mode = 'home'; };

  // ---- every frame ----
  pip.update = (gd, cloPos, cloVisible, isNight) => {
    if (pip.mode === 'follow') {
      pip.follow -= gd;
      if (pip.follow <= 0) pip.mode = 'home';
      // trot after him: set off once he's a few steps away, settle down once close, with a margin
      // in between so he doesn't stop and start all the time; the further behind, the faster
      tmp.set(cloPos.x - pip.pos.x, 0, cloPos.z - pip.pos.z);
      const d = tmp.length();
      if (d > 2.6) chasing = true;
      if (d < 1.5) chasing = false;
      if (chasing) goTo(cloPos.x - tmp.x / d * 1.3, cloPos.z - tmp.z / d * 1.3);
      else target = null;
    } else if (pip.mode === 'train' && train) {
      rep -= gd;
      if (rep <= 0 && !target) {
        // one try at the trick: the better he knows it, the likelier it works
        const t = train.trick, skill = pip.tricks[t];
        pip.ok = Math.random() < .2 + skill / 100 * .75;
        pip.doing = pip.ok ? t : 'oops';
        pip.tries++;
        if (pip.ok) pip.oks++;
        pip.tricks[t] = Math.min(100, skill + (pip.ok ? 3.5 : 1.5));
        rep = 6;
        runPhase = t === 'fetch' || t === 'jump' ? 1 : 0;
        if (runPhase) {
          // run out (to the ball, or over the hurdle) …
          goTo(train.front.x + train.fx * 4.5, train.front.z + train.fz * 4.5);
        }
      }
      if (runPhase === 1 && !target) { runPhase = 2; goTo(train.front.x, train.front.z); } // … and back
      if (runPhase === 2 && !target) runPhase = 0;
    } else {
      // home: potter around the doghouse; sleep in it at night
      idle -= gd;
      if (idle < 0) {
        if (isNight) goTo(DOGHOUSE.door.x, DOGHOUSE.door.z);
        else {
          const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 3;
          goTo(DOGHOUSE.door.x + Math.cos(a) * r, DOGHOUSE.door.z + Math.sin(a) * r);
        }
        idle = 10 + Math.random() * 25;
      }
    }

    // move
    pip.walking = false;
    if (target) {
      tmp.subVectors(target, pip.pos);
      tmp.y = 0;
      const d = tmp.length();
      // speed up and slow down gently instead of starting and stopping at full speed
      const want = pip.mode === 'home' ? 1.6 : pip.mode === 'follow' ? Math.min(3.8, 1.4 + d * .9) : 3.4;
      speed += (want - speed) * Math.min(1, gd * 1.5);
      const step = Math.max(.3, speed) * gd;
      if (d <= step) { pip.pos.copy(target); target = null; }
      else { pip.pos.addScaledVector(tmp, step / d); pip.face = Math.atan2(tmp.x, tmp.z); pip.walking = true; }
    } else speed = 0;
    if (!pip.walking) {
      if (pip.mode === 'train' && train) pip.face = Math.atan2(train.spot.x - pip.pos.x, train.spot.z - pip.pos.z);
      else if (pip.mode === 'follow') pip.face = Math.atan2(cloPos.x - pip.pos.x, cloPos.z - pip.pos.z);
    }
    if (pip.mode !== 'train') pip.doing = null;
    pip.sleeping = pip.mode === 'home' && isNight && !pip.walking;
  };

  pip.save = () => ({ tricks: pip.tricks, pos: pip.pos.toArray() });
  pip.load = d => {
    if (!d) return;
    Object.assign(pip.tricks, d.tricks || {});
    if (d.pos) pip.pos.fromArray(d.pos);
  };
  return pip;
}
