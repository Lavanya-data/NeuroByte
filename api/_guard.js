// Light abuse protection for the public /api/* routes (see SECURITY.md for the honest limits).
//  1. The request must come from the Medoryx page itself (custom header + same-site Origin), which stops other
//     websites and casual scripts from using your Gemini quota through a visitor's browser.
//  2. Per-IP rate limit. Serverless instances do not share memory, so this is best-effort per warm instance;
//     for a hard limit also add a Vercel Firewall rate-limit rule (dashboard, no code).
//  3. Optional: set REQUIRE_AUTH=1 (plus SUPABASE_URL and SUPABASE_ANON_KEY) to accept only signed-in Supabase users.
//     Leave it off while judges use the offline demo account, which has no Supabase session.
// Calls without a headers object (unit tests, internal calls) are not limited.
const { clean } = require('./_gemini.js');
const buckets = new Map(), okTokens = new Map();
const ipOf = req => String((req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'unknown')).split(',')[0].trim();
const deny = (res, status, code, error, retry) => { if (retry && res.setHeader) res.setHeader('Retry-After', String(retry)); res.status(status).json({ error, code }); return false; };
function sameSite(req) {
  const o = req.headers.origin; if (!o) return true;
  let u; try { u = new URL(o); } catch (e) { return false; }
  if (u.host === req.headers.host || u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  return clean(process.env.ALLOWED_ORIGINS).split(',').map(s => s.trim()).filter(Boolean).includes(o);
}
async function signedIn(req) {
  const url = clean(process.env.SUPABASE_URL).replace(/\/$/, ''), key = clean(process.env.SUPABASE_ANON_KEY);
  if (!url || !key) return 'config'; // a misconfigured lock must say so, not look like "wrong password"
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || ''); if (!m) return false;
  const tok = m[1];
  if ((okTokens.get(tok) || 0) > Date.now()) return true;
  try {
    const r = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + tok }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return false;
    if (okTokens.size > 500) okTokens.clear();
    okTokens.set(tok, Date.now() + 60000); return true;
  } catch (e) { return false; }
}
// guard(req, res, name, perMinute, opts) -> true when the request may continue; otherwise the response has been sent.
async function guard(req, res, name, perMinute, opts) {
  if (!req || !req.headers) return true;
  opts = opts || {};
  if (opts.page !== false) {
    if (req.headers['x-medoryx'] !== '1' || !sameSite(req)) return deny(res, 403, 'FORBIDDEN', 'Requests must come from the Medoryx app.');
  }
  const now = Date.now(), k = name + '|' + ipOf(req);
  let b = buckets.get(k);
  if (!b || b.reset <= now) { b = { n: 0, reset: now + 60000 }; if (buckets.size > 5000) for (const [kk, v] of buckets) if (v.reset <= now) buckets.delete(kk); buckets.set(k, b); }
  if (++b.n > perMinute) return deny(res, 429, 'RATE_LIMIT', 'Too many requests. Please wait a minute and try again.', Math.ceil((b.reset - now) / 1000));
  if (opts.page !== false && process.env.REQUIRE_AUTH === '1') {
    const s = await signedIn(req);
    if (s === 'config') return deny(res, 503, 'AUTH_CONFIG', 'REQUIRE_AUTH is on but SUPABASE_URL / SUPABASE_ANON_KEY are not set.');
    if (!s) return deny(res, 401, 'AUTH', 'Please sign in to use this feature.');
  }
  return true;
}
module.exports = { guard, _buckets: buckets };
