# Medoryx
Files: index.html (UI) · api/extract.js (OCR + extraction, Gemini) · api/ask.js (Copilot chat, Gemini)

## Get a Gemini key
aistudio.google.com/apikey -> Create API key

## Run locally
1. Install Node.js (nodejs.org). 2. In this folder: `npm i -g vercel` then `vercel dev`
3. Create `.env.local` containing: GEMINI_API_KEY=your_key
4. Open http://localhost:3000

## Deploy (public link)
`vercel --prod` (or push to GitHub and import at vercel.com).
Add GEMINI_API_KEY in Project > Settings > Environment Variables, then redeploy.
Optional: GEMINI_MODEL=gemini-2.5-flash (change if Google retires the model name).

## Real accounts (Supabase, free)
1. supabase.com > New project. 2. SQL Editor: run supabase.sql.
3. Authentication > Providers > Email: turn OFF "Confirm email" (easiest for demo).
4. Project Settings > API: copy Project URL and anon public key into config.js. Redeploy.
Each user's records then sync across devices, protected by row-level security.

## Full-page translation (Hindi / Telugu)
Core screens are translated offline. Everything else (food lists, meal plan, dynamic text, lab names) is translated by Gemini through api/translate.js and cached in the browser, so it needs the deployed backend and GEMINI_API_KEY.

## Trust, safety and validation (read these)
**This is an unvalidated hackathon prototype. It has not been clinically reviewed and must not be used for real medical decisions.**
- [SAFETY.md](SAFETY.md): safeguards, urgent-symptom escalation, known limits
- [SECURITY.md](SECURITY.md): what is and is not production-grade
- [CLINICAL_REVIEW.md](CLINICAL_REVIEW.md): clinician review sheet (not yet completed); `node eval/make-review-packet.js` builds the packet
- [ACCURACY.md](ACCURACY.md): measured extraction accuracy and its limits
- [ABDM.md](ABDM.md): exactly which FHIR resources are exported and what is not supported
- Tests: `node eval/safety-tests.js`, `node eval/validate-fhir.js bundle.json`

Upload limit: 3 MB per file (base64 makes the request about 4 MB; Vercel caps bodies at ~4.5 MB). Large photos are shrunk in the browser; large PDFs are refused. For bigger documents, use direct upload to object storage (not implemented).
