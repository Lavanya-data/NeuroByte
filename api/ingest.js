// POST /api/ingest { docId, text, type, date, metadata } -> { ok: true, count }
// Ingests a medical document into the user's private pgvector knowledge base in Supabase.
const { guard } = require('./_guard.js');
const { clean } = require('./_gemini.js');
const { ingestDocument } = require('./_rag.js');

const fail = (res, s, code, error) => res.status(s).json({ error, code });

async function getAuthUser(req) {
  const url = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
  const key = clean(process.env.SUPABASE_ANON_KEY);
  if (!url || !key || !req || !req.headers) return null;
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const tok = m[1];
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${tok}` },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    const u = await r.json().catch(() => null);
    return u && u.id ? { id: u.id, tok } : null;
  } catch (e) {
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST only');
  if (!(await guard(req, res, 'ingest', 20))) return;

  const { docId, text, type, date, metadata } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) {
    return fail(res, 400, 'BAD_TEXT', 'Document text is required (string).');
  }
  if (text.length > 60000) {
    return fail(res, 400, 'TEXT_TOO_LONG', 'Document text must be under 60,000 characters.');
  }

  // Authentication check: chunks must belong to a verified user account
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return fail(res, 401, 'AUTH_REQUIRED', 'Please sign in to save and index medical records in your timeline.');
  }

  const result = await ingestDocument({
    docId: typeof docId === 'string' ? docId.slice(0, 80) : `doc_${Date.now()}`,
    text: text.trim(),
    type: typeof type === 'string' ? type.slice(0, 50) : 'Document',
    date: typeof date === 'string' ? date.slice(0, 20) : '',
    metadata: typeof metadata === 'object' && metadata ? metadata : {},
    userId: authUser.id,
    tok: authUser.tok
  });

  if (!result.ok) {
    return fail(res, 502, 'INGEST_FAILED', result.error || 'Failed to ingest document chunks.');
  }

  return res.status(200).json({ ok: true, count: result.count });
};
