// RAG helper for Medoryx: chunking, Supabase vector storage, and similarity search.
// Uses native fetch to connect directly to Supabase PostgREST and pgvector. Zero npm dependencies.
const { clean } = require('./_gemini.js');
const { getEmbedding, getBatchEmbeddings } = require('./_embeddings.js');

function getSbConfig() {
  const url = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
  // Prefer service role key for server operations if available, fallback to anon key
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY) || clean(process.env.SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Split text into semantic chunks respecting paragraphs, lines and sentences.
 * Aim for ~400-700 characters per chunk with gentle overlap.
 * @param {string} text 
 * @param {number} maxChars 
 * @param {number} overlap 
 * @returns {string[]}
 */
function chunkText(text, maxChars = 600, overlap = 80) {
  if (typeof text !== 'string') return [];
  const cleanStr = text.replace(/\r\n/g, '\n').trim();
  if (!cleanStr) return [];
  if (cleanStr.length <= maxChars) return [cleanStr];

  const rawParagraphs = cleanStr.split(/\n{2,}/);
  const chunks = [];
  let current = '';

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((current + '\n\n' + trimmed).trim().length <= maxChars) {
      current = current ? current + '\n\n' + trimmed : trimmed;
    } else {
      if (current) {
        chunks.push(current.trim());
        // carry over slight overlap if current is long enough
        const tail = current.slice(Math.max(0, current.length - overlap));
        current = tail + '\n' + trimmed;
      } else {
        current = trimmed;
      }

      // If a single paragraph is still larger than maxChars, split on sentences/lines
      while (current.length > maxChars) {
        let cutPoint = current.lastIndexOf('. ', maxChars);
        if (cutPoint === -1) cutPoint = current.lastIndexOf('\n', maxChars);
        if (cutPoint === -1 || cutPoint < maxChars * 0.4) cutPoint = maxChars;

        chunks.push(current.slice(0, cutPoint + 1).trim());
        const carry = current.slice(Math.max(0, cutPoint + 1 - overlap), cutPoint + 1);
        current = (carry + ' ' + current.slice(cutPoint + 1)).trim();
      }
    }
  }

  if (current && current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter(c => c.length > 10);
}

/**
 * Retrieve top-k relevant document chunks for a question.
 * @param {object} opts
 * @param {string} opts.query - User question
 * @param {string} [opts.tok] - User Bearer JWT token if signed in
 * @param {string} [opts.userId] - Supabase user UUID if known
 * @param {number} [opts.limit=4]
 * @param {number} [opts.threshold=0.3]
 * @returns {Promise<Array<{ content:string, metadata:object, similarity:number }>>}
 */
async function searchChunks({ query, tok, userId, limit = 4, threshold = 0.28 }) {
  const sb = getSbConfig();
  if (!sb || !query || typeof query !== 'string') return [];
  // Strict tenant isolation: Never execute a global chunk search without a verified user scope
  if (!userId && !tok) return [];

  // Generate question vector
  const queryEmb = await getEmbedding(query);
  if (!queryEmb) return [];

  const headers = {
    apikey: sb.key,
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + (tok || sb.key)
  };

  try {
    const r = await fetch(`${sb.url}/rest/v1/rpc/match_document_chunks`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers,
      body: JSON.stringify({
        query_embedding: queryEmb,
        match_threshold: threshold,
        match_count: limit,
        p_user_id: userId || null
      })
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.warn('match_document_chunks RPC warning:', r.status, err && err.message ? err.message : '');
      return [];
    }

    const matches = await r.json().catch(() => []);
    if (!Array.isArray(matches)) return [];
    return matches.map(m => ({
      id: m.id,
      content: m.content || '',
      metadata: m.metadata || {},
      similarity: typeof m.similarity === 'number' ? m.similarity : 0
    }));
  } catch (err) {
    console.warn('searchChunks error:', err && err.message ? err.message : err);
    return [];
  }
}

/**
 * Chunk a document and insert into Supabase document_chunks.
 * @param {object} doc
 * @param {string} doc.docId - Unique doc identifier
 * @param {string} doc.text - Raw text or structured summary
 * @param {string} [doc.type] - Document type (e.g., 'Lab report', 'Prescription')
 * @param {string} [doc.date] - Document date (YYYY-MM-DD)
 * @param {object} [doc.metadata] - Extra metadata (doctor, conditions, etc.)
 * @param {string} [doc.userId] - Supabase user UUID
 * @param {string} [doc.tok] - User auth token
 * @returns {Promise<{ ok:boolean, count:number, error?:string }>}
 */
async function ingestDocument(doc) {
  const sb = getSbConfig();
  if (!sb) return { ok: false, count: 0, error: 'Supabase is not configured' };
  if (!doc || !doc.text) return { ok: false, count: 0, error: 'No document text provided' };

  const chunks = chunkText(doc.text);
  if (!chunks.length) return { ok: false, count: 0, error: 'Document yielded no chunks' };

  // Compute batch embeddings
  const embeddings = await getBatchEmbeddings(chunks);
  const rows = [];

  for (let i = 0; i < chunks.length; i++) {
    const emb = embeddings[i];
    if (!emb) continue; // skip chunk if embedding failed
    rows.push({
      doc_id: String(doc.docId || 'doc_' + Date.now()),
      chunk_index: i,
      content: chunks[i],
      metadata: {
        ...(doc.metadata || {}),
        type: doc.type || 'Medical Record',
        date: doc.date || '',
        title: doc.title || doc.type || 'Document'
      },
      embedding: emb,
      user_id: doc.userId
    });
  }

  if (!rows.length) return { ok: false, count: 0, error: 'Failed to generate embeddings' };

  const headers = {
    apikey: sb.key,
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + (doc.tok || sb.key),
    Prefer: 'return=minimal'
  };

  try {
    const r = await fetch(`${sb.url}/rest/v1/document_chunks`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers,
      body: JSON.stringify(rows)
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return { ok: false, count: 0, error: `Supabase insert failed: ${r.status} ${err.message || ''}` };
    }

    return { ok: true, count: rows.length };
  } catch (err) {
    return { ok: false, count: 0, error: err && err.message ? err.message : 'Network error' };
  }
}

module.exports = {
  chunkText,
  searchChunks,
  ingestDocument,
  getSbConfig
};
