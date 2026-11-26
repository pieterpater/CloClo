import * as THREE from 'three';
import { world, hour, dayLabel } from '../state.js';
import { pick } from './util.js';
import { LOC, heightAt } from '../world/locations.js';
import { garden } from './garden.js';
import { ACTS } from './acts.js';
import { yard, applyStep, rulesPlan, describeYard, blockCount } from './blocks.js';

// CloClo's brain: choices, moods and walking routes. He has no needs or stats: the language model
// decides freely, and without it simple rules pick something that suits the time of day.
// Modes: 'choosing' → ('thinking' while the language model answers) → 'walking' → 'doing' → 'choosing' …
// Sometimes a letter from Grandma is waiting when he wakes up.
const GRANDMA = [
  'A letter from Grandma on the doormat! She says hi to the ducks.',
  'Grandma wrote back! She sent a pressed flower and a sticker.',
  'Grandma’s letter says she is knitting me a scarf. Yellow, my favourite!'
];

// body: where CloClo is ({ position, visible, item }); cat: Biscuit (sim/cat.js)
// writeDiary(text): adds a line to his diary
// opts.canDecide() / opts.decide(state): an optional language-model brain (see server/sim.js).
//   decide resolves to { activity, thought, diary, minutes, mood, plan }, or null to let the rules decide.
// opts.planBuild(state): asks the language model what to build at the block yard → { idea, thought, steps } or null.
// opts.summarize(state): asks the language model for a summary of his day → { summary } or null.
export function createBrain(body, cat, writeDiary, opts = {}) {
  const clo = body;
  // the latest diary lines, newest first, to give the language model some memory
  const memory = [];
  const write = txt => {
    writeDiary(txt);
    memory.unshift(txt);
    memory.length = Math.min(memory.length, 8);
    S.today.push(txt);
  };
  const dayNumber = () => Math.floor(world.T / 1440) + 1;
  const S = {
    mode: 'choosing', act: null, left: 0, queue: [],
    here: { ang: LOC.home.ang, pts: [LOC.home.spot.clone()] },
    last: [], face: 0, thought: 'Good morning!', tNext: 0, anchor: null, hop: false, wow: false, prev: null,
    minutes: null, plan: '', mood: 'happy',
    // long-term memory: a short summary of each of his last days, and what happened today so far
    memories: [], today: [], todayActs: []
  };
  clo.position.copy(LOC.home.spot);
  S.face = LOC.home.rot;

  // Routes run via a ring around the square.
  const RING = 4.4, ring = a => new THREE.Vector3(Math.cos(a) * RING, 0, Math.sin(a) * RING);

  function targetFor(a) {
    const L = LOC[a.loc];
    if (a.loc === 'square') {
      const ang = Math.random() * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(ang) * 3, 0, Math.sin(ang) * 3);
      if (a === ACTS.cat) {
        // Biscuit comes to sit right next to him
        const c = new THREE.Vector3(Math.cos(ang + .36) * 3, 0, Math.sin(ang + .36) * 3);
        return { ang, pts: [p], face: Math.atan2(c.x - p.x, c.z - p.z), L, cat: c };
      }
      return { ang, pts: [p], face: Math.atan2(-p.x, -p.z), L };
    }
    return { ang: L.ang, pts: [L.spot.clone()], face: L.rot + Math.PI, L };
  }

  function route(from, to) {
    const q = [...from.pts].reverse().slice(1);
    q.push(ring(from.ang));
    let d = to.ang - from.ang;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const n = Math.ceil(Math.abs(d) / .35);
    for (let i = 1; i <= n; i++) q.push(ring(from.ang + d * i / n));
    q.push(...to.pts);
    return q;
  }

  // The simple rules: score every activity on the hour, plus some chance, and avoid repeats.
  function ruleChoice(h) {
    let best = null, bs = -Infinity;
    for (const k in ACTS) {
      let s = ACTS[k].score(h) + Math.random() * 40;
      const recent = S.last.indexOf(k);
      if (recent >= 0) s *= [.3, .5, .7, .85][recent];
      if (s > bs) { bs = s; best = k; }
    }
    return best;
  }

  const isOpen = (k, h) => ACTS[k].score(h) > -500;

  function choose() {
    const h = hour();
    if (!opts.decide || !opts.canDecide()) return start(ruleChoice(h));
    // ask the language model; meanwhile CloClo stands and ponders
    S.mode = 'thinking';
    S.thought = 'Hmm… what shall I do next?';
    Promise.resolve(opts.decide({
      time: dayLabel(world.T), hour: h, plan: S.plan,
      previous: S.prev, last: S.last, diary: memory, yard: { idea: yard.idea, blocks: blockCount() }, memories: S.memories,
      open: Object.keys(ACTS).filter(k => isOpen(k, h))
    })).catch(() => null).then(out => {
      if (S.mode !== 'thinking') return;
      const now = hour();
      if (out && ACTS[out.activity] && isOpen(out.activity, now)) start(out.activity, out.thought, out.diary, out);
      else start(ruleChoice(now));
    });
  }

  // Set off to do `best`. `thought` and `diary` come from the language model, if it answered;
  // so can `llm.minutes` (how long he does it), `llm.mood` (how he feels) and `llm.plan` (a note to himself for later).
  function start(best, thought, diary, llm) {
    S.minutes = llm ? llm.minutes : null;
    // a nap in the daytime stays a nap
    const h = hour();
    if (best === 'sleep' && !(h >= 19.5 || h < 6.5)) S.minutes = Math.min(S.minutes || 60, 90);
    S.mood = (llm && llm.mood) || ACTS[best].mood;
    if (llm) S.plan = llm.plan || '';
    // a diary line about what he just finished
    const prev = S.prev && ACTS[S.prev];
    if (diary) write(diary);
    else if (prev && Math.random() < .75) write(pick(prev.end));
    if (S.prev === 'sleep' && Math.random() < .3) write(pick(GRANDMA));
    S.prev = null;

    const a = ACTS[best];
    S.act = best;
    S.todayActs.push(best);
    S.last = [best, ...S.last].slice(0, 4);
    const tgt = targetFor(a);
    S.tgt = tgt;
    S.queue = route(S.here, tgt);
    S.here = { ang: tgt.ang, pts: tgt.pts };
    if (tgt.cat) cat.meet(tgt.cat, tgt.pts[0]);
    S.thought = thought || pick(a.why);
    write(S.thought);
    S.mode = 'walking';
    clo.visible = true;
    S.anchor = null;
  }

  function arrive() {
    const a = ACTS[S.act];
    S.mode = 'doing';
    S.left = S.minutes || a.dur(hour());
    S.face = S.tgt.face;
    S.tNext = world.T + 8;
    if (a.inside) {
      clo.visible = false;
      const L = LOC[a.loc];
      S.anchor = new THREE.Vector3(L.x, L.b.h + 3.2, L.z);
    } else S.hop = true;
    clo.item = a.item || null;
    // going to bed for the night: time to remember the day
    const h = hour();
    if (S.act === 'sleep' && (h >= 19.5 || h < 6.5)) closeDay();
    if (S.act === 'build') startBuild();
  }

  // ---- long-term memory ----
  // At bedtime (or when a day gets very long) his day is summed up in a few sentences: by the
  // language model in his own words, or by the rules from what he did. He keeps the last 7.
  const MEMORY_DAYS = 7;

  function closeDay() {
    // the day that is ending: after midnight it's still yesterday's evening
    const day = hour() < 6.5 ? dayNumber() - 1 : dayNumber();
    const lastDay = S.memories.length ? S.memories[S.memories.length - 1].day : 0;
    if (day <= lastDay || !S.today.length) {
      // already remembered (a second bedtime in one evening): this goes into tomorrow's memory
      S.today = S.today.slice(-150);
      return;
    }
    const entries = S.today.slice(), acts = S.todayActs.slice();
    S.today = [];
    S.todayActs = [];
    const remember = text => {
      S.memories.push({ day, text });
      if (S.memories.length > MEMORY_DAYS) S.memories.shift();
      write('My day: ' + text);
    };
    if (!opts.summarize || !opts.canDecide()) return remember(rulesSummary(acts));
    Promise.resolve(opts.summarize({ day, entries, memories: S.memories, idea: yard.idea }))
      .catch(() => null)
      .then(out => remember((out && out.summary) || rulesSummary(acts)));
  }

  function rulesSummary(acts) {
    const done = [...new Set(acts.filter(k => k !== 'sleep'))].map(k => k === 'build' && yard.idea ? 'built ' + yard.idea : ACTS[k].did);
    if (!done.length) return 'A quiet day.';
    const list = done.length > 1 ? done.slice(0, -1).join(', ') + ' and ' + done[done.length - 1] : done[0];
    return 'I ' + list + '.';
  }

  // ---- building at the block yard ----
  // On arrival he works out what to build (the language model, or the rules), then places one block
  // every few game minutes, and admires the result for a bit.
  const STEP_MINUTES = 3;

  function startBuild() {
    S.left = 1e9; // until the building is done
    S.build = { steps: null, t: 0 };
    S.tNext = world.T + 1e9;
    const useModel = opts.planBuild && opts.canDecide();
    if (!useModel) return setBuildPlan(rulesPlan());
    S.thought = 'Hmm… what shall I build?';
    const ask = { yard: describeYard(), idea: yard.idea, plan: S.plan, diary: memory, memories: S.memories };
    Promise.resolve(opts.planBuild(ask)).catch(() => null).then(plan => {
      if (S.mode === 'doing' && S.act === 'build' && S.build && !S.build.steps) setBuildPlan(plan || rulesPlan());
    });
  }

  function setBuildPlan(plan) {
    S.build.steps = plan.steps.slice();
    yard.idea = plan.idea;
    S.thought = plan.thought || pick(ACTS.build.why);
    write(S.thought);
    S.tNext = world.T + 1e9; // his own thought stays up while he builds
  }

  // where spot (x, z) of the grid is in the world
  function spotPos(x, z) {
    const L = LOC.blocks, lx = -2.25 + x * .9, lz = 2.25 - z * .9;
    return { x: L.x + lx * Math.cos(L.rot) + lz * Math.sin(L.rot), z: L.z - lx * Math.sin(L.rot) + lz * Math.cos(L.rot) };
  }

  function stepBuild(gd) {
    const b = S.build;
    if (!b || !b.steps) return;
    b.t -= gd;
    if (b.t > 0) return;
    while (b.steps.length) {
      const st = b.steps.shift();
      if (!applyStep(st)) continue; // a full or empty spot: skip it
      const p = spotPos(st.x, st.z);
      S.face = Math.atan2(p.x - clo.position.x, p.z - clo.position.z);
      S.placed = (S.placed || 0) + 1; // viewers see a new block appear
      b.t = STEP_MINUTES;
      return;
    }
    // done: admire it for a moment
    b.steps = null;
    S.build = null;
    S.left = 8;
    S.thought = pick(['Ta-da!', 'I made this!', 'Look at it!']);
    S.face = S.tgt.face;
    S.tNext = world.T + 4;
  }

  function finish() {
    S.prev = S.act;
    S.build = null;
    if (S.act === 'cat') cat.release();
    clo.item = null;
    clo.visible = true;
    S.anchor = null;
    if (S.act === 'swing') clo.position.copy(LOC.park.spot);
    S.mode = 'choosing';
  }

  const tmp = new THREE.Vector3();

  // gd = game minutes elapsed this frame
  function update(gd) {
    if (S.today.length > 150 && S.mode === 'choosing') closeDay();
    if (S.mode === 'choosing') choose();
    else if (S.mode === 'walking') {
      let step = 2.4 * gd;
      while (step > 0 && S.queue.length) {
        const p = S.queue[0];
        tmp.subVectors(p, clo.position);
        tmp.y = 0;
        const d = tmp.length();
        if (d <= step) { clo.position.copy(p); S.queue.shift(); step -= d; }
        else { clo.position.addScaledVector(tmp, step / d); S.face = Math.atan2(tmp.x, tmp.z); step = 0; }
      }
      if (!S.queue.length) arrive();
    } else if (S.mode === 'doing') {
      const a = ACTS[S.act];
      S.left -= gd;
      if (S.act === 'gardening') garden.growth = Math.min(1.6, garden.growth + gd * .004);
      if (S.act === 'build') stepBuild(gd);
      if (S.act === 'fish' && Math.random() < gd * .012) {
        S.thought = 'A bite!';
        S.wow = true;
        write('Caught a fish! I put it back, it looked so sad.');
        S.tNext = world.T + 6;
      } else if (world.T > S.tNext) {
        S.thought = pick(a.mid);
        S.tNext = world.T + 14 + Math.random() * 12;
      }
      if (S.left <= 0) finish();
    }
    if (!(S.mode === 'doing' && S.act === 'swing')) clo.position.y = heightAt(clo.position.x, clo.position.z);
  }

  return { S, memory, update, closeDay, isSwinging: () => S.mode === 'doing' && S.act === 'swing' };
}
