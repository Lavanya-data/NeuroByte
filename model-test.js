// Run in the Medoryx folder:  node model-test.js
// Tests which Gemini models answer fast with YOUR key. It never prints the key.
const fs = require('fs');
const env = {};
try { fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).forEach(function (line) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); }); } catch (e) { console.log('Cannot read .env.local. Run this from the Medoryx folder.'); process.exit(1); }
const key = env.GEMINI_API_KEY;
if (!key) { console.log('GEMINI_API_KEY is missing in .env.local'); process.exit(1); }
const LIMIT_SECONDS = 30;

async function testModel(model) {
  const start = Date.now();
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      signal: AbortSignal.timeout(LIMIT_SECONDS * 1000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK' }] }], generationConfig: { maxOutputTokens: 200 } })
    });
    const j = await r.json().catch(function () { return {}; });
    const secs = (Date.now() - start) / 1000;
    if (!r.ok) return { model: model, secs: secs, ok: false, note: 'HTTP ' + r.status + ' ' + String((j.error && j.error.message) || '').slice(0, 90) };
    return { model: model, secs: secs, ok: true, note: 'worked' };
  } catch (e) {
    return { model: model, secs: (Date.now() - start) / 1000, ok: false, note: 'no answer in ' + LIMIT_SECONDS + ' s' };
  }
}

(async function () {
  let j;
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { signal: AbortSignal.timeout(20000), headers: { 'x-goog-api-key': key } });
    j = await r.json();
    if (!r.ok) { console.log('Google rejected the key (HTTP ' + r.status + '). Create a NEW key at aistudio.google.com/apikey'); return; }
  } catch (e) { console.log('Could not reach Google: ' + ((e.cause && e.cause.code) || e.message)); return; }
  const skip = /image|tts|live|audio|embed|robotics|computer|transcribe|native|vision|learnlm/;
  const names = (j.models || []).map(function (m) { return m.name.replace('models/', ''); })
    .filter(function (n) { return /flash/.test(n) && !skip.test(n); });
  const wanted = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
  const list = wanted.filter(function (n) { return names.indexOf(n) >= 0; });
  names.forEach(function (n) { if (list.length < 8 && list.indexOf(n) < 0) list.push(n); });
  console.log('\nTesting ' + list.length + ' models at the same time (up to ' + LIMIT_SECONDS + ' seconds)...\n');
  const results = await Promise.all(list.map(testModel));
  results.sort(function (a, b) { return (b.ok - a.ok) || (a.secs - b.secs); });
  results.forEach(function (x) { console.log((x.ok ? '  OK   ' : '  FAIL ') + x.model.padEnd(36) + x.secs.toFixed(1).padStart(5) + ' s   ' + x.note); });
  const best = results.find(function (x) { return x.ok; });
  console.log('');
  if (best) console.log('USE THIS ONE:  GEMINI_MODEL=' + best.model + '   (answered in ' + best.secs.toFixed(1) + ' s)');
  else console.log('NO model answered. The key itself is the problem. Create a NEW key in a NEW project at aistudio.google.com/apikey (try another Google account if needed).');
  console.log('');
})();
