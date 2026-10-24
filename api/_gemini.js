// Calls Gemini. Quotas are counted PER MODEL, so if one model is out of quota (429), overloaded (503), retired or
// renamed (404) or having a server error (500/502/504) we try the next model in the list before giving up.
// Auth/request errors (401, 403, 400 ...) are returned at once, because another model would fail the same way.
// Set GEMINI_MODEL for the first choice and GEMINI_FALLBACK_MODELS (comma separated) for the backups.
// Open /api/health to see which of these model names your key can actually use right now.
const clean = s => String(s || '').trim().replace(/^["']|["']$/g, '');
function modelList() {
  const first = clean(process.env.GEMINI_MODEL) || 'gemini-flash-latest';
  const backups = (clean(process.env.GEMINI_FALLBACK_MODELS) || 'gemini-3-flash-preview,gemini-3.1-flash-lite,gemini-flash-lite-latest')
    .split(',').map(clean).filter(Boolean);
  const list = [first];
  for (const m of backups) if (!list.includes(m)) list.push(m);
  return list;
}
const RETRY = [404, 429, 500, 502, 503, 504];
async function gfetch(init) {
  const models = modelList();
  for (let i = 0; i < models.length; i++) {
    const more = i < models.length - 1;
    let r;
    try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent`, init); }
    catch (e) { if (more && e && e.name !== 'AbortError') continue; throw e; } // network blip: try the next model; a timeout (shared deadline) is final
    if (more && RETRY.includes(r.status)) { await r.arrayBuffer().catch(() => {}); continue; }
    return r;
  }
}
module.exports = { gfetch, modelList, clean };
