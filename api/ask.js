// POST /api/ask { question, results } -> { answer, ai:true }
const MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim().replace(/^["']|["']$/g, '');
const KEY = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const why = e => String((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown').slice(0, 120);
const gerr = j => { const e = j && j.error; return e ? ': ' + String(e.status || '') + ' ' + String(e.message || '').slice(0, 140) : ''; };
const S = require('./_safety');
const fail = (res, s, code, error) => res.status(s).json({ error, code });
module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST only');
  const { question, results } = req.body || {};
  if (typeof question !== 'string' || !question.trim() || question.length > 700) return fail(res, 400, 'BAD_QUESTION', 'Question must be 1-700 characters.');
  if (results != null && (typeof results !== 'string' || results.length > 8000)) return fail(res, 400, 'BAD_CONTEXT', 'Records context is invalid or too long.');
  if (S.urgent(question)) return res.status(200).json({ answer: S.esc(S.pick(question)), ai: false, urgent: true }); // deterministic escalation, no AI call
  if (!KEY) return fail(res, 503, 'NO_KEY', 'AI backend is not configured (GEMINI_API_KEY missing).');
  let j;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', signal: AbortSignal.timeout(50000), headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are Medoryx, a health literacy assistant. Explain in simple, calm language. Never diagnose, prescribe, or tell the user to start, stop or change a medicine. Never say the user is healthy or safe because a value is in range; a doctor must interpret results with symptoms and history. If the records do not contain the answer, say you do not know. Under 120 words. For emergencies say to dial 112. The user's records (may contain errors):\n" + String(results || '').slice(0, 8000) }] },
        contents: [{ role: 'user', parts: [{ text: question.trim() }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 }
      })
    });
    j = await r.json().catch(() => null);
    if (!r.ok || !j) return fail(res, 502, 'UPSTREAM', `AI service error (${r.status}${gerr(j)}).`);
  } catch (e) { console.error('Gemini request failed:', why(e)); return fail(res, 502, 'NETWORK', 'Could not reach the AI service (' + why(e) + ').'); }
  if (j.promptFeedback && j.promptFeedback.blockReason) return fail(res, 422, 'BLOCKED', 'The AI service declined this question.');
  let answer = (((j.candidates || [])[0] || {}).content || {}).parts;
  answer = (answer || []).map(p => p.text || '').join('').trim();
  if (!answer) return fail(res, 502, 'EMPTY', 'The AI service returned no answer.');
  if (S.unsafe(answer)) answer = S.safe(S.pick(question));
  res.status(200).json({ answer, ai: true });
};
