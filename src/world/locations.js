import * as THREE from 'three';

// Alle plekken in Mosdorp. `b` = gebouwmaten.
export const LOC = {
  huis: { name: 'CloClo’s huis', x: -14, z: -8, b: { w: 5, d: 4.5, h: 3.6, wall: 0xffd6a5, roof: 0xe76f51 } },
  bakkerij: { name: 'Bakkerij', x: 14, z: -8, b: { w: 5.5, d: 4.5, h: 3.4, wall: 0xfff1c1, roof: 0x9b5de5 } },
  bieb: { name: 'Bibliotheek', x: 14, z: 10, b: { w: 6.5, d: 5, h: 4.6, wall: 0xcde7f0, roof: 0x277da1 } },
  park: { name: 'Park', x: -14, z: 10 },
  vijver: { name: 'Vijver', x: 0, z: -20 },
  tuin: { name: 'Moestuin', x: 0, z: 20 }
};

// dir: richting naar het plein; rot: draaiing richting plein; spot: waar CloClo staat; ang: hoek rond het plein.
for (const k in LOC) {
  const L = LOC[k];
  const len = Math.hypot(L.x, L.z);
  L.dir = new THREE.Vector3(-L.x / len, 0, -L.z / len);
  L.rot = Math.atan2(L.dir.x, L.dir.z);
  const off = L.b ? L.b.d / 2 + 1.3 : k === 'vijver' ? 4.9 : k === 'tuin' ? 3.8 : 0;
  L.spot = new THREE.Vector3(L.x, 0, L.z).addScaledVector(L.dir, off);
  L.ang = Math.atan2(L.spot.z, L.spot.x);
}

LOC.plein = { name: 'Plein', x: 0, z: 0 };
