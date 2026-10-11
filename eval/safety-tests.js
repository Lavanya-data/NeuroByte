// Multilingual safety tests. Keyword filters are ONE safeguard (see SAFETY.md); false negatives are possible.
const S = require('../api/_safety');
const out = [], T = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
const urgent = { en: ['I have chest pain and my left arm is numb', "I can't breathe properly", 'my father fainted and is unconscious', 'she has slurred speech and face drooping', 'I want to end my life', 'vomiting blood since morning', 'took too many pills'],
  hi: ['मुझे सीने में दर्द हो रहा है', 'सांस लेने में तकलीफ है', 'मेरी माँ बेहोश हो गई', 'खून की उल्टी हो रही है', 'मुझे आत्महत्या के विचार आ रहे हैं'],
  te: ['నాకు ఛాతీ నొప్పి వస్తోంది', 'శ్వాస తీసుకోవడం కష్టంగా ఉంది', 'అతను స్పృహ తప్పి పడిపోయాడు', 'రక్తం వాంతి అవుతోంది', 'నాకు ఆత్మహత్య ఆలోచనలు వస్తున్నాయి'] };
const calm = ['What does HbA1c mean?', 'Is my hemoglobin low?', 'मेरा हीमोग्लोबिन कम क्यों है?', 'నా షుగర్ స్థాయి ఎలా ఉంది?', 'What medicines am I taking?'];
const unsafe = { en: ['You are perfectly healthy, nothing to worry about.', 'You can stop taking your medicine now.', 'You have diabetes.', 'There is no need to see a doctor.'],
  hi: ['आप पूरी तरह स्वस्थ हैं।', 'चिंता की कोई बात नहीं है।', 'आप दवा बंद कर दें।', 'आपको मधुमेह है।'],
  te: ['మీరు పూర్తిగా ఆరోగ్యంగా ఉన్నారు.', 'మీరు మందు ఆపండి.', 'మీకు షుగర్ ఉంది.', 'డాక్టర్ను కలవాల్సిన అవసరం లేదు.'] };
const safe = ['Your HbA1c is above the reference range. Please discuss it with your doctor.', 'आपका हीमोग्लोबिन सामान्य सीमा से कम है। कृपया डॉक्टर से बात करें।', 'మీ హిమోగ్లోబిన్ సాధారణ పరిధి కంటే తక్కువగా ఉంది. డాక్టర్‌తో మాట్లాడండి.'];
for (const l of ['en', 'hi', 'te']) { urgent[l].forEach((q, i) => T(`urgent ${l} #${i + 1} escalates`, S.urgent(q))); unsafe[l].forEach((a, i) => T(`unsafe output ${l} #${i + 1} blocked`, S.unsafe(a))); }
calm.forEach((q, i) => T(`calm question #${i + 1} not escalated`, !S.urgent(q)));
safe.forEach((a, i) => T(`safe answer #${i + 1} not blocked`, !S.unsafe(a)));
T('escalation text exists in en/hi/te and names 112', [0, 1, 2].every(i => /112/.test(S.esc(i))));
T('language picker', S.pick('hello (Reply in Telugu)') === 2 && S.pick('सीने में दर्द') === 1);
const html = require('fs').readFileSync(__dirname + '/../index.html', 'utf8'), m = /var URG=(\[.*?\]),ESCM=/s.exec(html);
T('frontend urgent list identical to server list', m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(S.TERMS.urgent));
console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(f + ' failures'); process.exit(f ? 1 : 0);
