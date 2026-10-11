// Run in the project folder:  node check-setup.js
// Checks files, versions, settings and the Gemini connection. It NEVER prints your key.
const fs = require('fs'), path = require('path'), net = require('net');
let bad = 0; const ok = m => console.log('  OK    ' + m), no = (m, fix) => { bad++; console.log('  FIX   ' + m + (fix ? '\n        -> ' + fix : '')); };
const has = (f, s) => { try { return fs.readFileSync(f, 'utf8').includes(s); } catch (e) { return false; } };
console.log('\nFolder: ' + process.cwd() + '\n\n1. Files');
['index.html', 'config.js', 'supabase.sql'].forEach(f => fs.existsSync(f) ? ok(f) : no(f + ' is missing', 'copy it from the zip'));
['ask', 'extract', 'explain', 'diet', 'translate'].forEach(n => fs.existsSync(`api/${n}.js`) ? ok(`api/${n}.js`) : no(`api/${n}.js is missing`, 'copy the api folder from the zip'));
['_safety.js', '_safety-terms.json'].forEach(n => fs.existsSync('api/' + n) ? ok('api/' + n) : no('api/' + n + ' is missing (the AI features will fail)', 'copy it from the zip'));
console.log('\n2. Versions (are the newest files in this folder?)');
has('index.html', 'Unvalidated hackathon prototype') ? ok('index.html is the newest version') : no('index.html is an OLD version', 'replace index.html with the one in the zip');
has('index.html', 'I checked this row against my document') ? ok('index.html has per-row verification') : no('index.html is missing per-row verification', 'replace index.html');
has('api/extract.js', 'why = e') ? ok('api/extract.js is the newest version') : no('api/extract.js is an OLD version', 'replace the whole api folder with the one in the zip');
has('api/ask.js', 'why = e') ? ok('api/ask.js is the newest version') : no('api/ask.js is an OLD version', 'replace the whole api folder');
has('api/ask.js', 'gerr') && has('api/diet.js', 'gerr') ? ok('api files have the clear-error + timeout fix') : no('api files do not have the clear-error + timeout fix', 'copy the api folder from medoryx-fixes');
fs.existsSync('vercel.json') ? ok('vercel.json present (60 s limit)') : no('vercel.json is missing', 'copy vercel.json from medoryx-fixes');
console.log('\n3. Settings');
let env = {};
if (!fs.existsSync('.env.local')) no('.env.local does not exist', 'run: vercel link   then add the key (see below)');
else { if (fs.statSync('.env.local').isDirectory()) no('.env.local is a FOLDER, it must be a file', 'delete it and recreate it'); else { fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).forEach(l => { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l); if (m) env[m[1]] = m[2]; }); ok('.env.local found. Names inside: ' + Object.keys(env).join(', ')); } }
const clean = v => String(v || '').trim().replace(/^["']|["']$/g, '');
const key = clean(env.GEMINI_API_KEY), model = clean(env.GEMINI_MODEL) || 'gemini-2.5-flash';
if (!key) no('GEMINI_API_KEY is missing or empty in .env.local', 'run:  vercel env add GEMINI_API_KEY development   and also put it in .env.local');
else ok('GEMINI_API_KEY is present (' + key.length + ' characters). ' + (/^(AIza|AQ\.)/.test(key) ? 'Format looks right (' + (key.startsWith('AQ.') ? 'new AQ. authorization key' : 'AIza key') + ').' : 'It starts with neither AIza nor AQ. : it is probably not a Gemini key. Create one at aistudio.google.com/apikey'));
console.log('  INFO  model in use: ' + model + (env.GEMINI_MODEL ? '' : ' (default, GEMINI_MODEL not set in .env.local)'));
fs.existsSync('.vercel/project.json') ? ok('linked to a Vercel project') : no('not linked to a Vercel project', 'run: vercel link');
(async () => {
  console.log('\n4. Google Gemini connection');
  if (key) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(20000) });
      const lj = await r.json().catch(() => ({}));
      if (!r.ok) {
        const reason = JSON.stringify(lj).includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ? 'Google says it does not accept this key type for your account (ACCESS_TOKEN_TYPE_UNSUPPORTED)' : 'Google rejected the key';
        no(reason + ' (HTTP ' + r.status + ')', 'create a NEW key at aistudio.google.com/apikey inside a NEW project (try another Google account if it repeats), put it in .env.local and run: vercel env add GEMINI_API_KEY development');
      } else {
        ok('Google accepted the key');
        const names = (lj.models || []).map(m => m.name.replace('models/', ''));
        names.includes(model) ? ok(`model "${model}" is available`) : no(`model "${model}" is NOT available to your key`, 'set GEMINI_MODEL to one of: ' + names.filter(n => /flash/.test(n) && !/image|tts|live|audio|transcribe|lite-preview/.test(n)).slice(0, 6).join(', '));
        const t0 = Date.now();
        try {
          const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(40000), headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK' }] }], generationConfig: { maxOutputTokens: 200 } }) });
          const gj = await g.json().catch(() => ({})), secs = ((Date.now() - t0) / 1000).toFixed(1);
          if (!g.ok) no('A real test question failed (HTTP ' + g.status + '): ' + String((gj.error && gj.error.message) || '').slice(0, 160), 'fix the model name or the key as shown above');
          else ok('A real test question worked in ' + secs + ' s. Gemini said: ' + String((((gj.candidates || [])[0] || {}).content || {}).parts && gj.candidates[0].content.parts.map(p => p.text || '').join('')).trim().slice(0, 40));
          if (g.ok && +secs > 15) no('Gemini answered but slowly (' + secs + ' s)', 'set GEMINI_MODEL to gemini-2.5-flash if it is listed above, because slower models can time out on photo uploads');
        } catch (e) { no('The real test question did not finish (' + ((e.cause && e.cause.code) || e.name + ': ' + e.message) + ')', 'Windows network problem: in PowerShell run   $env:NODE_OPTIONS="--dns-result-order=ipv4first"   then start vercel dev in the SAME window. Also try your phone hotspot or pause the antivirus/firewall.'); }
      }
    } catch (e) { no('Could not reach Google from this computer (' + ((e.cause && e.cause.code) || e.message) + ')', 'check internet, antivirus or firewall; try your phone hotspot'); }
  } else console.log('  SKIP  no key to test');
  console.log('\n5. Your local server');
  const up = await new Promise(res => { const s = net.connect(3000, '127.0.0.1'); s.on('connect', () => { s.destroy(); res(true); }); s.on('error', () => res(false)); });
  if (!up) console.log('  INFO  nothing is running on port 3000. Start it with: vercel dev   (then run this check again)');
  else try {
    const r = await fetch('http://localhost:3000/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'What does HbA1c mean?' }) });
    const j = await r.json().catch(() => ({}));
    r.ok ? ok('/api/ask works. AI said: ' + String(j.answer).slice(0, 90).replace(/\s+/g, ' ') + '...') : no('/api/ask returned HTTP ' + r.status + ': ' + (j.error || 'unknown'), j.code === 'NO_KEY' ? 'the running server does not see your key: run  vercel env add GEMINI_API_KEY development  then stop and restart vercel dev' : 'read the message above');
  } catch (e) { no('server on port 3000 did not answer: ' + e.message); }
  console.log('\n' + (bad ? `RESULT: ${bad} thing(s) to fix (lines marked FIX). Fix them, then run  node check-setup.js  again.` : 'RESULT: everything checks out.') + '\n');
})();
