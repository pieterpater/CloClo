// Talks to CloClo's language-model brain on the server (server/api.js).
// Everything here fails quietly: when the brain can't answer, CloClo decides with his own rules.

export const llm = { enabled: false, model: null };

let lastAsk = -1e9, failures = 0, backoffUntil = 0;

// Ask the server once whether a language model is available.
export async function detectLLM() {
  try {
    const res = await fetch('./api/brain', { cache: 'no-store' });
    if (!res.ok) return llm;
    const info = await res.json();
    llm.enabled = !!info.enabled;
    llm.model = info.model || null;
  } catch {
    // static hosting without the server: rules only
  }
  return llm;
}

// Whether to ask the model for this decision. Not at 20× speed (decisions would come every
// couple of seconds), not more than once every 8 seconds, and not right after errors.
export function shouldAsk(speed) {
  const now = performance.now();
  return llm.enabled && speed <= 5 && now - lastAsk > 8000 && now > backoffUntil;
}

export async function askLLM(state) {
  lastAsk = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('./api/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const out = await res.json();
    failures = 0;
    return out;
  } catch (e) {
    failures++;
    // wait longer after each failure: 30 s, 60 s, … up to 10 minutes
    backoffUntil = performance.now() + Math.min(600e3, 30e3 * failures);
    console.warn('CloClo’s language-model brain did not answer, using his rules:', e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
