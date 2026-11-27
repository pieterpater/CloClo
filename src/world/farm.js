import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';
import { LOC } from './locations.js';

// The Little farm (chickens, Wooly the sheep, the rabbits Bun and Bean) and the training field.
// The farm animals live in the viewer's browser: they potter about on their own, and come to CloClo
// when he feeds or pets them.
let farm = null, field = null;
const chickens = [], rabbits = [];
let sheep = null;
const tmp = new THREE.Vector3();

// pen inside the farm group (the group faces the square: +z is towards CloClo's spot)
const PEN = { x0: -4.3, x1: 4.3, z0: -3.6, z1: 2.6 };

function fence(g, x0, z0, x1, z1, gap = null) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.1));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    if (gap && Math.abs(x - gap) < .6 && z0 === z1) continue;
    mesh(box(.12, .8, .12), mat(0xffffff), x, .4, z, g);
  }
  for (const y of [.35, .65]) {
    const r = mesh(box(len, .06, .05), mat(0xffffff), (x0 + x1) / 2, y, (z0 + z1) / 2, g);
    r.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  }
}

function chicken(i) {
  const c = new THREE.Group();
  const white = i === 2 ? mat(0xb5651d) : mat(0xffffff);
  const body = new THREE.Group();
  c.add(body);
  mesh(new THREE.SphereGeometry(.2, 10, 8), white, 0, .28, 0, body).scale.set(.9, .9, 1.2);
  mesh(new THREE.ConeGeometry(.1, .2, 6), white, 0, .38, -.24, body).rotation.x = -1;  // tail
  const head = new THREE.Group();
  head.position.set(0, .45, .18);
  body.add(head);
  mesh(new THREE.SphereGeometry(.1, 8, 6), white, 0, 0, 0, head);
  mesh(new THREE.ConeGeometry(.03, .09, 5), mat(0xff9f1c), 0, -.02, .12, head).rotation.x = Math.PI / 2;
  mesh(box(.03, .08, .1), mat(0xe63946), 0, .1, 0, head); // comb
  for (const s of [-.07, .07]) mesh(new THREE.CylinderGeometry(.015, .015, .16, 4), mat(0xff9f1c), s, .08, 0, c);
  c.userData = { body, head, target: new THREE.Vector3(), idle: 0, phase: i * 1.7 };
  return c;
}

function rabbit(colour) {
  const r = new THREE.Group();
  const fur = mat(colour);
  mesh(new THREE.SphereGeometry(.18, 10, 8), fur, 0, .17, 0, r).scale.set(.9, .85, 1.2);
  mesh(new THREE.SphereGeometry(.12, 10, 8), fur, 0, .3, .16, r);
  for (const s of [-.05, .05]) mesh(new THREE.SphereGeometry(.04, 6, 4), fur, s, .48, .14, r).scale.set(1, 3, 1);
  mesh(new THREE.SphereGeometry(.06, 6, 4), mat(0xffffff), 0, .2, -.2, r); // tail
  r.userData = { target: new THREE.Vector3(), idle: 0, hop: 0 };
  return r;
}

