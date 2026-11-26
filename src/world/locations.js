import * as THREE from 'three';

// All locations in Mosdorp.
//   b:        building dimensions (for locations with a house-shaped building)
//   off:      how far in front of the location's centre CloClo stands (towards the square)
//   labelH:   height of the name sign
//   clear:    radius kept free of trees
//   roadStop: how much shorter the road is than the distance to CloClo's spot
export const LOC = {
  home: { name: 'CloClo’s house', x: -14, z: -8, b: { w: 5, d: 4.5, h: 3.6, wall: 0xffd6a5, roof: 0xe76f51 } },
  bakery: { name: 'Bakery', x: 14, z: -8, b: { w: 5.5, d: 4.5, h: 3.4, wall: 0xfff1c1, roof: 0x9b5de5 } },
  library: { name: 'Library', x: 14, z: 10, b: { w: 6.5, d: 5, h: 4.6, wall: 0xcde7f0, roof: 0x277da1 } },
  post: { name: 'Post office', x: 11, z: -21, b: { w: 4.6, d: 4, h: 3.2, wall: 0xffe8a3, roof: 0xd62828 } },
  park: { name: 'Park', x: -14, z: 10, off: 0, labelH: 4.8, clear: 5.5 },
  pond: { name: 'Pond', x: 0, z: -20, off: 4.9, labelH: 2.2 },
  garden: { name: 'Vegetable garden', x: 0, z: 20, off: 3.8, labelH: 2.2 },
  icecream: { name: 'Ice cream stand', x: 21, z: 1, off: 2.4, labelH: 5.6, clear: 5 },
  hill: { name: 'Lookout hill', x: -26, z: 1, off: 0, labelH: 6.4, clear: 9, roadStop: 6.6 },
  meadow: { name: 'Flower meadow', x: -9, z: 23, off: 2.6, labelH: 2.6, clear: 5.5 }
};

// The lookout hill: a smooth bump CloClo can walk up.
export const HILL = { r: 7, h: 2.6 };
export function heightAt(x, z) {
  const d = Math.hypot(x - LOC.hill.x, z - LOC.hill.z);
  return d < HILL.r ? HILL.h * (Math.cos(Math.PI * d / HILL.r) + 1) / 2 : 0;
}

// dir: direction towards the square; rot: rotation facing the square; spot: where CloClo stands; ang: angle around the square.
for (const k in LOC) {
  const L = LOC[k];
  const len = Math.hypot(L.x, L.z);
  L.dir = new THREE.Vector3(-L.x / len, 0, -L.z / len);
  L.rot = Math.atan2(L.dir.x, L.dir.z);
  if (L.b) {
    L.off = L.b.d / 2 + 1.3;
    L.labelH = L.b.h + 3.4;
  }
  L.spot = new THREE.Vector3(L.x, 0, L.z).addScaledVector(L.dir, L.off);
  L.ang = Math.atan2(L.spot.z, L.spot.x);
  L.clear = L.clear || 6.5;
  L.roadStop = L.roadStop || 0;
}

LOC.square = { name: 'Square', x: 0, z: 0 };
