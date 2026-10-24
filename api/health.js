// GET /api/health -> which Gemini model names work with your key RIGHT NOW (open it in a browser before the demo).
// Sends one tiny request per configured model. Rate limited to 3 calls a minute per IP. Never returns the key.
const { modelList, clean } = require('./_gemini.js');
const { guard } = require('./_guard.js');
const KEY = clean(process.env.GEMINI_API_KEY);
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!(await guard(req, res, 'health', 3, { page: false }))) return;
  if (!KEY) return res.status(503).json({ ok: false, error: 'GEMINI_API_KEY is not set in this deployment.' });
  const models = [];
  for (const m of modelList()) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ok' }] }], generationConfig: { maxOutputTokens: 16, temperature: 0 } })
      });
      const j = await r.json().catch(() => null), e = j && j.error;
      models.push({ model: m, ok: r.ok, status: r.status, note: r.ok ? '' : String((e && (e.status || e.message)) || '').slice(0, 100) });
    } catch (e) { models.push({ model: m, ok: false, status: 0, note: String((e && e.message) || 'network error').slice(0, 100) }); }
  }
  const first = models.find(x => x.ok);
  res.status(200).json({ ok: !!first, using: first ? first.model : null, firstChoiceWorks: !!(models[0] && models[0].ok), models,
    tip: first && models[0] && !models[0].ok ? 'Your first-choice model failed but a backup works. Update GEMINI_MODEL in Vercel.' : undefined });
};
