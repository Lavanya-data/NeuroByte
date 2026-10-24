// Field-level scoring against ground truth. Missing or wrong = incorrect. Nothing is rounded up.
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, '');
const numEq = (a, b) => (a == null && b == null) || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9);
function score(exp, got) {
  const rows = [], bad = []; let total = 0, ok = 0;
  const chk = (field, e, g, eq) => { total++; const good = eq(e, g); if (good) ok++; else bad.push(`${field}: expected ${JSON.stringify(e)}, got ${JSON.stringify(g === undefined ? '(missing)' : g)}`); };
  chk('date', exp.date, got.date, (a, b) => a === b);
  if (exp.dx) chk('diagnosis', exp.dx, got.dx, (a, b) => norm(a) === norm(b));
  const gl = got.labs || [], gm = got.meds || [];
  exp.labs.forEach(l => {
    const g = gl.find(x => norm(x.n) === norm(l.n)) || {};
    chk(`${l.n}.value`, l.v, g.v, numEq); chk(`${l.n}.unit`, l.u, g.u == null ? undefined : g.u, (a, b) => norm(a) === norm(b));
    chk(`${l.n}.low`, l.lo, g.lo === undefined ? undefined : g.lo, numEq); chk(`${l.n}.high`, l.hi, g.hi === undefined ? undefined : g.hi, numEq);
    chk(`${l.n}.name`, l.n, g.n, (a, b) => norm(a) === norm(b));
  });
  exp.meds.forEach(m => {
    const g = gm.find(x => norm(x.n) === norm(m.n)) || {};
    chk(`${m.n}.name`, m.n, g.n, (a, b) => norm(a) === norm(b)); chk(`${m.n}.dose`, m.dose, g.dose, (a, b) => norm(a) === norm(b));
    chk(`${m.n}.schedule`, m.freq, g.freq, (a, b) => norm(a) === norm(b)); chk(`${m.n}.days`, m.days, g.days, (a, b) => String(a) === String(b == null ? '' : b));
  });
  const extra = gl.filter(x => !exp.labs.some(l => norm(l.n) === norm(x.n))).length + gm.filter(x => !exp.meds.some(m => norm(m.n) === norm(x.n))).length;
  return { total, ok, extra, mistakes: bad };
}
// Did the system flag uncertainty for this document? (live API: any uncertain row or issue; parser: never)
const flagged = got => !!((got.issues && got.issues.length) || (got.labs || []).some(l => l.uncertain) || (got.meds || []).some(m => m.uncertain));
module.exports = { score, flagged };