export function buildFarm() {
  const L = LOC.farm;
  farm = new THREE.Group();
  farm.position.set(L.x, 0, L.z);
  farm.rotation.y = L.rot;
  scene.add(farm);
  // straw-coloured ground in the pen
  const yard = mesh(box(PEN.x1 - PEN.x0, .06, PEN.z1 - PEN.z0), mat(0xc9b37e), (PEN.x0 + PEN.x1) / 2, .03, (PEN.z0 + PEN.z1) / 2, farm);
  yard.castShadow = false;
  fence(farm, PEN.x0, PEN.z1, PEN.x1, PEN.z1, 0);
  fence(farm, PEN.x0, PEN.z0, PEN.x0, PEN.z1);
  fence(farm, PEN.x1, PEN.z0, PEN.x1, PEN.z1);
  fence(farm, PEN.x0, PEN.z0, PEN.x1, PEN.z0);
  // red barn behind the pen
  mesh(box(5, 3, 3.2), mat(0xc0392b), 0, 1.5, -5.6, farm);
  const roof = mesh(new THREE.CylinderGeometry(1.9, 1.9, 5.3, 3), mat(0x5c3d2e), 0, 3.35, -5.6, farm);
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(1, 1, 1.1);
  mesh(box(1.6, 2, .1), mat(0xffffff), 0, 1, -3.95, farm);
  mesh(box(1.4, 1.8, .12), mat(0x8a3324), 0, .95, -3.92, farm);
  // chicken coop on little legs, with a ramp
  const coop = new THREE.Group();
  coop.position.set(-3, 0, -2.6);
  farm.add(coop);
  for (const [x, z] of [[-.5, -.4], [.5, -.4], [-.5, .4], [.5, .4]]) mesh(box(.08, .6, .08), mat(0x8a5a3b), x, .3, z, coop);
  mesh(box(1.3, .8, 1), mat(0xf6bd60), 0, 1, 0, coop);
  const cr = mesh(new THREE.ConeGeometry(1, .5, 4), mat(0xe76f51), 0, 1.65, 0, coop);
  cr.rotation.y = Math.PI / 4;
  const ramp = mesh(box(.35, .05, .9), mat(0x8a5a3b), .35, .35, .75, coop);
  ramp.rotation.x = .7;
  // water trough
  mesh(box(1.4, .3, .5), mat(0x8a5a3b), 2.6, .15, -2.8, farm);
  mesh(box(1.2, .05, .35), mat(0x4cc9f0), 2.6, .28, -2.8, farm);
  // rabbit hutch with a little run, front right outside the pen
  const hutch = new THREE.Group();
  hutch.position.set(3.4, 0, 4.2);
  farm.add(hutch);
  mesh(box(1.4, .8, .8), mat(0xdda15e), 0, .7, -.6, hutch);
  mesh(box(1.5, .08, .9), mat(0x6f4518), 0, 1.14, -.6, hutch);
  for (const [x, z] of [[-.6, -.9], [.6, -.9], [-.6, -.3], [.6, -.3]]) mesh(box(.07, .35, .07), mat(0x6f4518), x, .17, z, hutch);
  fence(hutch, -.8, .9, .8, .9);
  fence(hutch, -.8, -.2, -.8, .9);
  fence(hutch, .8, -.2, .8, .9);
  // a hay bale
  mesh(new THREE.CylinderGeometry(.55, .55, .9, 12), mat(0xe9c46a), -3.4, .55, 1.2, farm).rotation.z = Math.PI / 2;

  for (let i = 0; i < 4; i++) {
    const c = chicken(i);
    c.position.set(-3 + i * .7, 0, 0);
    farm.add(c);
    chickens.push(c);
  }
  // Wooly the sheep: a cloud of wool on four dark legs
  sheep = new THREE.Group();
  const wool = mat(0xf8f9fa);
  for (const [x, y, z, r] of [[0, .62, 0, .38], [0, .66, .28, .3], [0, .64, -.3, .32], [.18, .7, 0, .28], [-.18, .7, 0, .28], [0, .85, 0, .26]]) mesh(new THREE.IcosahedronGeometry(r, 1), wool, x, y, z, sheep);
  const face = mesh(new THREE.SphereGeometry(.2, 10, 8), mat(0x3d3d3d), 0, .78, .58, sheep);
  face.scale.set(.85, 1, 1.1);
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(.035, 6, 4), mat(0xffffff), s * .08, .84, .74, sheep);
    const e = mesh(new THREE.SphereGeometry(.07, 6, 4), mat(0x3d3d3d), s * .2, .86, .5, sheep);
    e.scale.set(1.6, .6, .8);
  }
  sheep.userData = { legs: [[-.15, .22], [.15, .22], [-.15, -.22], [.15, -.22]].map(([x, z]) => mesh(new THREE.CylinderGeometry(.05, .05, .4, 6), mat(0x3d3d3d), x, .2, z, sheep)), target: new THREE.Vector3(2.5, 0, -1), idle: 0 };
  sheep.position.set(2.5, 0, -1);
  farm.add(sheep);
  for (const [i, colour] of [[0, 0x8d6346], [1, 0xf1f1f1]]) {
    const r = rabbit(colour);
    r.position.set(-.3 + i * .6, 0, .4);
    hutch.add(r);
    rabbits.push(r);
  }

  buildField();
}

