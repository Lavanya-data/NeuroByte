# Safety design and escalation policy

**Status: unvalidated hackathon prototype. No clinician has reviewed it. Not for real clinical use.**

A text filter is only one safeguard. Layers, in the order they act:
1. **Urgent-symptom escalation (deterministic, no AI).** If a question mentions chest pain, breathing difficulty, fainting, stroke signs, heavy bleeding, seizure, overdose, allergic swelling or self-harm in English, Hindi or Telugu, the app and `/api/ask` return a fixed message (call 112, go to hospital, Tele-MANAS 14416) without calling the AI or requiring consent. Helpline numbers must be re-checked before real use.
2. **Computed status.** High/low/normal is calculated by the app from validated numbers; the AI may not change it. Missing or invalid data shows "Unable to classify".
3. **Critical-value banner.** Hemoglobin below 7, glucose above 250 or below 54, HbA1c 10 or more: fixed "contact your doctor today / dial 112" banner.
4. **Prompt rules.** The model is told not to diagnose, reassure, or change medicines.
5. **Output filter (English, Hindi, Telugu).** Replaces answers that declare the person healthy, say to stop or change a medicine, or state a diagnosis, with a fixed safe message in the user's language.
6. **Fixed limitation text** on every AI explanation; UI labels that separate "AI answer", "From your saved records, not AI", "Offline reply, not AI" and "Safety message, not AI".
7. **Human verification** of extracted values before they count as verified.
8. **Clinical review: NOT DONE** (see `CLINICAL_REVIEW.md`).

## Known limits
- Keyword lists are short and not exhaustive. Misspellings, other languages, slang and indirect wording can slip through (false negatives). Mentions like "I had chest pain last year" will also escalate (false positive by design).
- The multilingual tests (`node eval/safety-tests.js`, 40 checks) were written by the same author as the filters. They verify behaviour, not coverage, and are not clinical evidence.
- The Hindi and Telugu wording has not been reviewed by a native speaker or clinician.
