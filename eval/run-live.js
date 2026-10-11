// Runs every document through the REAL /api/extract and writes eval/results-live.json
// Usage (server running with GEMINI_API_KEY):  node eval/run-live.js [http://localhost:3000]
const fs = require('fs'), path = require('path'), { score, flagged } = require('./score');
const base = process.argv[2] || 'http://localhost:3000', gt = JSON.parse(fs.readFileSync(path.join(__dirname, 'ground_truth.json'), 'utf8'));
const mime = f => (f.endsWith('.pdf') ? 'application/pdf' : f.endsWith('.png') ? 'image/png' : 'image/jpeg');
(async () => {
  const out = [];
  for (const g of gt) {
    if (!g.file) { out.push({ id: g.id, kind: g.kind, skipped: 'no image: add a real document' }); continue; }
    const data = fs.readFileSync(path.join(__dirname, g.file)).toString('base64');
    let r; try { const res = await fetch(base + '/api/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data, mediaType: mime(g.file) }) }); r = { status: res.status, body: await res.json() }; } catch (e) { r = { status: 0, body: { error: String(e) } }; }
    if (r.status !== 200) { out.push({ id: g.id, kind: g.kind, error: r.body.error, code: r.body.code }); continue; }
    const s = score(g.expect, r.body); out.push({ id: g.id, kind: g.kind, ...s, flagged: flagged(r.body), expectFlag: g.expectFlag });
    console.log(g.id, `${s.ok}/${s.total}`, flagged(r.body) ? 'flagged' : '');
  }
  fs.writeFileSync(path.join(__dirname, 'results-live.json'), JSON.stringify(out, null, 1)); console.log('wrote eval/results-live.json');
})();
