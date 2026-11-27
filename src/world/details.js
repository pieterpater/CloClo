import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box, rnd } from '../helpers.js';
import { LOC, NEIGHBOURS, WORLD_R, heightAt } from './locations.js';

// Small things that make Mosdorp feel lived-in: grass, flowers, bushes, land and mountains on the
// horizon, benches on the square, lily pads and reeds, chimney smoke, birds and fireflies.

// distance from a point to the road leading to location L
function roadDist(px, pz, L) {
  const ux = -L.dir.x, uz = -L.dir.z, t = Math.max(0, Math.min(L.spot.length() + 2, px * ux + pz * uz));
  return Math.hypot(px - ux * t, pz - uz * t);
}
// is (x, z) on open grass: off the square, the roads and the places?
function onGrass(x, z, roadMargin = 1.8, extra = 0) {
  if (Math.hypot(x, z) < 7.8) return false;
  for (const k in LOC) {
    const L = LOC[k];
    if (!L.dir) continue;
    if (roadDist(x, z, L) < roadMargin) return false;
    if (Math.hypot(x - L.x, z - L.z) < L.clear - 1 + extra) return false;
  }
  for (const n of NEIGHBOURS) if (Math.hypot(x - n.x, z - n.z) < n.clear - 1 + extra) return false;
  return true;
}

const smoke = [], birds = [], flies = [];
let chimney = null, smokeT = 0;

