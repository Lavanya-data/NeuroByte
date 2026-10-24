# Medoryx RAG (Retrieval-Augmented Generation) Guide

This document explains the RAG architecture implemented in Medoryx, the requirements, and how to use it.

---

## 1. Overview: How RAG Works in Medoryx

Before this update, Medoryx used naive context stuffing: stringifying up to 8,000 characters of lab values and pasting them into the Gemini prompt. 

With the new RAG implementation:
1. **Embedding**: When records or documents are saved, they are converted into semantic chunks and embedded using Google Gemini's `text-embedding-004` (768 dimensions).
2. **Storage**: Vectors and metadata are stored in Supabase PostgreSQL using the `pgvector` extension with an HNSW cosine similarity index.
3. **Retrieval**: When a patient asks a question in Copilot Chat (`/api/ask`), the query is embedded, and the most relevant chunks are retrieved from Supabase via `match_document_chunks` RPC.
4. **Augmentation & Grounding**: The retrieved context with citation tags (e.g., `[Source 1: Lab Report 2026-03-14]`) is injected into Gemini's system instruction.
5. **Citations in UI**: Copilot displays source badges directly beneath the answer.
6. **Graceful Fallback**: If Supabase is offline or the user is using the local demo evaluator, it automatically and seamlessly falls back to the high-level timeline context.

---

## 2. Requirements

### A. Environment Variables
In your `.env.local` (or Vercel Project Settings > Environment Variables):
```ini
# Required for AI generation and embeddings (both use the same key):
GEMINI_API_KEY=your_gemini_api_key

# Required for RAG vector search & sync:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key

# Optional (for server-side administrative access if needed):
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### B. Supabase Configuration (pgvector)
Open your **Supabase Dashboard > SQL Editor**, paste the contents of [`supabase.sql`](supabase.sql), and click **Run**.
This automatically creates:
- `create extension if not exists vector;`
- `document_chunks` table with Row-Level Security (`auth.uid() = user_id`)
- HNSW vector index (`embedding vector_cosine_ops`)
- `match_document_chunks` stored procedure for sub-millisecond similarity queries.

---

## 3. Files Created & Modified

| File | Purpose |
|---|---|
| [`api/_embeddings.js`](api/_embeddings.js) | Generates 768-dim embeddings via Gemini `text-embedding-004` (single & batch). |
| [`api/_rag.js`](api/_rag.js) | Clinical chunking, Supabase PostgREST vector search, and insertion. |
| [`api/ingest.js`](api/ingest.js) | Public API route `POST /api/ingest` to index patient documents into vector storage. |
| [`api/ask.js`](api/ask.js) | Augmented to perform vector retrieval and return source citations with fallback. |
| [`supabase.sql`](supabase.sql) | Appended `pgvector` table, RLS, indexes, and similarity search function. |
| [`index.html`](index.html) | Connected source badges to Copilot Chat and added an "Index records into AI vector search" button in Profile. |

---

## 4. How to Test RAG

1. **Run Locally**:
   ```bash
   vercel dev
   ```
2. **Log in**:
   - Create or sign in to an account with your Supabase credentials (configured in `config.js`).
3. **Index Records**:
   - Go to **Profile** > Click **⚡ Index records into AI vector search**.
   - Or upload and verify any new document in **Upload**; it will auto-index on save.
4. **Ask a Question**:
   - Go to **Copilot Chat** > Ask questions like:
     - *"What were my hemoglobin and HbA1c values?"*
     - *"What medicines was I prescribed?"*
   - Notice the **Sources: 📄 Lab report 2026-03-14** badge appearing below the response!
