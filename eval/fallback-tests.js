// Run:  node eval/fallback-tests.js     (no internet or API key needed: Google is mocked)
process.env.GEMINI_API_KEY = 'AQ.fake';
process.env.GEMINI_MODEL = 'gemini-3.5-flash';
delete process.env.GEMINI_FALLBACK_MODELS;
let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + JSON.stringify(extra))); };
let calls = [], plan = [], consumed = 0, text = '{}';
global.fetch = async url => {
  const model = /models\/([^:]+):/.exec(url)[1]; calls.push(model);
  const status = plan.length ? plan.shift() : 200;
  const body = status === 200 ? { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }
    : { error: { status: status === 429 ? 'RESOURCE_EXHAUSTED' : status === 503 ? 'UNAVAILABLE' : 'UNAUTHENTICATED', message: 'mock ' + status } };
  return { ok: status === 200, status, json: async () => body, arrayBuffer: async () => { consumed++; return new ArrayBuffer(0); } };
};
const mk = () => ({ c: 0, b: null, status(c) { this.c = c; return this; }, json(b) { this.b = b; return this; } });
const run = async (file, body) => { calls = []; consumed = 0; const r = mk(); await require('../api/' + file + '.js')({ method: 'POST', body }, r); return r; };
const PNG = Buffer.from('x').toString('base64');
(async () => {
  const { modelList } = require('../api/_gemini.js');
  check('model order: your choice first, then 3 backups', modelList().join() === 'gemini-3.5-flash,gemini-3-flash-preview,gemini-3.1-flash-lite,gemini-flash-lite-latest', modelList());
  process.env.GEMINI_MODEL = 'gemini-3.1-flash-lite'; check('no duplicate when your choice is also a backup', modelList().filter(m => m === 'gemini-3.1-flash-lite').length === 1);
  process.env.GEMINI_MODEL = 'gemini-3.5-flash';

  text = 'A short calm answer. Please confirm with your doctor.';
  plan = []; let r = await run('ask', { question: 'What is hemoglobin?' });
  check('ask: healthy first model = exactly 1 call', r.c === 200 && calls.length === 1 && calls[0] === 'gemini-3.5-flash', calls);
  plan = [429]; r = await run('ask', { question: 'What is hemoglobin?' });
  check('ask: 429 on first model -> second model answers', r.c === 200 && calls.join() === 'gemini-3.5-flash,gemini-3-flash-preview', calls);
  check('ask: the failed attempt body was released', consumed === 1, consumed);
  plan = [429, 503]; r = await run('ask', { question: 'What is hemoglobin?' });
  check('ask: 429 then 503 -> third model answers', r.c === 200 && calls.length === 3, calls);
  plan = [429, 429, 429, 429]; r = await run('ask', { question: 'What is hemoglobin?' });
  check('ask: every model out of quota -> clear 502 with the real reason, after trying all 4', r.c === 502 && /RESOURCE_EXHAUSTED/.test(r.b.error) && calls.length === 4, [r.c, r.b, calls]);
  plan = [401]; r = await run('ask', { question: 'What is hemoglobin?' });
  check('ask: bad key (401) does NOT fall back', r.c === 502 && calls.length === 1 && /UNAUTHENTICATED/.test(r.b.error), [r.c, calls]);

  text = JSON.stringify({ type: 'Lab report', date: '2026-03-12', dx: '', doctor: '', follow: '', labs: [{ n: 'Hemoglobin', v: 11.2, u: 'g/dL', lo: 12, hi: 15.5, src: 'Hemoglobin 11.2 g/dL', uncertain: false }], meds: [] });
  plan = [429]; r = await run('extract', { data: PNG, mediaType: 'image/png' });
  check('extract: quota hit on first model -> still reads the document', r.c === 200 && r.b.labs[0].v === 11.2 && calls.length === 2, [r.c, calls]);
  check('extract: result still requires user verification', r.b.verifyRequired === true);

  text = JSON.stringify({ summary: 's', items: { Hemoglobin: 'x' } });
  plan = [429]; r = await run('explain', { labs: [{ n: 'Hemoglobin', v: 11.2, u: 'g/dL', lo: 12, hi: 15.5 }], lang: 'Telugu' });
  check('explain: falls back', r.c === 200 && calls.length === 2, [r.c, calls]);
  text = JSON.stringify({ summary: 's', eat: ['dal'], limit: [], avoid: [], medicineNotes: [], tips: [] });
  text = JSON.stringify(['a']);
  plan = [429]; r = await run('translate', { lang: 'Telugu', texts: ['Hello'] });
  check('translate: falls back', r.c === 200 && calls.length === 2, [r.c, calls]);
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed'); process.exit(fails ? 1 : 0);
})();
