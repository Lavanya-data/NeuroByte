// POST /api/translate { lang, texts: [..] } -> { t: [..] }  (same order, same length)
const KEY = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const { gfetch } = require('./_gemini.js');
const { guard } = require('./_guard.js');
const why = e => String((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown').slice(0, 120);
const gerr = j => { const e = j && j.error; return e ? ': ' + String(e.status || '') + ' ' + String(e.message || '').slice(0, 140) : ''; };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!(await guard(req, res, 'translate', 30))) return;
  const { lang, texts } = req.body || {};
  if (!['Hindi', 'Telugu'].includes(lang) || !Array.isArray(texts) || !texts.length || texts.length > 60 || texts.some(t => typeof t !== 'string') || texts.join('').length > 20000) return res.status(400).json({ error: 'Invalid request' });
  if (!KEY) return res.status(503).json({ error: 'AI backend is not configured (GEMINI_API_KEY missing).' });
  try {
    const r = await gfetch({
      method: 'POST', signal: AbortSignal.timeout(50000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `Translate each UI string for a health app into simple, natural, conversational spoken ${lang}. For Telugu: use genuine everyday spoken dialect (వ్యవహారిక తెలుగు) that ordinary, uneducated rural people can immediately understand, like real people talking to each other. Do NOT use bookish Sanskritized words or repetitive formal text. Return ONLY a JSON array of strings, same length and order as the input. Keep numbers, units, emojis, punctuation, medicine names (like Metformin) and abbreviations (HbA1c, LDL, ABHA, FHIR) unchanged. Use a friendly, caring, respectful tone.` }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(texts.map(t => String(t).slice(0, 400))) }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8000, temperature: 0 }
      })
    });
    const j = await r.json();
    if (!r.ok) throw new Error('Google ' + r.status + gerr(j));
    const txt = ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
    const t = JSON.parse(txt);
    if (!Array.isArray(t) || t.length !== texts.length) throw new Error('mismatch');
    res.status(200).json({ t });
  } catch (e) { console.error('translate failed:', why(e)); res.status(500).json({ error: 'Translate failed (' + why(e) + ')' }); }
};
