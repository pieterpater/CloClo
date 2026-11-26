import { world } from './state.js';

// Where the world comes from:
//   remote: the server runs the one CloClo everyone sees, and streams it (server/sim.js)
//   local:  no server (for example static hosting): the same simulation runs in this browser
// Both give a `view(rd)` each frame, shaped like the simulation's snapshot().

const DELAY = 350; // ms: draw slightly in the past, so there are always two snapshots to move between

export function connect(onDiary) {
  return new Promise(resolve => {
    if (!window.EventSource) return resolve(localSource(onDiary));
    const es = new EventSource('./api/stream');
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      es.close();
      resolve(localSource(onDiary));
    };
    const timer = setTimeout(fail, 4000);
    es.addEventListener('hello', e => {
      if (settled) return; // a reconnect: the welcome is only needed once
      settled = true;
      clearTimeout(timer);
      resolve(remoteSource(es, JSON.parse(e.data), onDiary));
    });
    es.onerror = () => { if (!settled) fail(); };
  });
}

function remoteSource(es, hello, onDiary) {
  const buf = [hello.snapshot];
  let offset = hello.snapshot.t - Date.now(), connected = true;
  hello.diary.slice().reverse().forEach(onDiary);

  es.onmessage = e => {
    const s = JSON.parse(e.data);
    connected = true;
    // smoothed estimate of the server clock, so network jitter doesn't make him stutter
    offset += (s.t - Date.now() - offset) * .1;
    buf.push(s);
    if (buf.length > 30) buf.shift();
  };
  es.addEventListener('diary', e => onDiary(JSON.parse(e.data)));
  es.onerror = () => { connected = false; }; // EventSource reconnects by itself

  const lerp = (a, b, k) => a + (b - a) * k;

  return {
    remote: true,
    brain: hello.brain,
    get connected() { return connected; },
    view() {
      const at = Date.now() + offset - DELAY;
      let i = buf.length - 1;
      while (i > 0 && buf[i].t > at) i--;
      const a = buf[i], b = buf[i + 1];
      if (!b) {
        // no newer snapshot yet: let the clock run on, keep everything else where it is
        return { ...a, T: a.T + Math.max(0, at - a.t) / 1000 * a.speed };
      }
      const k = Math.min(1, Math.max(0, (at - a.t) / (b.t - a.t)));
      const jump = Math.hypot(b.clo.x - a.clo.x, b.clo.z - a.clo.z) > 3; // e.g. hopping off the swing
      return {
        ...a,
        T: lerp(a.T, b.T, k),
        clo: { ...a.clo, x: jump ? b.clo.x : lerp(a.clo.x, b.clo.x, k), y: jump ? b.clo.y : lerp(a.clo.y, b.clo.y, k), z: jump ? b.clo.z : lerp(a.clo.z, b.clo.z, k) },
        cat: { ...a.cat, x: lerp(a.cat.x, b.cat.x, k), z: lerp(a.cat.z, b.cat.z, k) }
      };
    }
  };
}

async function localSource(onDiary) {
  const { createSimulation } = await import('./sim/simulation.js');
  const sim = createSimulation({ onDiary });
  sim.write('Good morning, Mosdorp! What shall I do today?');
  return {
    remote: false,
    brain: null,
    connected: true,
    view(rd) {
      sim.tick(rd * world.speed);
      return sim.snapshot();
    }
  };
}
