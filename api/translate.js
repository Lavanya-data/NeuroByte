// POST /api/translate { lang, texts: [..] } -> { t: [..] }  (same order, same length)
const MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim().replace(/^["']|["']$/g, '');
const KEY = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const why = e => String((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown').slice(0, 120);
const gerr = j => { const e = j && j.error; return e ? ': ' + String(e.status || '') + ' ' + String(e.message || '').slice(0, 140) : ''; };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { lang, texts } = req.body || {};
  if (!['Hindi', 'Telugu'].includes(lang) || !Array.isArray(texts) || !texts.length || texts.length > 60) return res.status(400).json({ error: 'Invalid request' });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', signal: AbortSignal.timeout(50000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `Translate each UI string for a health app into simple, natural ${lang}. Return ONLY a JSON array of strings, same length and order as the input. Keep numbers, units, emojis, punctuation, medicine names (like Metformin) and abbreviations (HbA1c, LDL, ABHA, FHIR) unchanged. Lab test names may be written in ${lang} script. Use a calm, respectful tone.` }] },
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
