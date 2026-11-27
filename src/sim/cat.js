import * as THREE from 'three';

// Biscuit, the village cat: where she is and what she does. (She is drawn by world/cat.js.)
// She strolls around the square, naps by the fountain at night, and comes over when CloClo wants to play.
const RING = 4.4;
const ringPt = a => new THREE.Vector3(Math.cos(a) * RING, 0, Math.sin(a) * RING);

export function createCat() {
  const cat = {
    pos: new THREE.Vector3(4, 0, 3), face: 0,
    meetAt: null, lookAt: null, walking: false, sleeping: false
  };
  let queue = [], idle = 0;
  const tmp = new THREE.Vector3();

  // Walk via the ring around the fountain, like CloClo does.
  function path(to) {
    const p = cat.pos, a1 = Math.atan2(p.z, p.x), a2 = Math.atan2(to.z, to.x);
    const d = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
    const q = [];
    if (Math.abs(d) > .6) {
      q.push(ringPt(a1));
      const n = Math.ceil(Math.abs(d) / .35);
      for (let i = 1; i <= n; i++) q.push(ringPt(a1 + d * i / n));
    }
    q.push(to.clone());
    return q;
  }

  // CloClo calls Biscuit to a spot on the square; she looks at `lookAt` once there.
  cat.meet = (point, lookAt) => {
    cat.meetAt = point.clone();
    cat.lookAt = lookAt.clone();
    queue = path(point);
  };
  cat.release = () => {
    cat.meetAt = cat.lookAt = null;
    queue = [];
    idle = 5;
  };

  cat.update = (gd, isNight) => {
    if (!cat.meetAt && !queue.length) {
      idle -= gd;
      if (idle < 0) {
        const a = Math.atan2(cat.pos.z, cat.pos.x);
        if (isNight) {
          queue = path(new THREE.Vector3(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4));
          idle = 60;
        } else {
          const b = a + (Math.random() - .5) * 2.4, r = 2.6 + Math.random() * 3.6;
          queue = path(new THREE.Vector3(Math.cos(b) * r, 0, Math.sin(b) * r));
          idle = 8 + Math.random() * 25;
        }
      }
    }
    let step = 3 * gd;
    cat.walking = queue.length > 0;
    while (step > 0 && queue.length) {
      tmp.subVectors(queue[0], cat.pos);
      tmp.y = 0;
      const d = tmp.length();
      if (d <= step) { cat.pos.copy(queue[0]); queue.shift(); step -= d; }
      else { cat.pos.addScaledVector(tmp, step / d); cat.face = Math.atan2(tmp.x, tmp.z); step = 0; }
    }
    if (!cat.walking && cat.lookAt) cat.face = Math.atan2(cat.lookAt.x - cat.pos.x, cat.lookAt.z - cat.pos.z);
    cat.sleeping = isNight && !cat.walking && !cat.meetAt;
  };

  return cat;
}
