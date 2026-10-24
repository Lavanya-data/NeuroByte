# Extraction accuracy report

**Status: the live AI (Gemini) extraction has NOT been measured yet. No accuracy percentage for it exists. Do not quote one.**

## 1. What was measured so far (offline text parser only)
The app's rule-based reader for *pasted text* was scored against hand-written ground truth on **9 synthetic text documents (176 fields)**. This is **not** the Gemini photo/PDF reader.

Field accuracy = correct fields / total verified fields. A missing or wrong field counts as incorrect.

| Doc | Type | Fields | Before fixes | After fixes |
|---|---|---|---|---|
| D01 | printed lab report | 26 | 26 (100%) | 26 (100%) |
| D02 | printed lab report (diabetes panel) | 21 | 21 (100%) | 21 (100%) |
| D03 | printed prescription | 14 | 14 (100%) | 14 (100%) |
| D04 | printed prescription (5 medicines) | 22 | 22 (100%) | 22 (100%) |
| D05 | missing units | 11 | 5 (45%) | 11 (100%) |
| D06 | missing reference ranges | 11 | 5 (45%) | 11 (100%) |
| D07 | blurry photo of D01 | not run (image/PDF needs the live AI) | | |
| D08 | multi-page PDF (lab + prescription) | 39 | 39 (100%) | 39 (100%) |
| D09 | bilingual (Telugu/Hindi headings) | 11 | 11 (100%) | 11 (100%) |
| D10 | decimal-heavy lab report | 21 | 21 (100%) | 21 (100%) |
| **Total** | | **176** | **164/176 (93.2%)** | **176/176 (100.0%)** |

### Mistakes found before the fixes
- **D05** (missing units): 6 wrong or missing fields, e.g. Hemoglobin.value: expected 11.2, got "(missing)"; Hemoglobin.low: expected 12, got "(missing)"
- **D06** (missing reference ranges): 6 wrong or missing fields, e.g. Hemoglobin.value: expected 11.2, got "(missing)"; Hemoglobin.unit: expected "g/dL", got "(missing)"
- Worst case: for `Platelets 250 (150-410)` the parser read the value as **25** with unit **0** and did not flag it.

### Fixes made after seeing these results
Rows with a missing unit or reference range are now kept, marked uncertain and left empty (never guessed). Units can no longer start with a digit. Unreadable lines are listed as issues.
Uncertainty flagging: the parser flagged both missing-unit/missing-range documents (D05, D06) and no clean document.

### Limitations (read before presenting)
- **Not independent:** the parser was fixed after failing on this same set, so the after score is not a fair estimate for new documents.
- 9 documents, all synthetic, clean, machine-typed English text with one layout. Real reports vary far more. The parser has never seen real, messy text.
- Decimal handling was tested only on D10 (4 values).
- No handwriting, no Telugu/Hindi OCR, no photos, no real multi-page scans were measured.

## 2. Live AI extraction (to be run)
Synthetic images and a 2-page PDF are in `eval/docs/`; ground truth is in `eval/ground_truth.json`.
```
vercel dev            # with GEMINI_API_KEY set
node eval/run-live.js # writes eval/results-live.json
```
Paste the per-document results below, then add 10 or more real or consented, de-identified documents (including handwriting and a Telugu/Hindi document). Record exact mistakes (units, decimal points, dosages) and whether uncertain fields were flagged.

| Doc | Fields correct / tested | Mistakes (units, decimals, dosage) | Uncertainty flagged correctly? |
|---|---|---|---|
| D01 | _not run_ | | |

## 3. Checklist (0 of 8 complete)
| Test | Status |
|---|---|
| Printed laboratory report | Parser only (synthetic text). Live AI not run |
| Prescription photo | Not run |
| Multi-page PDF | Parser on text only. Live AI not run |
| Telugu or Hindi document | Text only (no Telugu image: no font available here). Needs a real document |
| Handwritten prescription | Not run (cannot be synthesised honestly) |
| Missing units or reference ranges | Parser measured (D05, D06). Live AI not run |
| Deliberately blurry image | Image created (D07). Live AI not run |
| Review of summaries by a healthcare professional | Not done (see CLINICAL_REVIEW.md) |
