// Run:  node eval/plausibility-tests.js     (no internet or API key needed)
const ex = require('../api/extract.js');
let fails = 0;
function check(name, got, want) { const ok = got === want; if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  got "' + got + '" want "' + want + '"')); }
const P = ex.plausibility;
check('hemoglobin 11.2 g/dL is fine', P('Hemoglobin', 11.2, 'g/dL'), '');
check('hemoglobin 112 g/dL is flagged', P('Hemoglobin', 112, 'g/dL'), 'implausible value');
check('hemoglobin 112 g/L: unit flagged, no guessing', P('Hemoglobin', 112, 'g/L'), 'unit unusual for this test');
check('Indian style unit gm/dL is accepted', P('Hb', 12.5, 'gm/dL'), '');
check('HbA1c 6.2 % is fine', P('HbA1c', 6.2, '%'), '');
check('HbA1c 62 % is flagged (and not treated as hemoglobin)', P('Hemoglobin A1c', 62, '%'), 'implausible value');
check('HbA1c unit g/dL is flagged', P('HbA1c', 6.2, 'g/dL'), 'unit unusual for this test');
check('glucose 108 mg/dL is fine', P('Fasting Blood Sugar', 108, 'mg/dL'), '');
check('glucose 5.4 mmol/L: unit flagged, not called implausible', P('Fasting Glucose', 5.4, 'mmol/L'), 'unit unusual for this test');
check('glucose 10800 mg/dL is flagged', P('Glucose', 10800, 'mg/dL'), 'implausible value');
check('TSH with micro sign unit is accepted', P('TSH', 2.1, '\u00b5IU/mL'), '');
check('sodium 140 mmol/L is fine', P('Sodium', 140, 'mmol/L'), '');
check('sodium 14 mmol/L is flagged', P('Sodium', 14, 'mmol/L'), 'implausible value');
check('vitamin D 27 ng/mL is fine', P('Vitamin D (25-OH)', 27, 'ng/mL'), '');
check('unknown test is never flagged', P('Some New Marker', 99999, 'x'), '');
check('missing value is not judged here', P('Hemoglobin', null, 'g/dL'), '');
check('missing unit is reported elsewhere, not here', P('Hemoglobin', 11, ''), '');
// through validate(): the row must become "uncertain" so the user is forced to look at it
const out = ex.validate({ type: 'Lab report', date: '2026-03-12', labs: [
  { n: 'Hemoglobin', v: 112, u: 'g/dL', lo: 12, hi: 15.5, src: 'Hemoglobin 112 g/dL (12.0-15.5)' },
  { n: 'Hemoglobin', v: 11.2, u: 'g/dL', lo: 12, hi: 15.5, src: 'Hemoglobin 11.2 g/dL' }], meds: [] }).clean.labs;
check('validate(): implausible row is uncertain and says why', out[0].uncertain === true && out[0].problems.includes('implausible value') ? 'yes' : 'no', 'yes');
check('validate(): normal row stays unflagged', out[1].uncertain === false && out[1].problems.length === 0 ? 'yes' : 'no', 'yes');
console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
process.exit(fails ? 1 : 0);
