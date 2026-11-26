// CloClo's language-model brain: one Claude call per decision.
// Runs on the server only, so the API key never reaches the browser.
import Anthropic from '@anthropic-ai/sdk';
import { ACTIVITY_INFO } from '../src/sim/catalog.js';

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
Write in English.`;

const SCHEMA = {
  type: 'object',
  properties: {
    diary: { type: 'string' },
    activity: { type: 'string', enum: KEYS },
    minutes: { type: 'integer' },
    mood: { type: 'string', enum: MOODS },
    thought: { type: 'string' },
    plan: { type: 'string' }
  },
  required: ['diary', 'activity', 'minutes', 'thought', 'mood', 'plan'],
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

// Builds the per-decision message from the state the browser sends.
function situation(st) {
  const open = (Array.isArray(st.open) ? st.open : []).filter(k => KEYS.includes(k));
  if (!open.length) throw new Error('no open activities');
  const h = Number(st.hour) || 0;
  const part = h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : h < 21.5 ? 'evening' : 'night';
  const lines = [
    `It is ${clean(st.time, 30)} (${part}).`,
    st.previous && KEYS.includes(st.previous) ? `CloClo just finished: ${st.previous}.` : 'CloClo has just woken up for the first time today.',
    `His plan: ${clean(st.plan, 120) || 'none'}.`,
    `Recent activities (newest first): ${(st.last || []).filter(k => KEYS.includes(k)).join(', ') || 'none'}.`,
    'Recent diary (newest first):',
    ...(st.diary || []).slice(0, 8).map(d => `- ${clean(d, 140)}`),
    `Open right now: ${open.join(', ')}.`,
    'What does CloClo do next?'
  ];
  return { text: lines.join('\n'), open };
}

// Running totals since the server started, for the log and /api/brain.
export const usage = { calls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0 };

export async function decide(state) {
  const { text, open } = situation(state);
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024, // room for brief thinking plus the short JSON answer
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
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
  const out = JSON.parse(block.text);
  if (!open.includes(out.activity)) throw new Error('chose a closed activity: ' + out.activity);
  return {
    activity: out.activity,
    thought: clean(out.thought, 100),
    diary: clean(out.diary, 130),
    plan: clean(out.plan, 120),
    mood: MOODS.includes(out.mood) ? out.mood : 'happy',
    minutes: Math.max(5, Math.min(out.activity === 'sleep' ? 660 : 600, Math.round(Number(out.minutes) || 30))),
    usage: { input: u.input_tokens, cacheRead: u.cache_read_input_tokens || 0, cacheWrite: u.cache_creation_input_tokens || 0, output: u.output_tokens, cost }
  };
}

export const systemPrompt = SYSTEM;
