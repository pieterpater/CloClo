import * as THREE from 'three';
import { world } from '../state.js';
import { clamp } from '../helpers.js';
import { LOC } from '../world/locations.js';
import { park } from '../world/park.js';
import { ACTS } from '../sim/acts.js';
import { emit } from '../particles.js';

let blink = 3, lookT = 0, hopT = 0, wowT = 0, fxT = 0;
const look = new THREE.Vector2(), lookGoal = new THREE.Vector2();
const fxPos = new THREE.Vector3();

// CloClo's pose and movement, rebuilt from a rest pose every frame.
//   moodName: how he feels (delighted, happy, calm, sleepy, grumpy, sad); isNight: whether it is dark outside
const MOOD = { delighted: 95, happy: 75, calm: 55, sleepy: 50, grumpy: 30, sad: 20 };

export function animateCloClo(model, S, anim, rd, moodName, isNight) {
  const mood = MOOD[moodName] ?? 75;
  const { clo, body, eyes, looks, brows, cheeks, mouth, open, tail, tuft, feet, arms, items, lantern } = model;
  const a = ACTS[S.act];
  const doing = S.mode === 'doing', s = doing ? S.act : null;

  let dr = S.face - clo.rotation.y;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  clo.rotation.y += dr * Math.min(1, rd * 8);

  // rest pose, gently breathing
  const breath = Math.sin(anim * 2.2) * .012;
  body.position.y = 0;
  body.rotation.set(0, 0, 0);
  body.scale.set(1 - breath, 1 + breath, 1 - breath);
  arms[0].rotation.set(0, 0, 0);
  arms[1].rotation.set(0, 0, 0);
  feet.forEach(f => f.position.z = .2);
  let mouthOpen = false, eyeSquint = 1;
  lookGoal.set(look.x, look.y);

  const w = anim * (world.speed > 1 ? 14 : 10);
  if (S.mode === 'walking' || S.moving) {
    const bounce = mood > 60 ? .24 : mood > 35 ? .18 : .1;
    body.position.y = Math.abs(Math.sin(w)) * bounce;
    body.rotation.z = Math.sin(w) * .07;
    body.rotation.x = mood < 35 || moodName === 'sleepy' ? .12 : 0;
    feet[0].position.z = .2 + Math.sin(w) * .25;
    feet[1].position.z = .2 - Math.sin(w) * .25;
    arms[0].rotation.x = Math.sin(w) * .6;
    arms[1].rotation.x = -Math.sin(w) * .6;
  } else if (S.mode === 'thinking') {
    // pondering: head tilted, hand on chin, eyes up
    body.rotation.z = Math.sin(anim * 1.2) * .1;
    arms[1].rotation.x = -1.3;
    arms[1].rotation.z = .5;
    lookGoal.set(.04, .07);
  } else if (s === 'eat') {
    const b = Math.abs(Math.sin(anim * 5));
    body.scale.set(1 + b * .06, 1 - b * .06, 1 + b * .06);
    arms[1].rotation.x = -1.6 - Math.sin(anim * 5) * .3;
    mouthOpen = Math.sin(anim * 10) > 0;
  } else if (s === 'dance') {
    clo.rotation.y += rd * 4;
    S.face = clo.rotation.y;
    body.position.y = Math.abs(Math.sin(anim * 7)) * .4;
    arms[0].rotation.z = -2.4;
    arms[1].rotation.z = 2.4 + Math.sin(anim * 7) * .4;
    mouthOpen = Math.sin(anim * 3.5) > -.3;
  } else if (s === 'ducks') {
    arms[1].rotation.z = 2.5 + Math.sin(anim * 8) * .4;
    body.position.y = Math.abs(Math.sin(anim * 3)) * .1;
    mouthOpen = Math.sin(anim * 2) > .5;
  } else if (s === 'fish') {
    body.rotation.z = Math.sin(anim * 1.2) * .05;
    arms[1].rotation.x = -.8;
    body.position.y = -.1;
  } else if (s === 'gardening') {
    body.rotation.x = .25 + Math.sin(anim * 2) * .1;
    arms[1].rotation.x = -1.2;
    items.can.rotation.x = Math.sin(anim * 2) * .4;
  } else if (s === 'fountain') {
    body.scale.y = 1 + Math.sin(anim * 1.5) * .02;
    eyeSquint = .55;
  } else if (s === 'icecream') {
    const lick = (Math.sin(anim * 2) + 1) / 2;
    arms[1].rotation.x = -.7 - lick * 1.3;
    body.rotation.z = Math.sin(anim * 1.3) * .06;
    mouthOpen = lick > .8;
    eyeSquint = lick > .8 ? .5 : 1;
  } else if (s === 'stargaze') {
    body.rotation.x = -.22;
    arms[1].rotation.x = -2.7 + Math.sin(anim * .8) * .15;
    lookGoal.set(0, .07);
  } else if (s === 'letter') {
    arms[1].rotation.x = -1.15 + Math.sin(anim * 2) * .12;
    body.position.y = Math.abs(Math.sin(anim * 2.5)) * .06;
  } else if (s === 'butterflies') {
    clo.rotation.y += rd * 1.3;
    S.face = clo.rotation.y;
    body.position.y = Math.abs(Math.sin(anim * 5)) * .35;
    arms[1].rotation.x = -1.4 + Math.sin(anim * 5) * .8;
    arms[0].rotation.z = -1.2;
    mouthOpen = true;
    lookGoal.set(Math.sin(anim * 1.7) * .05, .05);
  } else if (s === 'build') {
    // reach out, put a block down, straighten up
    const reach = (Math.sin(anim * 2.4) + 1) / 2;
    arms[1].rotation.x = -.4 - reach * 1.1;
    arms[0].rotation.x = -.2 - reach * .5;
    body.rotation.x = reach * .2;
    lookGoal.set(0, -.03);
  } else if (s === 'feed_ducks' || s === 'feed_chickens') {
    // tossing crumbs or grain
    const toss = Math.max(0, Math.sin(anim * 3));
    arms[1].rotation.x = -.5 - toss * 1.4;
    body.rotation.x = .1 + toss * .08;
    lookGoal.set(0, -.04);
  } else if (s === 'pet_sheep' || s === 'feed_rabbits') {
    body.rotation.x = .25;
    arms[1].rotation.x = -1.2 + Math.sin(anim * 3) * .25;
    arms[0].rotation.x = s === 'pet_sheep' ? -1 + Math.sin(anim * 3 + 1) * .2 : 0;
    eyeSquint = s === 'pet_sheep' ? .5 : 1;
    lookGoal.set(0, -.05);
  } else if (s === 'train_pip') {
    // holding out a treat, cheering now and then
    const cheer = Math.sin(anim * 1.3) > .6;
    arms[1].rotation.x = -1.1;
    arms[0].rotation.z = cheer ? -2.3 : 0;
    body.position.y = cheer ? Math.abs(Math.sin(anim * 6)) * .12 : 0;
    mouthOpen = cheer;
    lookGoal.set(0, -.05);
  } else if (s === 'walk_pip') {
    arms[1].rotation.z = 2.4 + Math.sin(anim * 8) * .3;
    body.position.y = Math.abs(Math.sin(anim * 5)) * .12;
    mouthOpen = true;
  } else if (s === 'cat') {
    body.scale.y *= .92;
    body.rotation.x = .2;
    arms[1].rotation.x = -1 + Math.sin(anim * 3) * .3;
    arms[0].rotation.x = -.5;
    eyeSquint = .45;
    lookGoal.set(0, -.04);
  }

  // on the swing: CloClo sits on the seat (the swing itself moves in world/park.js)
  if (s === 'swing') {
    park.seatTop.getWorldPosition(clo.position);
    clo.position.y -= .05;
    S.face = LOC.park.rot;
    arms[0].rotation.z = -2.6;
    arms[1].rotation.z = 2.6;
    feet.forEach(f => f.position.z = .5);
    mouthOpen = Math.sin(anim * 2.2) > .7;
  }

  // a happy little hop when he arrives somewhere
  if (S.hop) { hopT = .45; S.hop = false; }
  if (hopT > 0) {
    hopT -= rd;
    body.position.y += Math.sin(Math.PI * (1 - hopT / .45)) * .45;
  }
  // surprise: a "!" and a wide-open mouth
  if (S.wow) {
    wowT = 1.2;
    S.wow = false;
    emit('wow', fxPos.copy(clo.position).setY(clo.position.y + 2.2));
  }
  if (wowT > 0) { wowT -= rd; mouthOpen = true; eyeSquint = 1.15; }

  // mood on his face: smile or frown, eyebrows, cheeks; heavy eyelids when sleepy or sad
  const happy = clamp((mood - 40) / 50, 0, 1), sad = clamp((40 - mood) / 30, 0, 1);
  mouth.visible = !mouthOpen;
  open.visible = mouthOpen;
  mouth.rotation.z = mood >= 35 ? Math.PI : 0;
  mouth.position.y = mood >= 35 ? .98 : .93;
  mouth.scale.set(1, mood >= 35 ? .45 + happy * .7 : .6, 1);
  brows.forEach((b, i) => {
    const side = i ? 1 : -1;
    b.rotation.z = -side * sad * .45;
    b.position.y = 1.62 + happy * .03;
  });
  cheeks.forEach(c => { const k = .75 + happy * .45 + (s === 'cat' ? .2 : 0); c.scale.x = c.scale.y = k; });
  if ((moodName === 'sleepy' || mood < 25) && !mouthOpen) eyeSquint = Math.min(eyeSquint, moodName === 'sleepy' ? .55 : .7);

  // tail wags faster when he is happy; the tuft bobs along
  tail.rotation.y = Math.sin(anim * (4 + happy * 6)) * (.2 + happy * .25);
  tuft.rotation.z = Math.sin(anim * 3) * .12 + body.rotation.z;

  // eyes glance around now and then
  lookT -= rd;
  if (lookT < 0) {
    lookT = 1 + Math.random() * 3;
    look.set((Math.random() - .5) * .1, (Math.random() - .5) * .06);
  }
  looks.forEach(l => {
    l.position.x += (lookGoal.x - l.position.x) * Math.min(1, rd * 10);
    l.position.y += (lookGoal.y - l.position.y) * Math.min(1, rd * 10);
  });

  // blinking
  blink -= rd;
  const bs = blink < 0 ? Math.max(.1, Math.abs(blink + .08) / .08) : 1;
  if (blink < -.16) blink = 2 + Math.random() * 4;
  eyes.forEach(e => e.scale.y = Math.min(bs, eyeSquint) * (eyeSquint > 1 ? eyeSquint : 1));

  // a lantern after dark
  lantern.visible = isNight;
  if (isNight && S.mode !== 'walking') arms[0].rotation.x = Math.min(arms[0].rotation.x, -.3);

  // little symbols floating up while he does something he enjoys
  if (doing && a.fx) {
    fxT -= rd;
    if (fxT < 0) {
      fxT = a.fx[1] * (.8 + Math.random() * .4);
      const L = LOC[a.loc];
      // indoors: float up from beside the roof (by the chimney), clear of the thought bubble
      if (a.inside) fxPos.set(L.x + Math.cos(L.rot) * 1.4, L.b.h + 1.6, L.z - Math.sin(L.rot) * 1.4);
      else fxPos.copy(clo.position).setY(clo.position.y + 2.1);
      emit(a.fx[0], fxPos);
    }
  } else fxT = .4;
}