export function buildDetails() {
  // ---- land beyond the village, and mountains on the horizon ----
  const land = mesh(new THREE.RingGeometry(WORLD_R - .5, 120, 72, 1), mat(0x649f53), 0, -.01, 0);
  land.rotation.x = -Math.PI / 2;
  land.castShadow = false;
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2 + rnd() * .2, r = 80 + rnd() * 16, h = 9 + rnd() * 14, w = 10 + rnd() * 9;
    const m = mesh(new THREE.ConeGeometry(w, h, 5 + Math.floor(rnd() * 3)), mat(rnd() < .5 ? 0x6e9a86 : 0x7c9f8c), Math.cos(a) * r, h / 2 - .2, Math.sin(a) * r);
    m.rotation.y = rnd() * Math.PI;
    m.castShadow = m.receiveShadow = false;
    if (h > 16) {
      // a snowy top: the same shape, smaller, sitting on the peak
      const cap = mesh(new THREE.ConeGeometry(w * .3, h * .3, m.geometry.parameters.radialSegments), mat(0xf4f7f5), Math.cos(a) * r, h - h * .15 - .2, Math.sin(a) * r);
      cap.rotation.y = m.rotation.y;
      cap.castShadow = cap.receiveShadow = false;
    }
  }

  // ---- grass tufts and wildflowers (instanced: hundreds for the price of one) ----
  const tuftGeo = new THREE.ConeGeometry(.11, .28, 4);
  tuftGeo.translate(0, .12, 0);
  const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ roughness: .9, flatShading: true }), 1500);
  const flowerGeo = new THREE.IcosahedronGeometry(.09);
  flowerGeo.translate(0, .28, 0);
  const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ roughness: .7, flatShading: true }), 650);
  const o = new THREE.Object3D(), c = new THREE.Color();
  const greens = [0x78b864, 0x84c26e, 0x6aa957, 0x8fca78], petals = [0xffffff, 0xffd166, 0xff8fab, 0xc77dff, 0x8ecae6];
  let nt = 0, nf = 0;
  for (let tries = 0; tries < 10000 && (nt < tufts.count || nf < flowers.count); tries++) {
    const a = rnd() * Math.PI * 2, r = 8 + rnd() * (WORLD_R - 9), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!onGrass(x, z)) continue;
    const y = heightAt(x, z);
    if (nt < tufts.count) {
      o.position.set(x, y, z);
      o.rotation.set((rnd() - .5) * .3, rnd() * Math.PI, (rnd() - .5) * .3);
      o.scale.set(1 + rnd() * .6, .7 + rnd() * .6, 1 + rnd() * .6);
      o.updateMatrix();
      tufts.setMatrixAt(nt, o.matrix);
      tufts.setColorAt(nt, c.setHex(greens[Math.floor(rnd() * greens.length)]));
      nt++;
    }
    // flowers grow in little clusters
    if (nf < flowers.count && rnd() < .35) {
      const colour = petals[Math.floor(rnd() * petals.length)];
      for (let k = 0; k < 4 && nf < flowers.count; k++) {
        const fx = x + (rnd() - .5) * 1.2, fz = z + (rnd() - .5) * 1.2;
        o.position.set(fx, heightAt(fx, fz), fz);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(.8 + rnd() * .5);
        o.updateMatrix();
        flowers.setMatrixAt(nf, o.matrix);
        flowers.setColorAt(nf, c.setHex(colour));
        nf++;
      }
    }
  }
  tufts.count = nt;
  flowers.count = nf;
  for (const m of [tufts, flowers]) { m.receiveShadow = true; scene.add(m); }

  // ---- bushes along the roads ----
  for (const k in LOC) {
    const L = LOC[k];
    if (!L.dir) continue;
    for (let i = 0; i < 3; i++) {
      const t = 9 + rnd() * (L.spot.length() - 12), side = rnd() < .5 ? -1 : 1;
      const ux = -L.dir.x, uz = -L.dir.z, px = -uz * side * 2.4, pz = ux * side * 2.4;
      const x = ux * t + px, z = uz * t + pz;
      if (!onGrass(x, z, 1.9)) continue;
      const s = .45 + rnd() * .35;
      const b = new THREE.Group();
      b.position.set(x, heightAt(x, z), z);
      scene.add(b);
      mesh(new THREE.IcosahedronGeometry(s, 1), mat(rnd() < .5 ? 0x3f7d3a : 0x4d8f45), 0, s * .7, 0, b);
      mesh(new THREE.IcosahedronGeometry(s * .7, 1), mat(0x4d8f45), s * .7, s * .5, .1, b);
      if (rnd() < .4) for (let j = 0; j < 4; j++) mesh(new THREE.SphereGeometry(.06, 6, 4), mat(0xe63946), (rnd() - .3) * s * 1.4, s * (.6 + rnd() * .8), (rnd() - .5) * s, b); // berries
    }
  }

  // ---- benches around the square, facing the fountain ----
  const angles = Object.values(LOC).filter(L => L.ang !== undefined).map(L => L.ang).sort((a, b) => a - b);
  angles.forEach((a, i) => {
    if (i % 2) return;
    let b2 = angles[(i + 1) % angles.length];
    if (b2 < a) b2 += Math.PI * 2;
    const m = (a + b2) / 2, x = Math.cos(m) * 6.3, z = Math.sin(m) * 6.3;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-x, -z);
    scene.add(g);
    mesh(box(1.5, .1, .45), mat(0x8a5a3b), 0, .45, 0, g);
    mesh(box(1.5, .4, .08), mat(0x8a5a3b), 0, .75, -.22, g);
    for (const s of [-.6, .6]) mesh(box(.08, .45, .4), mat(0x30475e), s, .22, 0, g);
  });

  // ---- the pond: lily pads and reeds ----
  const P = LOC.pond;
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2, r = 1 + rnd() * 2.9;
    const pad = mesh(new THREE.CylinderGeometry(.28 + rnd() * .15, .3, .02, 10, 1, false, .4, Math.PI * 2 - .4), mat(0x3d8b4f), P.x + Math.cos(a) * r, .11, P.z + Math.sin(a) * r);
    pad.rotation.y = rnd() * Math.PI * 2;
    pad.castShadow = false;
    if (rnd() < .35) mesh(new THREE.IcosahedronGeometry(.1), mat(0xff8fab), pad.position.x, .17, pad.position.z);
  }
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2;
    if (Math.abs(Math.sin((a - P.rot) / 2)) < .2) continue; // keep the path side clear
    for (let j = 0; j < 4; j++) {
      const x = P.x + Math.cos(a + j * .05) * (4.1 + rnd() * .3), z = P.z + Math.sin(a + j * .05) * (4.1 + rnd() * .3), h = .8 + rnd() * .6;
      mesh(new THREE.CylinderGeometry(.025, .03, h, 4), mat(0x5b8a3c), x, h / 2, z).rotation.z = (rnd() - .5) * .2;
      if (rnd() < .5) mesh(new THREE.CylinderGeometry(.05, .05, .2, 6), mat(0x7f5539), x, h - .05, z);
    }
  }

  // ---- where the chimney smoke comes from ----
  const H = LOC.home, cx = 1.2, cz = -.6;
  chimney = new THREE.Vector3(H.x + cx * Math.cos(H.rot) + cz * Math.sin(H.rot), H.b.h + 2.5, H.z - cx * Math.sin(H.rot) + cz * Math.cos(H.rot));
  for (let i = 0; i < 10; i++) {
    const p = mesh(new THREE.IcosahedronGeometry(.3, 1), new THREE.MeshStandardMaterial({ color: 0xeeeeee, transparent: true, opacity: 0, roughness: 1, depthWrite: false }), 0, -10, 0);
    p.castShadow = false;
    p.userData.age = 99;
    smoke.push(p);
  }

  // ---- birds ----
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    const wings = [-1, 1].map(s => {
      const w = new THREE.Group();
      b.add(w);
      mesh(box(.5, .03, .18), mat(0x30475e), s * .25, 0, 0, w).castShadow = false;
      return w;
    });
    b.userData = { wings, r: 18 + i * 4, h: 13 + (i % 3) * 2, speed: .12 + i * .02, phase: i * 1.7, dir: i % 2 ? 1 : -1 };
    scene.add(b);
    birds.push(b);
  }

  // ---- fireflies ----
  const spots = [LOC.meadow, LOC.pond, LOC.park];
  for (let i = 0; i < 36; i++) {
    const S = spots[i % spots.length];
    const f = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0 }));
    f.userData = { cx: S.x + (rnd() - .5) * 8, cz: S.z + (rnd() - .5) * 8, phase: rnd() * 20, r: .6 + rnd() * 1.4 };
    scene.add(f);
    flies.push(f);
  }
}

