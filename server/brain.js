// CloClo's language-model brain: one Claude call per decision.
// Runs on the server only, so the API key never reaches the browser.
import Anthropic from '@anthropic-ai/sdk';
import { ACTIVITY_INFO } from '../src/sim/catalog.js';
import { COLOURS, SIZE, MAX_H } from '../src/sim/blocks.js';

export const MODEL = 'claude-haiku-5-5';
// Claude Haiku 5.5 prices in USD per million tokens (prompts up to 100K tokens).
const PRICE = { input: .10, output: .50, cacheRead: .01, cacheWrite: .125 };

const KEYS = Object.keys(ACTIVITY_INFO);
const MOODS = ['delighted', 'happy', 'calm', 'sleepy', 'grumpy', 'sad'];

const SYSTEM = `You are the mind of CloClo, a small, round, turquoise monster with little yellow horns, a curly tuft of hair and a stubby tail. He lives in Mosdorp, a tiny village. People watch his life live on a website, like a nature documentary about a very small monster. Nobody can talk to him; he simply lives his life. Each time he finishes something, you decide what he does next, and for how long. You are free: there is no right answer and no score to optimise.

Personality: curious, gentle, a little clumsy and easily delighted. He loves his friends: Biscuit the orange village cat, the two ducks on the pond, the baker, and Grandma, who lives far away and writes him letters. He talks like a cheerful young child: short, simple, warm sentences with gentle humour. He is never mean or scary, and never sadder than a small sigh. He never mentions being an AI, a game, a website or viewers.

Mosdorp: a round village with a square and a fountain in the middle. Around it: CloClo's house (with a picket fence and flower boxes), the bakery, the library, the post office, the ice cream stand, the park with a swing, the pond with ducks, the vegetable garden with tomatoes, the flower meadow with butterflies, and the lookout hill with a telescope. Biscuit strolls around the square and naps by the fountain at night.

He has no needs, stats or meters: nothing makes him hungry or tired. What he does is entirely up to you. Let him follow his whims, his plans, his friends, the time of day and what happened earlier, and give his days a shape and a story. Mosdorp is quiet at night and most creatures sleep then, but that is up to him too.

Activities (use the key):
${KEYS.map(k => `- ${k}: ${ACTIVITY_INFO[k]}`).join('\n')}

Reply with JSON:
- diary: one diary sentence (at most 90 characters, first person) about how the activity he just finished went. Use a small, fresh, concrete detail (a snail on the path, a cloud shaped like a croissant) so his diary doesn't repeat itself. Use "" if nothing was finished.
- activity: the key of what he does next. It must be one of the activities that are open right now.
- minutes: how many game minutes he spends on it once he gets there (5 to 600; a night's sleep can be up to 660).
- thought: what he thinks as he sets off (at most 70 characters, first person).
- mood: how he feels as he sets off: delighted, happy, calm, sleepy, grumpy or sad (sad is never more than a small sigh). It shows on his face.
- plan: a short note to himself about what he'd like to do later, or "" (at most 80 characters). You'll see it again next time; you can keep it, change it or drop it.
- musings: three short things he thinks or says while he is doing it (each at most 50 characters). Make them specific to this moment and different from his recent diary, never generic.
Write in English.`;

const SCHEMA = {
  type: 'object',
  properties: {
    diary: { type: 'string' },
    activity: { type: 'string', enum: KEYS },
    minutes: { type: 'integer' },
    mood: { type: 'string', enum: MOODS },
    thought: { type: 'string' },
    plan: { type: 'string' },
    musings: { type: 'array', items: { type: 'string' } }
  },
  required: ['diary', 'activity', 'minutes', 'thought', 'mood', 'plan', 'musings'],
  additionalProperties: false
};

let client = null;
// The brain is on when the server has an API key (ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN).
export function brainAvailable() {
  if (client) return true;
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return false;
  client = new Anthropic({ timeout: 15e3, maxRetries: 1 }); // the browser gives up after 8 s anyway
  return true;
}

// Plain text only, one line, limited length: this text is shown publicly.
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

