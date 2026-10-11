// POST /api/extract { data: <base64>, mediaType } -> validated extraction (never silently fixed)
const MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim().replace(/^["']|["']$/g, '');
const KEY = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const why = e => String((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown').slice(0, 120);
const gerr = j => { const e = j && j.error; return e ? ': ' + String(e.status || '') + ' ' + String(e.message || '').slice(0, 140) : ''; };
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
// Vercel request bodies are capped at ~4.5 MB. Base64 adds ~33%, so the decoded file limit is 3 MB (about 4.0 MB of JSON).
const MAX_BYTES = 3 * 1024 * 1024, MAX_B64 = Math.ceil(MAX_BYTES / 3) * 4;
const fail = (res, status, code, error) => res.status(status).json({ error, code });
const num = x => (typeof x === 'number' && Number.isFinite(x) ? x : null); // missing stays null, never 0
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

function validate(raw) {
  const issues = [], today = new Date().toISOString().slice(0, 10);
  const out = { type: str(raw.type, 40) || 'Unknown document', date: '', dx: str(raw.dx, 300), doctor: str(raw.doctor, 80), follow: str(raw.follow, 300), labs: [], meds: [] };
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.date || '') && !isNaN(Date.parse(raw.date)) && raw.date <= today) out.date = raw.date;
  else issues.push('Document date is missing or invalid. Enter it manually.');
  (Array.isArray(raw.labs) ? raw.labs : []).slice(0, 80).forEach((l, i) => {
    const n = str(l && l.n, 80); if (!n) { issues.push(`Lab row ${i + 1} has no name and was skipped.`); return; }
    const v = num(l.v), lo = num(l.lo), hi = num(l.hi), u = str(l.u, 20), p = [];
    if (v === null) p.push('value'); if (!u) p.push('unit');
    if (lo === null || hi === null) p.push('reference range missing'); else if (lo > hi) p.push('reference range invalid');
    out.labs.push({ n, v, u, lo, hi, src: str(l.src, 160), uncertain: l.uncertain === true || p.length > 0, problems: p });
  });
  (Array.isArray(raw.meds) ? raw.meds : []).slice(0, 40).forEach((m, i) => {
    const n = str(m && m.n, 60); if (!n) { issues.push(`Medicine row ${i + 1} has no name and was skipped.`); return; }
    const dose = str(m.dose, 20), freq = str(m.freq, 10), days = m.days == null ? '' : String(m.days).trim(), p = [];
    if (!/^\d+(\.\d+)?\s?(mg|mcg|g|ml|IU|units?)$/i.test(dose)) p.push('dose');
    if (freq && !/^\d-\d-\d$/.test(freq)) p.push('schedule');
    if (days && !(/^\d{1,3}$/.test(days) && +days >= 1 && +days <= 365)) p.push('days');
    out.meds.push({ n, dose, freq, days, src: str(m.src, 160), uncertain: m.uncertain === true || p.length > 0, problems: p });
  });
  return { clean: out, issues };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST only');
  const { data, mediaType } = req.body || {};
  if (!TYPES.includes(mediaType)) return fail(res, 415, 'FILE_TYPE', 'Only JPG, PNG, WEBP or PDF files are accepted.');
  if (typeof data !== 'string' || !data.length) return fail(res, 400, 'BAD_DATA', 'The file data is not valid.');
  if (data.length > MAX_B64) return fail(res, 413, 'TOO_LARGE', 'File is larger than 3 MB. Compress it, split it, or upload a smaller photo.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4 !== 0) return fail(res, 400, 'BAD_DATA', 'The file data is not valid base64.');
  if (data.length / 4 * 3 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0) > MAX_BYTES) return fail(res, 413, 'TOO_LARGE', 'File is larger than 3 MB.');
  if (!KEY) return fail(res, 503, 'NO_KEY', 'AI backend is not configured (GEMINI_API_KEY missing).');
  const block = { inline_data: { mime_type: mediaType, data } };
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 50000);
  let j;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You transcribe medical documents (printed or handwritten; English/Hindi/Telugu/Tamil). Return ONLY JSON: {"type":"Lab report|Prescription|Discharge summary|Diagnostic report","date":"YYYY-MM-DD or null","dx":"diagnosis text or empty","doctor":"","follow":"","labs":[{"n":"name","v":number or null,"u":"unit","lo":number or null,"hi":number or null,"src":"exact text copied from the document for this row","uncertain":true|false}],"meds":[{"n":"name","dose":"500mg","freq":"1-0-1","days":"30","src":"exact text copied","uncertain":true|false}]}. Rules: use null for anything not clearly visible. NEVER guess a value, NEVER use 0 for a missing value, and NEVER invent a reference range that is not printed. Set uncertain=true when text is blurry, handwritten, cut off or ambiguous.' }] },
        contents: [{ role: 'user', parts: [block, { text: 'Transcribe the data.' }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4000, temperature: 0 }
      })
    });
    j = await r.json().catch(() => null);
    if (!r.ok || !j) return fail(res, 502, 'UPSTREAM', `AI service error (${r.status}${gerr(j)}). Try again or paste the text.`);
  } catch (e) {
    console.error('Gemini request failed:', why(e)); return fail(res, e.name === 'AbortError' ? 504 : 502, e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', 'Could not reach the AI service (' + why(e) + ').');
  } finally { clearTimeout(timer); }
  if (j.promptFeedback && j.promptFeedback.blockReason) return fail(res, 422, 'BLOCKED', 'The AI service declined to read this file.');
  const cand = (j.candidates || [])[0];
  if (!cand) return fail(res, 502, 'EMPTY', 'The AI service returned no result.');
  if (cand.finishReason === 'MAX_TOKENS') return fail(res, 502, 'TRUNCATED', 'The document was too long to read completely. Split it into pages.');
  const txt = ((cand.content || {}).parts || []).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
  let raw; try { raw = JSON.parse(txt); } catch (e) { return fail(res, 502, 'BAD_JSON', 'The AI result could not be understood. Try a clearer photo or paste the text.'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(res, 502, 'BAD_SHAPE', 'The AI result had an unexpected format.');
  const { clean, issues } = validate(raw);
  if (!clean.labs.length && !clean.meds.length && !clean.dx) return fail(res, 422, 'NOTHING_FOUND', 'No lab values, medicines or diagnosis were found in this file.');
  res.status(200).json({ ...clean, issues, raw, verifyRequired: true });
};
module.exports.validate = validate;
