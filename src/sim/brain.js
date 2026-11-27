import * as THREE from 'three';
import { world, hour, dayLabel } from '../state.js';
import { pick } from './util.js';
import { LOC, heightAt } from '../world/locations.js';
import { garden } from './garden.js';
import { ACTS } from './acts.js';
import { TRICKS, TRICK_NAMES } from './pip.js';
import { planWalk, cellOf, wayOut, floorsAt } from './walk.js';
import { LEVEL } from './blocks.js';
import { settle, nightly, tidy, messCount, nextPrize } from './tidy.js';
import { yard, applyStep, rulesPlan, tidyPlan, describeYard, blockCount, expandSteps, MAX_BLOCKS, MESS_MAX } from './blocks.js';

// CloClo's brain: choices, moods and walking routes. He has no needs or stats: the language model
// decides freely, and without it simple rules pick something that suits the time of day.
// Modes: 'choosing' → ('thinking' while the language model answers) → 'walking' → 'doing' → 'choosing' …
// Small things he says at fixed moments; picked so that the same line doesn't come twice in a row.
const DECIDING = ['Hmm… what shall I do next?', 'What now, what now…', 'Let me think…', 'Ooh, I have an idea… wait.', 'So many things to do!', 'Where shall I go?'];
const DESIGNING = ['Hmm… what shall I build?', 'Something tall? Something round?', 'I need a good idea…', 'Let me look at my blocks…'];
const FINISHED = ['Ta-da!', 'I made this!', 'Look at it!', 'Not bad at all!', 'My best one yet?', 'Finished!'];
const STUCK = ['I can’t get through!', 'Who put these blocks here? Oh. Me.', 'Hmm. Blocks everywhere.', 'There’s no way past!', 'Oh no, I’m stuck!'];
// The neighbours who thank him for tidying up, and the prizes they give.
const THANKS = [
  'Mrs. Hazel from next door waved: “Thank you for tidying up, dear!”',
  'Old Tom said the village looks lovely and tidy again.',
  'Nora from the blue house clapped when she saw the clean streets.',
  'Mr. Bramble tipped his hat: “Tidy work, young CloClo!”'
];
const PRIZE_LINES = {
  croissant: 'The baker gave me a golden croissant for keeping Mosdorp tidy! It’s too shiny to eat.',
  medal: 'I got a tidy medal! I’m wearing it right now.',
  gold: 'Gold blocks! There are gold blocks in the crate at the block yard now.',
  trophy: 'There’s a trophy at the block yard now, with my name on it!',
  statue: 'They put a golden statue of me on the square! I feel very tall.'
};
const BITES = ['A bite!', 'Ooh, a tug!', 'Something’s pulling!', 'Fish!'];
const CATCHES = ['Caught a fish! I put it back, it looked so sad.', 'A tiny silver fish! I let it swim home.', 'I caught a fish and said sorry, then let it go.', 'A fish with a funny face! Back you go.', 'I caught a fish. We looked at each other. I let it go.'];

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
export function createBrain(body, cat, pip, writeDiary, opts = {}) {
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
    // the floor he stands on (0 = the ground; higher = on top of blocks), and his height in floors while moving
    floor: 0, fy: 0, climbing: false,
    // long-term memory: a short summary of each of his last days, and what happened today so far
    memories: [], today: [], todayActs: []
  };
  clo.position.copy(LOC.home.spot);
  S.face = LOC.home.rot;

  // a random line, but not the one he just said
  const pickNew = (list, avoid = S.thought) => {
    const fresh = list.filter(l => l !== avoid);
    return pick(fresh.length ? fresh : list);
  };

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

  // Boxed in: blocks all around, so he can't even reach the square.
  const SQUARE = new THREE.Vector3(0, 0, 0);
  const isBoxedIn = () => !planWalk(clo.position, S.floor, [SQUARE]).reached;

  function choose() {
    const h = hour();
    S.boxed = isBoxedIn();
    // Boxed in and no model (or the model's own tries didn't get him out): he clears a way out himself
    if (S.boxed && (!opts.decide || !opts.canDecide() || (S.boxedTries || 0) >= 2)) {
      S.escape = true;
      return start('build');
    }
    if (!opts.decide || !opts.canDecide()) return start(ruleChoice(h));
    // ask the language model; meanwhile CloClo stands and ponders
    S.mode = 'thinking';
    S.thought = pickNew(DECIDING);
    Promise.resolve(opts.decide({
      time: dayLabel(world.T), hour: h, plan: S.plan,
      pip: { following: pip.mode === 'follow', tricks: Object.fromEntries(TRICKS.map(t => [t, Math.round(pip.tricks[t])])), news: S.pipNews },
      previous: S.prev, last: S.last, diary: memory, yard: { idea: yard.idea, blocks: blockCount() }, memories: S.memories, stuck: S.stuck,
      boxed: S.boxed, floor: S.floor,
      tidy: { stars: tidy.stars, mess: messCount(), max: MESS_MAX, next: nextPrize(), news: S.tidyNews },
      // boxed in, the only thing he can do is build: take blocks away
      open: S.boxed ? ['build'] : Object.keys(ACTS).filter(k => isOpen(k, h))
    })).catch(() => null).then(out => {
      if (S.mode !== 'thinking') return;
      const now = hour();
      if (S.boxed) start('build', out && out.activity === 'build' ? out.thought : null, out && out.diary, out && out.activity === 'build' ? out : null);
      else if (out && ACTS[out.activity] && isOpen(out.activity, now)) start(out.activity, out.thought, out.diary, out);
      else start(ruleChoice(now));
    });
  }

  // Set off to do `best`. `thought` and `diary` come from the language model, if it answered;
  // so can `llm.minutes` (how long he does it), `llm.mood` (how he feels) and `llm.plan` (a note to himself for later).
  function start(best, thought, diary, llm) {
    S.minutes = llm ? llm.minutes : null;
    S.musings = llm && llm.musings && llm.musings.length ? llm.musings.slice() : null;
    S.musingSet = S.musings ? S.musings.slice() : null;
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
    // his usual route, but around any blocks in the way; if the place is walled off, he walks as
    // close as he can and gets stuck there
    const walk = planWalk(clo.position, S.floor, route(S.here, tgt));
    S.queue = walk.pts;
    S.blockedWay = !walk.reached;
    S.buildHere = false;
    if (best === 'tidy') {
      // tidying starts right where he is: he walks from stack to stack himself
      S.queue = [];
      S.blockedWay = false;
    } else if (best === 'build' && (S.blockedWay || S.escape || S.boxed)) {
      // can't get to the block yard (or must clear a way out): he builds right where he is
      S.queue = [];
      S.blockedWay = false;
      S.buildHere = true;
    }
    S.here = { ang: tgt.ang, pts: tgt.pts };
    if (tgt.cat) cat.meet(tgt.cat, tgt.pts[0]);
    // which trick to practise with Pip: the model's choice, or the first one he doesn't know well yet
    S.trick = best === 'train_pip' ? (llm && TRICKS.includes(llm.trick) ? llm.trick : TRICKS.find(t => pip.tricks[t] < 100) || 'fetch') : null;
    S.pipNews = null;
    S.tidyNews = null;
    S.thought = thought || pick(a.why);
    write(S.thought);
    S.mode = 'walking';
    clo.visible = true;
    S.anchor = null;
  }

  // Blocks are in the way and there is no way around: he stops, says so, and decides again.
  function enterStuck() {
    const a = ACTS[S.act];
    const where = a.loc === 'home' ? 'my house' : a.loc === 'square' ? 'the square' : 'the ' + LOC[a.loc].name.toLowerCase();
    S.mode = 'stuck';
    S.left = 10;
    S.moving = false;
    S.thought = pickNew(STUCK);
    S.wow = true;
    S.tNext = world.T + 1e9;
    write(`Blocks are in my way! I can’t get to ${where}.`);
    S.stuck = { act: S.act, place: LOC[a.loc].name };
    S.stuckCount = (S.stuckCount || 0) + 1;
    if (S.act === 'cat') cat.release();
    S.here = { ang: Math.atan2(clo.position.z, clo.position.x), pts: [clo.position.clone().setY(0)] };
  }

  function arrive() {
    const a = ACTS[S.act];
    S.mode = 'doing';
    S.stuck = null;
    S.stuckCount = 0;
    if (S.buildHere) S.here = { ang: Math.atan2(clo.position.z, clo.position.x), pts: [clo.position.clone().setY(0)] };
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
    if (S.act === 'build' || S.act === 'tidy') startBuild();
    if (S.act === 'sleep' && (h >= 19.5 || h < 6.5)) pip.bedtime();
    if (S.act === 'walk_pip') pip.walkies(180);
    if (S.act === 'train_pip') pip.startTraining(clo.position, S.face, S.trick);
  }

  // ---- long-term memory ----
  // At bedtime (or when a day gets very long) his day is summed up in a few sentences: by the
  // language model in his own words, or by the rules from what he did. He keeps the last 7.
  const MEMORY_DAYS = 7;

  function closeDay() {
    nightly(); // the bar for tidy stars loosens a little each night
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

  // ---- building, anywhere in the village ----
  // He starts at the block yard (his workshop with the crate) and works out what to build: the
  // language model, or the rules. Then he walks to each spot, places, takes or moves a block there,
  // and admires the result for a bit.
  const STEP_MINUTES = 2;

  function startBuild() {
    S.left = 1e9; // until the building is done
    S.build = { steps: null, t: 0, carry: null };
    S.tNext = world.T + 1e9;
    // the fewest blocks to take away to get back to the square, nearest first
    const out = wayOut(clo.position, SQUARE);
    const escapePlan = () => ({
      idea: 'a way out', thought: 'That’s it, I’m getting out of here!',
      steps: out.map(([x, z]) => ({ action: 'clearcol', x, z }))
    });
    if (S.escape) {
      S.escape = false;
      return setBuildPlan(escapePlan());
    }
    if (S.act === 'tidy') return setBuildPlan(tidyPlan(clo.position.x, clo.position.z));
    const useModel = opts.planBuild && opts.canDecide();
    if (!useModel) return setBuildPlan(S.buildHere ? escapePlan() : rulesPlan());
    S.thought = pickNew(DESIGNING);
    const p = clo.position;
    const ask = {
      yard: describeYard(), idea: yard.idea, plan: S.plan, diary: memory, memories: S.memories,
      blocks: blockCount(), crowded: blockCount() > MAX_BLOCKS * .6, here: { x: Math.round(p.x), z: Math.round(p.z) },
      inPlace: S.buildHere, stuck: S.stuck, boxed: S.boxed, wayOut: S.boxed ? out : null, floor: S.floor,
      tidy: { stars: tidy.stars, mess: messCount(), next: nextPrize() }, gold: tidy.prizes.includes('gold'), messMax: MESS_MAX
    };
    Promise.resolve(opts.planBuild(ask)).catch(() => null).then(plan => {
      if (S.mode === 'doing' && S.act === 'build' && S.build && !S.build.steps) setBuildPlan(plan || (S.buildHere ? escapePlan() : rulesPlan()));
    });
  }

  function setBuildPlan(plan) {
    S.build.steps = expandSteps(plan.steps);
    if (plan.idea) yard.idea = plan.idea;
    S.thought = plan.thought || pick(ACTS[S.act].why);
    write(S.thought);
    S.tNext = world.T + 1e9; // his own thought stays up while he builds
  }

  // Move up to `step` metres towards walk point p (its y is the floor there), climbing or dropping
  // smoothly on the way. Returns the distance left over once he gets there, or -1 if not there yet.
  function moveTowards(p, step) {
    tmp.set(p.x - clo.position.x, 0, p.z - clo.position.z);
    const d = tmp.length();
    S.climbing = Math.abs(p.y - S.fy) > .05;
    if (d <= step) {
      clo.position.x = p.x;
      clo.position.z = p.z;
      S.fy = S.floor = p.y;
      return step - d;
    }
    S.fy += (p.y - S.fy) * Math.min(1, step / d);
    clo.position.addScaledVector(tmp, step / d);
    S.face = Math.atan2(tmp.x, tmp.z);
    return -1;
  }

  // walk towards walk point p; true once he is there
  function walkTowards(p, gd) {
    const left = moveTowards(p, 2.4 * gd);
    S.moving = left < 0;
    if (!S.moving) S.climbing = false;
    return !S.moving;
  }

  function stepBuild(gd) {
    const b = S.build;
    if (!b || !b.steps) return;
    // walking to the next spot (around blocks): he stands just beside it, on the side he comes from
    if (b.path) {
      if (b.path.length) { if (walkTowards(b.path[0], gd)) b.path.shift(); return; }
      b.path = null;
      b.t = STEP_MINUTES;
    }
    b.t -= gd;
    if (b.t > 0) return;
    while (b.steps.length) {
      const st = b.steps[0];
      const dx = st.x - clo.position.x, dz = st.z - clo.position.z, d = Math.hypot(dx, dz);
      const placing = st.action === 'place' || st.action === 'put';
      // he can reach a little further to take a block than to put one down neatly
      if (d > (placing ? 1.7 : 2.4) || (placing && d < .6)) {
        if (b.tried === st) { b.steps.shift(); b.tried = null; continue; } // couldn't get there: skip it
        const k = d > .01 ? 1.1 / d : 0;
        const stand = new THREE.Vector3(st.x - dx * k + (d > .01 ? 0 : 1.1), 0, st.z - dz * k);
        b.path = planWalk(clo.position, S.floor, [stand]).pts;
        b.tried = st;
        return;
      }
      b.tried = null;
      // never build on the spot he is standing on
      // never put a block where he is standing (it would bury him)
      const [cx, cz] = cellOf(clo.position);
      const level = st.y >= 0 ? st.y : (yard.cols.get(`${st.x},${st.z}`) || []).length;
      if (placing && cx === st.x && cz === st.z && level >= S.floor && level <= S.floor + 1) { b.steps.shift(); continue; }
      b.steps.shift();
      const v = applyStep(st, b.carry);
      if (v < 0) continue; // a full, empty or forbidden spot: skip it
      if (st.action === 'take') b.carry = v;
      if (st.action === 'put') b.carry = null;
      S.face = Math.atan2(dx, dz);
      b.t = st.action === 'clearcol' ? 1 : STEP_MINUTES; // tidying up goes quicker than building
      return;
    }
    // done: admire it for a moment
    b.steps = null;
    S.build = null;
    S.moving = false;
    S.left = 8;
    S.thought = pickNew(FINISHED);
    // fewer blocks lying around the village? then he earns tidy stars, and the neighbours notice
    const r = settle();
    if (r.earned) {
      write(`${pick(THANKS)} (+${r.earned} tidy star${r.earned > 1 ? 's' : ''}, ${tidy.stars} in all)`);
      for (const p of r.prizes) write(PRIZE_LINES[p.id]);
      S.thought = r.prizes.length ? 'A prize! For me?!' : `${r.earned} tidy star${r.earned > 1 ? 's' : ''}! ★`;
      S.mood = 'delighted';
      S.tidyNews = `He just earned ${r.earned} tidy star${r.earned > 1 ? 's' : ''} for tidying up${r.prizes.length ? ', and got ' + r.prizes.map(p => p.name).join(' and ') : ''}.`;
    }
    S.tNext = world.T + 4;
    // he is somewhere in the village now: start the next walk from here
    S.here = { ang: Math.atan2(clo.position.z, clo.position.x), pts: [clo.position.clone().setY(0)] };
    // still boxed in after building? count it: after two tries he gets himself out
    if (isBoxedIn()) S.boxedTries = (S.boxedTries || 0) + 1;
    else {
      if (S.boxed) write('I’m out! Free as a bird.');
      S.boxed = false;
      S.boxedTries = 0;
    }
  }

  function finish() {
    S.prev = S.act;
    S.build = null;
    S.moving = false;
    if (S.act === 'cat') cat.release();
    if (S.act === 'train_pip') {
      const r = pip.endTraining();
      if (r && r.tries) {
        const name = TRICK_NAMES[r.trick];
        write(`Pip and I practised “${name}”: ${r.oks} of ${r.tries} tries went well.`);
        if (r.after >= 100 && !S.learned?.includes(r.trick)) {
          S.learned = [...(S.learned || []), r.trick];
          write(`Pip can ${name} now! Best puppy ever.`);
        }
        S.pipNews = `In the last training Pip practised "${name}": ${r.oks} of ${r.tries} tries went well (now ${Math.round(r.after)}/100).`;
      }
    }
    clo.item = null;
    clo.visible = true;
    S.anchor = null;
    if (S.act === 'swing') { clo.position.copy(LOC.park.spot); S.floor = S.fy = 0; }
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
        const left = moveTowards(S.queue[0], step);
        if (left < 0) break;
        S.queue.shift();
        step = left;
      }
      if (!S.queue.length) { S.climbing = false; if (S.blockedWay) enterStuck(); else arrive(); }
    } else if (S.mode === 'stuck') {
      S.left -= gd;
      if (S.left <= 0) { S.prev = null; S.mode = 'choosing'; }
    } else if (S.mode === 'doing') {
      const a = ACTS[S.act];
      S.left -= gd;
      if (S.act === 'gardening') garden.growth = Math.min(1.6, garden.growth + gd * .004);
      if (S.act === 'build' || S.act === 'tidy') stepBuild(gd);
      if (S.act === 'fish' && Math.random() < gd * .012) {
        S.thought = pickNew(BITES);
        S.wow = true;
        write(pickNew(CATCHES, S.lastCatch));
        S.lastCatch = memory[0];
        S.tNext = world.T + 6;
      } else if (world.T > S.tNext) {
        // his own musings from the language model first; once they're all said, he repeats one now and
        // then (never the same twice in a row) and talks less; without the model, the activity's lines
        const fresh = S.musings && S.musings.length;
        S.thought = fresh ? S.musings.shift() : pickNew(S.musingSet || a.mid);
        // asleep, time runs fast (see simulation.js), so he mumbles much less often
        const gap = S.act === 'sleep' ? 70 + Math.random() * 50 : fresh || !S.musingSet ? 14 + Math.random() * 12 : 30 + Math.random() * 25;
        S.tNext = world.T + gap;
      }
      if (S.left <= 0) finish();
    }
    if (!(S.mode === 'doing' && S.act === 'swing')) {
      // standing still: if what he stands on is gone, he drops down (or climbs out of a buried spot)
      if (S.mode !== 'walking' && !S.moving) {
        const [cx, cz] = cellOf(clo.position), fl = floorsAt(cx, cz);
        if (!fl.includes(S.floor)) {
          const below = fl.filter(f => f <= S.floor);
          S.floor = below.length ? below[below.length - 1] : fl[0];
        }
        S.fy += (S.floor - S.fy) * Math.min(1, gd * 4);
      }
      clo.position.y = heightAt(clo.position.x, clo.position.z) + S.fy * LEVEL;
    }
  }

  return { S, memory, update, closeDay, isSwinging: () => S.mode === 'doing' && S.act === 'swing' };
}
