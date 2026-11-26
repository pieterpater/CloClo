import * as THREE from 'three';
import { scene } from '../scene.js';
import { mesh, mat, box } from '../helpers.js';

// A point on CloClo's round body (centre y .95, radius .9, slightly squashed), for sticking details onto.
function onBody(x, y, back = false) {
  const ny = (y - .95) / .855, nx = x / .9;
  const z = .9 * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * (back ? -1 : 1);
  return new THREE.Vector3(x, y, z);
}
// Place a flattened sphere on the body surface, facing outwards.
function patch(parent, m, r, x, y, back, flat = .3) {
  const p = onBody(x, y, back);
  const o = mesh(new THREE.SphereGeometry(r, 14, 10), m, p.x, p.y, p.z, parent);
  o.lookAt(p.x * 2, .95 + (p.y - .95) * 2, p.z * 2);
  o.scale.z = flat;
  o.castShadow = false;
  return o;
}

// CloClo's 3D model. `clo` is the whole figure, `body` everything except the feet.
export function buildCloClo() {
  const clo = new THREE.Group();
  scene.add(clo);
  const body = new THREE.Group();
  clo.add(body);
  const tealM = new THREE.MeshStandardMaterial({ color: 0x5fd3c4, roughness: .55 });
  const deepM = new THREE.MeshStandardMaterial({ color: 0x3fb0a2, roughness: .6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14213d, roughness: .3 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: .5 });

  mesh(new THREE.SphereGeometry(.9, 32, 24), tealM, 0, .95, 0, body).scale.y = .95;
  mesh(new THREE.SphereGeometry(.6, 20, 14), new THREE.MeshStandardMaterial({ color: 0xc9f5ee, roughness: .6 }), 0, .78, .5, body).scale.z = .45;

  // big shiny eyes; the pupils sit in a `look` group so they can glance around
  const eyes = [], looks = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * .3, 1.25, .68);
    body.add(e);
    mesh(new THREE.SphereGeometry(.29, 18, 14), white, 0, 0, 0, e);
    const look = new THREE.Group();
    e.add(look);
    mesh(new THREE.SphereGeometry(.16, 14, 10), dark, 0, 0, .19, look);
    mesh(new THREE.SphereGeometry(.055, 8, 6), shine, .05, .06, .33, look);
    mesh(new THREE.SphereGeometry(.025, 6, 4), shine, -.05, -.05, .33, look);
    eyes.push(e);
    looks.push(look);
  }

  // eyebrows, tilted to show his mood
  const brows = [-1, 1].map(s => {
    const p = onBody(s * .3, 1.62);
    const b = mesh(new THREE.SphereGeometry(.06, 10, 6), dark, p.x, p.y, p.z + .01, body);
    b.scale.set(1.7, .5, .5);
    b.rotation.x = -.6;
    return b;
  });

  // rosy cheeks
  const blushM = new THREE.MeshStandardMaterial({ color: 0xff8fab, roughness: .8, transparent: true, opacity: .75 });
  const cheeks = [-1, 1].map(s => patch(body, blushM, .13, s * .55, .98, false, .25));

  // spots on his back
  for (const [x, y, r] of [[-.35, 1.35, .14], [.25, 1.15, .11], [-.1, .8, .16], [.45, .65, .1], [-.55, .9, .09]]) patch(body, deepM, r, x, y, true, .25);

  // little horns and a curly tuft of hair
  for (const s of [-1, 1]) {
    const h = mesh(new THREE.ConeGeometry(.14, .45, 10), yellow, s * .42, 1.78, 0, body);
    h.rotation.z = -s * .35;
  }
  const tuft = new THREE.Group();
  tuft.position.set(0, 1.84, .05);
  body.add(tuft);
  const curl = mesh(new THREE.TorusGeometry(.1, .04, 8, 16, Math.PI * 1.5), deepM, 0, .1, 0, tuft);
  curl.rotation.y = Math.PI / 2;
  mesh(new THREE.SphereGeometry(.05, 8, 6), deepM, 0, 0, .1, tuft);

  // mouth: a smile that can turn into a frown, and an open mouth for eating, singing and surprise
  const mouth = mesh(new THREE.TorusGeometry(.12, .035, 8, 16, Math.PI), dark, 0, .98, .86, body);
  mouth.rotation.z = Math.PI;
  const open = new THREE.Group();
  open.position.set(0, .95, .84);
  body.add(open);
  mesh(new THREE.SphereGeometry(.1, 12, 10), dark, 0, 0, 0, open).scale.set(1, .85, .45);
  mesh(new THREE.SphereGeometry(.055, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff6b8b }), 0, -.04, .02, open).scale.set(1, .6, .6);
  open.visible = false;

  // a stubby tail with a darker tip
  const tail = new THREE.Group();
  tail.position.set(0, .45, -.78);
  body.add(tail);
  const tc = mesh(new THREE.ConeGeometry(.16, .5, 10), tealM, 0, .1, -.2, tail);
  tc.rotation.x = -1.1;
  mesh(new THREE.SphereGeometry(.08, 8, 6), deepM, 0, .2, -.42, tail);

  const feet = [-1, 1].map(s => {
    const f = mesh(new THREE.SphereGeometry(.26, 12, 10), deepM, s * .38, .14, .2, clo);
    f.scale.set(1, .6, 1.3);
    for (const t of [-.09, 0, .09]) mesh(new THREE.SphereGeometry(.06, 6, 4), tealM, t * 1.4, .05, .24, f);
    return f;
  });
  const arms = [-1, 1].map(s => {
    const a = new THREE.Group();
    a.position.set(s * .82, .95, .05);
    body.add(a);
    mesh(new THREE.SphereGeometry(.18, 10, 8), tealM, s * .1, -.15, 0, a).scale.set(.8, 1.3, .8);
    return a;
  });

  // things he can hold in his right hand
  const item = name => { const g = new THREE.Group(); g.name = name; g.visible = false; arms[1].add(g); return g; };
  const rod = item('rod');
  mesh(new THREE.CylinderGeometry(.03, .03, 2.2, 5), mat(0x8a5a3b), 0, .7, .6, rod).rotation.x = .9;
  const can = item('can');
  mesh(new THREE.CylinderGeometry(.18, .2, .35, 10), mat(0x4ea8de), .1, -.35, .2, can);
  const cone = item('icecream');
  mesh(new THREE.ConeGeometry(.1, .3, 8), mat(0xf4a261), .1, -.45, .22, cone).rotation.x = Math.PI;
  mesh(new THREE.SphereGeometry(.12, 10, 8), mat(0xff8fab), .1, -.27, .22, cone);
  mesh(new THREE.SphereGeometry(.1, 10, 8), mat(0xbde0fe), .1, -.12, .22, cone);
  const letter = item('letter');
  mesh(box(.38, .26, .02), mat(0xffffff), .1, -.42, .25, letter);
  mesh(box(.08, .08, .01), mat(0xe63946), .22, -.36, .265, letter);
  const net = item('net');
  mesh(new THREE.CylinderGeometry(.02, .02, 1.3, 5), mat(0x8a5a3b), .1, .2, .45, net).rotation.x = .7;
  const hoop = mesh(new THREE.TorusGeometry(.2, .02, 6, 16), mat(0xffd166), .1, .78, .95, net);
  hoop.rotation.x = .7 + Math.PI / 2;
  const bag = mesh(new THREE.ConeGeometry(.2, .35, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .55, side: THREE.DoubleSide }), .1, .9, 1.1, net);
  bag.rotation.x = .7 + Math.PI;
  const items = { rod, can, icecream: cone, letter, net };

  // a lantern in his left hand for walks after dark
  const lantern = new THREE.Group();
  lantern.position.set(-.12, -.42, .2);
  arms[0].add(lantern);
  mesh(new THREE.TorusGeometry(.08, .015, 6, 12, Math.PI), dark, 0, .12, 0, lantern);
  mesh(box(.18, .03, .18), dark, 0, .06, 0, lantern);
  mesh(box(.18, .03, .18), dark, 0, -.17, 0, lantern);
  mesh(new THREE.SphereGeometry(.08, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffc46b, emissiveIntensity: 1.6 }), 0, -.05, 0, lantern);
  lantern.visible = false;

  return { clo, body, eyes, looks, brows, cheeks, mouth, open, tail, tuft, feet, arms, items, lantern };
}
