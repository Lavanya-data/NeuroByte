// POST /api/explain { labs:[{n,v,u,lo,hi,uncertain}], lang, age, sex } -> { summary, items, limits }
const MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim().replace(/^["']|["']$/g, '');
const KEY = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const why = e => String((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown').slice(0, 120);
const gerr = j => { const e = j && j.error; return e ? ': ' + String(e.status || '') + ' ' + String(e.message || '').slice(0, 140) : ''; };
const LANGS = ['English', 'Hindi', 'Telugu'];
const LIMITS = { English: 'This is general information, not a diagnosis. A result inside the reference range does not prove you are healthy, and a result outside it does not prove disease. Your doctor must interpret results together with your symptoms and history.', Hindi: 'यह सामान्य जानकारी है, निदान नहीं। सामान्य सीमा के भीतर का परिणाम यह साबित नहीं करता कि आप स्वस्थ हैं। परिणामों को आपके लक्षणों और इतिहास के साथ डॉक्टर ही समझ सकते हैं।', Telugu: 'ఇది సాధారణ సమాచారం మాత్రమే, నిర్ధారణ కాదు. సాధారణ పరిధిలో ఉన్న ఫలితం మీరు ఆరోగ్యంగా ఉన్నారని నిరూపించదు. మీ లక్షణాలు, చరిత్రతో కలిపి డాక్టర్ మాత్రమే ఫలితాలను అర్థం చేసుకోగలరు.' };
const S = require('./_safety');
const fail = (res, s, code, error) => res.status(s).json({ error, code });
const fin = x => typeof x === 'number' && Number.isFinite(x);
module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST only');
  const { labs, lang, age, sex } = req.body || {};
  const L = LANGS.includes(lang) ? lang : 'English';
  if (!Array.isArray(labs) || !labs.length || labs.length > 60) return fail(res, 400, 'BAD_LABS', 'Provide 1-60 lab values.');
  const ok = [], skipped = [];
  labs.forEach(d => {
    const good = d && typeof d.n === 'string' && d.n.trim() && d.n.length <= 80 && fin(d.v) && typeof d.u === 'string' && d.u.length <= 20 && fin(d.lo) && fin(d.hi) && d.lo <= d.hi;
    if (!good) { skipped.push(d && d.n ? String(d.n).slice(0, 80) : '(unnamed)'); return; }
    ok.push({ n: d.n.trim(), v: d.v, u: d.u, lo: d.lo, hi: d.hi, st: d.v < d.lo ? 'LOW' : d.v > d.hi ? 'HIGH' : 'WITHIN REFERENCE RANGE', unc: d.uncertain === true });
  });
  if (!ok.length) return fail(res, 422, 'NO_VALID_LABS', 'No lab value had a valid number, unit and reference range, so nothing can be explained. Please verify the report.');
  if (!KEY) return fail(res, 503, 'NO_KEY', 'AI backend is not configured (GEMINI_API_KEY missing).');
  const rows = ok.map(d => `${d.n}: ${d.v} ${d.u} (reference ${d.lo}-${d.hi}) status computed by the app: ${d.st}${d.unc ? ' [value uncertain, tell the user to verify it]' : ''}`).join('\n');
  let j;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', signal: AbortSignal.timeout(50000), headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `You explain lab results to a patient in simple, calm ${L}. Return ONLY JSON: {"summary":"max 60 words","items":{"<exact lab name>":"1-2 sentences: what it measures, what the given status can mean, when to see a doctor"}}. Write values in ${L}. The status for each lab is already computed by the app: do NOT change or re-decide it. Never say or imply the person is healthy, safe or fine, even when values are within range; say a doctor must interpret results with symptoms and history. If a value is marked uncertain or information is missing, say so. Never diagnose; never advise starting, stopping or changing medicines. Age: ${typeof age === 'string' || typeof age === 'number' ? String(age).slice(0, 3) : 'unknown'}, sex: ${['male', 'female', 'other'].includes(sex) ? sex : 'unknown'}.` }] },
        contents: [{ role: 'user', parts: [{ text: rows }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2500, temperature: 0.2 }
      })
    });
    j = await r.json().catch(() => null);
    if (!r.ok || !j) return fail(res, 502, 'UPSTREAM', `AI service error (${r.status}${gerr(j)}).`);
  } catch (e) { console.error('Gemini request failed:', why(e)); return fail(res, 502, 'NETWORK', 'Could not reach the AI service (' + why(e) + ').'); }
  const cand = (j.candidates || [])[0];
  const txt = ((cand && cand.content && cand.content.parts) || []).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
  let out; try { out = JSON.parse(txt); } catch (e) { return fail(res, 502, 'BAD_JSON', 'The AI explanation could not be understood.'); }
  if (!out || typeof out.summary !== 'string' || typeof out.items !== 'object' || !out.items) return fail(res, 502, 'BAD_SHAPE', 'Unexpected AI format.');
  const names = new Set(ok.map(d => d.n)), items = {};
  Object.keys(out.items).forEach(k => { if (names.has(k) && typeof out.items[k] === 'string') items[k] = out.items[k].slice(0, 500); });
  let flagged = false, summary = out.summary.slice(0, 600);
  if (S.unsafe(summary)) { flagged = true; summary = ''; }
  Object.keys(items).forEach(k => { if (S.unsafe(items[k])) { flagged = true; delete items[k]; } });
  res.status(200).json({ summary: summary || 'Please discuss these results with your doctor.', items, limits: LIMITS[L], skipped, filtered: flagged, uncertain: ok.filter(d => d.unc).map(d => d.n) });
};
