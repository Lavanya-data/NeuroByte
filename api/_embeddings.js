// Computes vector embeddings using Google Gemini embeddings (768 dimensions).
// Works with the same GEMINI_API_KEY used across Medoryx. Native fetch only (no npm packages).
const { clean } = require('./_gemini.js');

const KEY = () => clean(process.env.GEMINI_API_KEY);
const EMBED_MODELS = ['text-embedding-004', 'embedding-001'];

/**
 * Get embedding vector (768 floats) for a single string.
 * @param {string} text
 * @returns {Promise<number[]|null>}
 */
async function getEmbedding(text) {
  const k = KEY();
  if (!k || typeof text !== 'string' || !text.trim()) return null;
  const cleanText = text.trim().slice(0, 8000);

  for (const model of EMBED_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': k
          },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text: cleanText }] },
            outputDimensionality: 768
          })
        }
      );
      if (!r.ok) {
        if (r.status === 404) continue; // Try next fallback model
        const errJson = await r.json().catch(() => ({}));
        console.warn(`Embedding API (${model}) returned HTTP ${r.status}:`, errJson && errJson.error ? errJson.error.message : '');
        continue;
      }
      const data = await r.json().catch(() => null);
      if (data && data.embedding && Array.isArray(data.embedding.values)) {
        // If the model returned 768, perfect. If it returned 3072 without truncating, slice to 768
        return data.embedding.values.slice(0, 768);
      }
    } catch (err) {
      console.warn(`Embedding request (${model}) failed:`, err && err.message ? err.message : err);
    }
  }
  return null;
}

/**
 * Get embedding vectors for an array of texts.
 * Uses batchEmbedContents when multiple items are provided with fallback.
 * @param {string[]} texts
 * @returns {Promise<Array<number[]|null>>}
 */
async function getBatchEmbeddings(texts) {
  const k = KEY();
  if (!k || !Array.isArray(texts) || !texts.length) return [];
  const validTexts = texts.map(t => (typeof t === 'string' ? t.trim().slice(0, 8000) : '')).filter(Boolean);
  if (!validTexts.length) return [];

  if (validTexts.length === 1) {
    const single = await getEmbedding(validTexts[0]);
    return [single];
  }

  for (const model of EMBED_MODELS) {
    try {
      const requests = validTexts.slice(0, 60).map(t => ({
        model: `models/${model}`,
        content: { parts: [{ text: t }] },
        outputDimensionality: 768
      }));

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(25000),
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': k
          },
          body: JSON.stringify({ requests })
        }
      );

      if (!r.ok) {
        if (r.status === 404) continue;
        break; // Non-404 error, drop down to individual fallback
      }

      const data = await r.json().catch(() => null);
      if (data && Array.isArray(data.embeddings)) {
        return data.embeddings.map(e => (e && Array.isArray(e.values) ? e.values.slice(0, 768) : null));
      }
    } catch (err) {
      console.warn(`Batch embedding request (${model}) failed:`, err && err.message ? err.message : err);
    }
  }

  // Fallback: individual embeddings
  const fallbacks = [];
  for (const t of validTexts) {
    fallbacks.push(await getEmbedding(t));
  }
  return fallbacks;
}

module.exports = {
  getEmbedding,
  getBatchEmbeddings,
  EMBED_MODELS
};
