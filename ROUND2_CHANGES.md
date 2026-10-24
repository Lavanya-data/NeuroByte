# Round 2 changes (what changed, how to configure it, how to undo it)

**Status: tested with mocked Google responses and a simulated browser. NOT yet tested against the real Gemini service, a Vercel Preview, or Supabase.**

## What changed
| File | Change | Why |
|---|---|---|
| `api/_gemini.js` (new) | Tries the next model when one returns 429 (quota) or 503 (busy). Other errors (bad key, bad request) are returned at once. | Quota is counted per model. One full model should not stop the demo. |
| `api/ask.js`, `explain.js`, `translate.js`, `extract.js` | Use the helper above. `extract.js` also flags implausible values and unexpected units. | Reliability, and catching likely misreads. |
| `index.html` | "Try a sample report" button (synthetic data, no AI, clearly labelled, asks before saving). Honest "AI busy" messages. | Judges must not meet a dead end. |
| `eval/fallback-tests.js`, `eval/plausibility-tests.js` (new) | Automatic tests. | Prove the above without internet. |

## Environment variables (names only)
- `GEMINI_API_KEY` (secret, already set)
- `GEMINI_MODEL` (first choice, already set)
- `GEMINI_FALLBACK_MODELS` (optional, comma separated; default `gemini-3-flash-preview,gemini-3.1-flash-lite,gemini-flash-lite-latest`)
- Preview deployments also need `GEMINI_API_KEY` added for the Preview environment.

## Not done, on purpose
- **Groq backup provider: not added.** Groq's vision models take images only (no PDFs). Free limits are per organization, so a second key gives no extra quota. Nothing verified shows it can read handwriting or Telugu/Hindi. It would also send medical documents to a second company, so the consent text would have to change. Add it only after testing it on your own sample documents.
- **Real-provider tests, Preview tests, Supabase isolation tests, live accuracy measurement:** not run.

## Rollback
- Fastest: in the Vercel dashboard open the project, then Deployments, pick the previous working deployment and choose Promote to Production.
- Or in Git: `git revert HEAD` then `vercel --prod`.