// His memories of earlier days, oldest first.
function memoryLines(st) {
  const m = (Array.isArray(st.memories) ? st.memories : []).slice(-7);
  if (!m.length) return [];
  return ['What he remembers of earlier days (oldest first):', ...m.map(d => `- Day ${Number(d.day) || '?'}: ${clean(d.text, 300)}`)];
}

// Builds the per-decision message from the simulation's state.
function situation(st) {
  const open = (Array.isArray(st.open) ? st.open : []).filter(k => KEYS.includes(k));
  if (!open.length) throw new Error('no open activities');
  const h = Number(st.hour) || 0;
  const part = h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : h < 21.5 ? 'evening' : 'night';
  const lines = [
    `It is ${clean(st.time, 30)} (${part}).`,
    st.previous && KEYS.includes(st.previous) ? `CloClo just finished: ${st.previous}.` : 'CloClo has just woken up for the first time today.',
    `His plan: ${clean(st.plan, 120) || 'none'}.`,
    st.yard ? `At the block yard: ${st.yard.blocks ? `${st.yard.blocks} blocks, last built: "${clean(st.yard.idea, 60)}"` : 'nothing built yet'}.` : '',
    ...memoryLines(st),
    `Recent activities (newest first): ${(st.last || []).filter(k => KEYS.includes(k)).join(', ') || 'none'}.`,
    'Recent diary (newest first):',
    ...(st.diary || []).slice(0, 8).map(d => `- ${clean(d, 140)}`),
    `Open right now: ${open.join(', ')}.`,
    'What does CloClo do next?'
  ];
  return { text: lines.filter(Boolean).join('\n'), open };
}

// Running totals since the server started, for the log and /api/brain.
export const usage = { calls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0 };

// One call to Claude with a JSON answer; keeps the running totals up to date.
async function ask(text, schema, maxTokens) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens, // room for brief thinking plus the JSON answer
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: text }]
  });
  const u = res.usage;
  const cost = (u.input_tokens * PRICE.input + (u.cache_read_input_tokens || 0) * PRICE.cacheRead +
    (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite + u.output_tokens * PRICE.output) / 1e6;
  usage.calls++;
  usage.input += u.input_tokens;
  usage.cacheRead += u.cache_read_input_tokens || 0;
  usage.cacheWrite += u.cache_creation_input_tokens || 0;
  usage.output += u.output_tokens;
  usage.cost += cost;
  if (res.stop_reason !== 'end_turn') throw new Error('stopped: ' + res.stop_reason);
  const block = res.content.find(b => b.type === 'text');
  return {
    out: JSON.parse(block.text),
    usage: { input: u.input_tokens, cacheRead: u.cache_read_input_tokens || 0, cacheWrite: u.cache_creation_input_tokens || 0, output: u.output_tokens, cost }
  };
}

export async function decide(state) {
  const { text, open } = situation(state);
  const { out, usage: used } = await ask(text, SCHEMA, 1024);
  if (!open.includes(out.activity)) throw new Error('chose a closed activity: ' + out.activity);
  return {
    activity: out.activity,
    thought: clean(out.thought, 100),
    diary: clean(out.diary, 130),
    plan: clean(out.plan, 120),
    musings: (Array.isArray(out.musings) ? out.musings : []).map(m => clean(m, 70)).filter(Boolean).slice(0, 4),
    mood: MOODS.includes(out.mood) ? out.mood : 'happy',
    minutes: Math.max(5, Math.min(out.activity === 'sleep' ? 660 : 600, Math.round(Number(out.minutes) || 30))),
    usage: used
  };
}

// ---- the block yard: what does he build? ----
const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    idea: { type: 'string' },
    thought: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['place', 'remove', 'clear'] },
          x: { type: 'integer' },
          z: { type: 'integer' },
          y: { type: 'integer' },
          color: { type: 'string', enum: COLOURS }
        },
        required: ['action', 'x', 'z', 'y', 'color'],
        additionalProperties: false
      }
    }
  },
  required: ['idea', 'thought', 'steps'],
  additionalProperties: false
};
const MAX_STEPS = 24;

