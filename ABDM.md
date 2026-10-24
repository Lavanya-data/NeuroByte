# ABDM readiness: exactly what is and is not supported

**Live ABDM/ABHA integration: NOT implemented.** The ABHA number, address and OTP step are a **mock**, clearly labelled in the app.

## FHIR export (Profile > Download)
FHIR R4 `Bundle` (type `collection`, `urn:uuid` fullUrls, all references resolve inside the bundle):
| Resource | Fields used |
|---|---|
| Patient | name, gender (if set), identifiers: ABHA number (`https://healthid.ndhm.gov.in`) and PHR address (`https://phr.abdm.gov.in`) when entered. These two system URIs are my assumption and are unverified. |
| Observation | status (`final` only if you verified the record, else `preliminary`), laboratory category, code (LOINC for 9 common tests, otherwise text), value and unit, reference range and interpretation only when valid, effectiveDateTime |
| MedicationRequest | status (`active` if verified, else `draft`), intent `order`, medication text, dosage text, authoredOn |
| Condition | code text, recordedDate |

Added: UCUM system/code on quantities for 9 common units (others keep text-only units); `Patient.meta.tag` labels data as **prototype**, **mock ABHA** (when an ABHA is entered) and **synthetic demo** (demo account). Observation status is `final` only if you verified that row.

Checked with `node eval/validate-fhir.js bundle.json` (own structural checks: required fields, dates, references, no empty arrays or nulls): passes.
**The official HL7 validator has NOT validated this export.** It was downloaded and run here but could not load the FHIR R4 definitions (package server unreachable in this environment). To validate yourself, with internet access:
`java -jar validator_cli.jar bundle.json -version 4.0.1` (jar from github.com/hapifhir/org.hl7.fhir.core/releases). Fix whatever it reports before claiming conformance. Profile-level conformance (ABDM/NRCeS) is not attempted.

## Not supported
ABDM/NRCeS profile conformance, `Composition`/document bundles, `DiagnosticReport`, signatures and provenance, UCUM-coded units, SNOMED CT, ABDM consent artefacts, HIP/HIU APIs, gateway or sandbox calls, ABHA creation or verification.
LOINC codes are mapped by test name and were not independently verified.
