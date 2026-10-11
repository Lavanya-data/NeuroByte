// POST /api/diet { labs, meds, conds, lang } -> { summary, eat[], limit[], avoid[], medicineNotes[], tips[] }
const MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim().replace(/^["']|["']$/g, '');
const KEY = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const why = e => String((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown').slice(0, 120);
const gerr = j => { const e = j && j.error; return e ? ': ' + String(e.status || '') + ' ' + String(e.message || '').slice(0, 140) : ''; };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { labs, meds, conds, lang } = req.body || {};
  if (!Array.isArray(labs) || !labs.length || labs.length > 60) return res.status(400).json({ error: 'Invalid labs' });
  const info = 'Labs: ' + labs.map(d => `${d.n} ${d.v} ${d.u} (ref ${d.lo}-${d.hi})`).join('; ') +
    '\nMedicines: ' + (meds || []).map(m => `${m.n} ${m.dose} ${m.freq}`).join('; ') +
    '\nConditions: ' + (conds || []).join('; ');
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', signal: AbortSignal.timeout(50000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `You give general food guidance to an Indian patient in simple ${lang || 'English'}. Return ONLY JSON: {"summary":"max 50 words","eat":[],"limit":[],"avoid":[],"medicineNotes":["medicine: food interaction note"],"tips":[]} with at most 6 short items per list, all in ${lang || 'English'}. Suggest common Indian foods that match the abnormal values. This is general guidance, not a prescription: no cures, no supplement doses, never change or stop medicines, and advise seeing a doctor or dietitian for kidney disease, pregnancy or diabetes medicines.` }] },
        contents: [{ role: 'user', parts: [{ text: info }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2500, temperature: 0.3 }
      })
    });
    const j = await r.json();
    if (!r.ok) throw new Error('Google ' + r.status + gerr(j));
    const txt = ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
    res.status(200).json(JSON.parse(txt));
  } catch (e) { console.error('diet failed:', why(e)); res.status(500).json({ error: 'Diet plan failed (' + why(e) + ')' }); }
};