export async function planBuild(st) {
  const text = [
    'CloClo is at the block yard and is about to build. You design what he builds.',
    `The yard is a grid of ${SIZE} by ${SIZE} spots: x goes from 0 to ${SIZE - 1}, left to right as he faces it; z goes from 0 (the front, closest to him) to ${SIZE - 1} (the back). y is the level: 0 is the ground, up to ${MAX_H - 1}.`,
    `Colours: ${COLOURS.join(', ')}.`,
    'What stands there now, per spot, from level 0 up ("_" is an empty level):',
    clean(st.yard, 6000).replace(/ (x\d)/g, '\n$1') || 'The yard is empty.',
    st.idea ? `The last thing he built there: "${clean(st.idea, 80)}".` : 'He has never built anything here.',
    st.crowded ? 'The yard is getting crowded: he should tidy up first (a "clear" step) and then build something new.' : '',
    `His plan: ${clean(st.plan, 120) || 'none'}.`,
    ...memoryLines(st),
    'Recent diary (newest first):',
    ...(st.diary || []).slice(0, 6).map(d => `- ${clean(d, 140)}`),
    '',
    `He can add to what is there, change it, or tidy up and start something new. He likes to start fresh now and then. Use up to ${MAX_STEPS} steps, in the order he does them:`,
    '- "place": a block of that colour at spot x, z. With y = -1 it goes on top of the stack; with a level y it goes exactly there, but only if it rests on a block below it or touches a block beside it at the same level (so bridges, arches and windows are possible).',
    '- "remove": takes a block away: the top one with y = -1, or the one at level y.',
    '- "clear": puts every block back in the crate (x, z, y and color don\'t matter). Use it as the first step to start fresh.',
    'Reply with JSON:',
    '- idea: what he is building, a short phrase like "a tower for Biscuit" or "a bridge for the ducks" (at most 50 characters).',
    '- thought: what he thinks as he starts (at most 70 characters, first person).',
    '- steps: the building steps.'
  ].filter(Boolean).join('\n');
  const { out, usage: used } = await ask(text, BUILD_SCHEMA, 3000);
  const ok = n => Number.isInteger(n) && n >= 0 && n < SIZE;
  const okY = y => Number.isInteger(y) && y >= -1 && y < MAX_H;
  const steps = (out.steps || [])
    .filter(s => s.action === 'clear' || ((s.action === 'place' || s.action === 'remove') && ok(s.x) && ok(s.z) && okY(s.y) && COLOURS.includes(s.color)))
    .slice(0, MAX_STEPS)
    .map(s => (s.action === 'clear' ? { action: 'clear' } : { action: s.action, x: s.x, z: s.z, y: s.y, color: s.color }));
  if (!steps.length) throw new Error('no usable building steps');
  return { idea: clean(out.idea, 60) || 'something', thought: clean(out.thought, 100), steps, usage: used };
}

// ---- long-term memory: his day in a few sentences ----
const SUMMARY_SCHEMA = {
  type: 'object',
  properties: { summary: { type: 'string' } },
  required: ['summary'],
  additionalProperties: false
};

export async function summarizeDay(st) {
  const entries = (Array.isArray(st.entries) ? st.entries : []).slice(-150).map(e => `- ${clean(e, 140)}`);
  if (!entries.length) throw new Error('nothing happened today');
  const text = [
    `It is the end of Day ${Number(st.day) || '?'} and CloClo is going to bed.`,
    ...memoryLines(st),
    st.idea ? `At the block yard stands: "${clean(st.idea, 80)}".` : '',
    'Everything in his diary today (oldest first):',
    ...entries,
    '',
    'Write how he will remember this day: a short summary in his own words (first person, at most 220 characters). Keep what mattered: what he did, how he felt, friends he saw, anything he wants to continue or try tomorrow.',
    'Reply with JSON: summary.'
  ].filter(Boolean).join('\n');
  const { out, usage: used } = await ask(text, SUMMARY_SCHEMA, 1024);
  const summary = clean(out.summary, 260);
  if (!summary) throw new Error('empty summary');
  return { summary, usage: used };
}

export const systemPrompt = SYSTEM;
