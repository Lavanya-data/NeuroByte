# Security and privacy status (read before any real use)

**This is a hackathon prototype. It is NOT production-grade authentication or clinical storage.**

| Area | Current state | Needed for production |
|---|---|---|
| Local accounts | Password hashed with salted PBKDF2 (150k iterations) and stored in browser localStorage. Anyone with access to the browser profile can read the stored records; they are not encrypted. 5 failed logins lock the form for 30 s, but this is client-side only. | Server-side auth, encrypted storage, server-side rate limiting |
| Demo account | Checked against an unsalted SHA-256 hash embedded in the page source. Fine for a demo, weak against offline guessing. | Remove before real use |
| Online accounts (Supabase) | Passwords handled by Supabase Auth. Access token kept in memory only (not persisted). Row-level security in `supabase.sql` limits each user to their own row, including delete. Records are stored as one unencrypted JSON row. Not tested against a live project. | Field-level encryption, audit log, tested policies |
| Sessions | Auto sign-out after 15 minutes of inactivity. Token is not refreshed. | Refresh tokens, server-side revocation |
| Deletion | "Reset my data" deletes the local copy and the Supabase row. Backups and Gemini-side logs are outside our control. | Verified erasure workflow |
| External AI | Uploaded documents, lab values and questions go to Google Gemini via our `/api/*` functions. The app asks for consent first and blocks AI calls and page translation until given. The translation feature sends visible page text, which can include diagnosis text and the user's name, so it is also gated by that consent. | Data-processing agreement, redaction before sending, regional hosting review |
| Original documents | Photos under 1.2 MB are stored with the record; PDFs are not preserved. | Encrypted object storage |
| ABDM | The ABHA link is a mock (not verified). | NHA sandbox credentials and certification |