export function updateDetails(anim, rd, isNight) {
  // chimney smoke: a new puff now and then; puffs drift up, grow and fade
  smokeT -= rd;
  if (smokeT < 0) {
    smokeT = .9;
    const p = smoke.find(s => s.userData.age > 4);
    if (p) { p.userData.age = 0; p.position.copy(chimney); }
  }
  for (const p of smoke) {
    const u = p.userData;
    if (u.age > 4) { p.material.opacity = 0; continue; }
    u.age += rd;
    p.position.y += rd * .5;
    p.position.x += rd * .15;
    p.scale.setScalar(.5 + u.age * .4);
    p.material.opacity = Math.min(1, u.age * 2) * (1 - u.age / 4) * .55;
  }

  // birds circle high above the village in the daytime
  for (const b of birds) {
    const u = b.userData, t = anim * u.speed * u.dir + u.phase;
    b.visible = !isNight;
    b.position.set(Math.cos(t) * u.r, u.h + Math.sin(t * 3) * .6, Math.sin(t) * u.r);
    b.rotation.y = -t * u.dir + (u.dir > 0 ? Math.PI : 0);
    const flap = Math.sin(anim * 8 + u.phase) * .5;
    u.wings[0].rotation.z = flap;
    u.wings[1].rotation.z = -flap;
  }

  // fireflies glow and wander at night
  for (const f of flies) {
    const u = f.userData, t = anim * .4 + u.phase;
    f.visible = isNight;
    if (!isNight) continue;
    f.position.set(u.cx + Math.cos(t) * u.r + Math.sin(t * 2.3) * .3, .5 + Math.sin(t * 1.7) * .3 + .4, u.cz + Math.sin(t * 1.3) * u.r);
    f.material.opacity = Math.max(0, Math.sin(anim * 2 + u.phase * 3)) * .95;
  }
}
