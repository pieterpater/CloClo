import { world } from '../state.js';
import { LOC } from '../world/locations.js';
import { park } from '../world/park.js';

let blink = 3;

// CloClo's pose and movement, rebuilt from a rest pose every frame.
export function animateCloClo(model, S, anim, rd) {
  const { clo, body, eyes, feet, arms, can } = model;

  let dr = S.face - clo.rotation.y;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  clo.rotation.y += dr * Math.min(1, rd * 8);

  body.position.y = 0;
  body.rotation.set(0, 0, 0);
  body.scale.set(1, 1, 1);
  arms[0].rotation.set(0, 0, 0);
  arms[1].rotation.set(0, 0, 0);
  feet.forEach(f => f.position.z = .2);

  const w = anim * (world.speed > 1 ? 14 : 10);
  if (S.mode === 'walking') {
    body.position.y = Math.abs(Math.sin(w)) * .18;
    body.rotation.z = Math.sin(w) * .07;
    feet[0].position.z = .2 + Math.sin(w) * .25;
    feet[1].position.z = .2 - Math.sin(w) * .25;
    arms[0].rotation.x = Math.sin(w) * .6;
    arms[1].rotation.x = -Math.sin(w) * .6;
  } else if (S.mode === 'doing') {
    const s = S.act;
    if (s === 'eat') {
      const b = Math.abs(Math.sin(anim * 5));
      body.scale.set(1 + b * .06, 1 - b * .06, 1 + b * .06);
      arms[1].rotation.x = -1.6 - Math.sin(anim * 5) * .3;
    } else if (s === 'dance') {
      clo.rotation.y += rd * 4;
      S.face = clo.rotation.y;
      body.position.y = Math.abs(Math.sin(anim * 7)) * .4;
      arms[0].rotation.z = -2.4;
      arms[1].rotation.z = 2.4 + Math.sin(anim * 7) * .4;
    } else if (s === 'ducks') {
      arms[1].rotation.z = 2.5 + Math.sin(anim * 8) * .4;
      body.position.y = Math.abs(Math.sin(anim * 3)) * .1;
    } else if (s === 'fish') {
      body.rotation.z = Math.sin(anim * 1.2) * .05;
      arms[1].rotation.x = -.8;
      body.position.y = -.1;
    } else if (s === 'gardening') {
      body.rotation.x = .25 + Math.sin(anim * 2) * .1;
      arms[1].rotation.x = -1.2;
      can.rotation.x = Math.sin(anim * 2) * .4;
    } else if (s === 'fountain') {
      body.scale.y = 1 + Math.sin(anim * 1.5) * .02;
    }
  }

  // on the swing: CloClo sits on the seat (the swing itself moves in world/park.js)
  if (S.mode === 'doing' && S.act === 'swing') {
    park.seatTop.getWorldPosition(clo.position);
    clo.position.y -= .05;
    S.face = LOC.park.rot;
    arms[0].rotation.z = -2.6;
    arms[1].rotation.z = 2.6;
    feet.forEach(f => f.position.z = .5);
  }

  // blinking; at the fountain he half-closes his eyes
  blink -= rd;
  const bs = blink < 0 ? Math.max(.1, Math.abs(blink + .08) / .08) : 1;
  if (blink < -.16) blink = 2 + Math.random() * 4;
  eyes.forEach(e => e.scale.y = S.act === 'fountain' && S.mode === 'doing' ? .55 : bs);
}