function buildField() {
  const L = LOC.field;
  field = new THREE.Group();
  field.position.set(L.x, 0, L.z);
  field.rotation.y = L.rot;
  scene.add(field);
  const lawn = mesh(box(6, .04, 8), mat(0x80c26b), 0, .02, 0, field);
  lawn.castShadow = false;
  for (const [x, z] of [[-2.8, -3.8], [2.8, -3.8], [-2.8, 3.8], [2.8, 3.8]]) mesh(new THREE.ConeGeometry(.2, .5, 10), mat(0xff9f1c), x, .25, z, field);
  // the hurdle Pip jumps over, on his way out
  for (const x of [-.7, .7]) mesh(box(.08, .6, .08), mat(0xffffff), x, .3, -.3, field);
  mesh(box(1.5, .07, .07), mat(0xe63946), 0, .45, -.3, field);
  // a ball and a little sign
  mesh(new THREE.SphereGeometry(.12, 10, 8), mat(0xc7f464), 1.6, .12, -2.6, field);
  mesh(box(.08, .9, .08), mat(0x8a5a3b), -2.4, .45, 3.2, field);
  mesh(box(.9, .5, .06), mat(0xfefae0), -2.4, .95, 3.2, field);
}

// Wander to a new spot now and then; walk there.
function potter(a, rd, speed, pick) {
  const u = a.userData;
  u.idle -= rd;
  if (u.idle < 0) { pick(u.target); u.idle = 2 + Math.random() * 5; }
  tmp.subVectors(u.target, a.position);
  tmp.y = 0;
  const d = tmp.length();
  if (d > .05) {
    a.position.addScaledVector(tmp, Math.min(1, speed * rd / d));
    a.rotation.y = Math.atan2(tmp.x, tmp.z);
    return true;
  }
  return false;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// act/mode: what CloClo is doing; cloPos: where he is
export function updateFarm(anim, rd, act, doing, cloPos) {
  const local = farm.worldToLocal(tmp.copy(cloPos));
  const cx = local.x;

  // chickens: peck about in the left half; rush to the front when he scatters grain
  chickens.forEach((c, i) => {
    const feeding = doing && act === 'feed_chickens';
    if (feeding) {
      c.userData.target.set(clamp(cx + (i - 1.5) * .55, PEN.x0 + .4, PEN.x1 - .4), 0, PEN.z1 - .5 - (i % 2) * .4);
      c.userData.idle = 1;
    }
    const moving = potter(c, rd, feeding ? 2.2 : .8, t => t.set(PEN.x0 + .5 + Math.random() * 3.6, 0, PEN.z0 + 1.5 + Math.random() * 3.4));
    const peck = !moving && Math.sin(anim * (feeding ? 9 : 3) + c.userData.phase) > (feeding ? -.3 : .6);
    c.userData.head.rotation.x = peck ? .9 : 0;
    c.userData.head.position.z = peck ? .26 : .18;
    c.userData.body.position.y = moving ? Math.abs(Math.sin(anim * 14 + i)) * .04 : 0;
  });

  // Wooly: grazes in the right half; comes to the front fence to be petted
  const petting = doing && act === 'pet_sheep';
  if (petting) { sheep.userData.target.set(clamp(cx, .5, PEN.x1 - .6), 0, PEN.z1 - .7); sheep.userData.idle = 1; }
  const walking = potter(sheep, rd, petting ? 1.2 : .5, t => t.set(.6 + Math.random() * 3, 0, PEN.z0 + 1.2 + Math.random() * 3));
  if (petting && !walking) sheep.rotation.y = 0; // face CloClo at the fence
  sheep.userData.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(anim * 9 + i * Math.PI) * .4 : 0);
  sheep.position.y = petting && !walking ? Math.abs(Math.sin(anim * 3)) * .04 : 0;

  // Bun and Bean: hop about in their run; come to the fence for carrots
  rabbits.forEach((r, i) => {
    const u = r.userData, feeding = doing && act === 'feed_rabbits';
    if (feeding) { u.target.set(-.25 + i * .5, 0, .65); u.idle = 1; }
    const moving = potter(r, rd, feeding ? 1.4 : .9, t => t.set(-.6 + Math.random() * 1.2, 0, Math.random() * .8));
    r.position.y = moving ? Math.abs(Math.sin(anim * 10 + i)) * .18 : 0;
  });
}
