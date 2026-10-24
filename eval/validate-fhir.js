// Structural FHIR R4 checks for the Medoryx export. NOT the official HL7 validator.
// Usage: node eval/validate-fhir.js bundle.json
const fs = require('fs');
function validate(b) {
  const err = [], isDate = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '') && !isNaN(Date.parse(x));
  const walk = (o, p) => { if (Array.isArray(o)) { if (!o.length) err.push(`${p}: empty array is not allowed in FHIR JSON`); o.forEach((x, i) => walk(x, `${p}[${i}]`)); } else if (o && typeof o === 'object') Object.keys(o).forEach(k => { if (o[k] === null) err.push(`${p}.${k}: null is not allowed`); walk(o[k], `${p}.${k}`); }); };
  walk(b, 'Bundle');
  if (b.resourceType !== 'Bundle' || b.type !== 'collection') err.push('Bundle.type must be collection');
  if (!b.id) err.push('Bundle.id missing'); if (!b.timestamp || isNaN(Date.parse(b.timestamp))) err.push('Bundle.timestamp invalid');
  const urls = new Set(), ids = new Set();
  (b.entry || []).forEach((e, i) => { const r = e.resource || {}, w = `entry[${i}] ${r.resourceType}`;
    if (!/^urn:uuid:[0-9a-f-]{36}$/i.test(e.fullUrl || '')) err.push(`${w}: fullUrl must be urn:uuid`); if (urls.has(e.fullUrl)) err.push(`${w}: duplicate fullUrl`); urls.add(e.fullUrl);
    if (!r.id || e.fullUrl !== 'urn:uuid:' + r.id) err.push(`${w}: resource.id must match fullUrl`); ids.add(r.id); });
  (b.entry || []).forEach((e, i) => { const r = e.resource, w = `entry[${i}] ${r.resourceType}`;
    if (r.subject && !urls.has(r.subject.reference)) err.push(`${w}: subject reference does not resolve inside the bundle`);
    if (r.resourceType === 'Patient') { if (r.gender && !['male', 'female', 'other', 'unknown'].includes(r.gender)) err.push(`${w}: bad gender`); }
    else if (r.resourceType === 'Observation') { if (!['final', 'preliminary', 'amended', 'registered'].includes(r.status)) err.push(`${w}: bad status`); if (!r.code || !(r.code.text || r.code.coding)) err.push(`${w}: code missing`); if (!isDate(r.effectiveDateTime)) err.push(`${w}: effectiveDateTime invalid`); if (!r.valueQuantity || typeof r.valueQuantity.value !== 'number') err.push(`${w}: valueQuantity.value must be a number`); (r.referenceRange || []).forEach(x => { if (x.low && x.high && x.low.value > x.high.value) err.push(`${w}: referenceRange low > high`); }); (r.code.coding || []).forEach(c => { if (!c.system || !c.code) err.push(`${w}: coding needs system and code`); }); }
    else if (r.resourceType === 'MedicationRequest') { if (!['active', 'draft', 'completed', 'on-hold', 'cancelled', 'stopped', 'entered-in-error', 'unknown'].includes(r.status)) err.push(`${w}: bad status`); if (r.intent !== 'order') err.push(`${w}: intent`); if (!r.medicationCodeableConcept || !r.medicationCodeableConcept.text) err.push(`${w}: medication missing`); if (!isDate(r.authoredOn)) err.push(`${w}: authoredOn invalid`); }
    else if (r.resourceType === 'Condition') { if (!r.code || !r.code.text) err.push(`${w}: code missing`); if (!isDate(r.recordedDate)) err.push(`${w}: recordedDate invalid`); }
    else err.push(`${w}: unsupported resource type`); });
  return err;
}
module.exports = { validate };
if (require.main === module) { const e = validate(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))); console.log(e.length ? e.join('\n') : 'OK: passes structural checks (not validated by the official HL7 validator)'); process.exit(e.length ? 1 : 0); }
