// Shared safety layer: ONE safeguard among several (see SAFETY.md). Keyword lists are not exhaustive.
const T = require('./_safety-terms.json');
const U = T.urgent.map(s => new RegExp(s, 'iu')), X = T.unsafe.map(s => new RegExp(s, 'iu'));
const pick = t => { const m = /Reply in (Hindi|Telugu)/.exec(t || ''); if (m) return m[1] === 'Hindi' ? 1 : 2; return /[\u0C00-\u0C7F]/.test(t || '') ? 2 : /[\u0900-\u097F]/.test(t || '') ? 1 : 0; };
module.exports = { urgent: t => U.some(r => r.test(String(t || ''))), unsafe: t => X.some(r => r.test(String(t || ''))), esc: i => T.esc[i], safe: i => T.safe[i], pick, TERMS: T };
