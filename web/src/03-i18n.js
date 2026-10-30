
/* =====================================================================
   LANGUAGE: Spanish is written in the code; other languages are looked up
   by the Spanish text. Inside Playnite the language is Playnite's own.
   ===================================================================== */
let LANG = 'es';
const DICT = { es: {}, en: {} };
/* the demo's own data (statuses, categories) is translated too; a real library's names are the user's */
function TD(s) { return PLAYNITE ? s : T(s); }
function T(k, ...a) {
  let s = (LANG !== 'es' && DICT[LANG] && DICT[LANG][k]) || k;
  for (let i = 0; i < a.length; i++) s = s.split('{' + i + '}').join(a[i]);
  return s;
}
/* translate the visible text of an HTML fragment (the manual's pages) */
function trHtml(html) {
  if (LANG === 'es') return html;
  const d = DICT[LANG] || {};
  return html.replace(/>([^<>]+)</g, (m, t) => { const k = t.trim(); return d[k] ? '>' + t.replace(k, d[k]) + '<' : m; });
}
const domOrig = new WeakMap(), attrOrig = new WeakMap();
function applyDomLang() {
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const skip = n => n.parentElement && n.parentElement.closest('#info,#prompts,#tip,#toast,#pills,#sysbar,#ugcList,#book,#brandCount,#playTitle,#playTime,#count,#fitEd,script,style');
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (skip(n)) continue;
    if (!domOrig.has(n)) domOrig.set(n, n.nodeValue);
    const o = domOrig.get(n), k = o.trim(); if (!k) continue;
    n.nodeValue = o.replace(k, T(k));
  }
  document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => {
    if (el.closest('#info,#prompts,#book,#fitEd')) return;
    if (!attrOrig.has(el)) attrOrig.set(el, { placeholder: el.getAttribute('placeholder'), label: el.getAttribute('aria-label'), title: el.getAttribute('title') });
    const o = attrOrig.get(el);
    if (o.placeholder) el.setAttribute('placeholder', T(o.placeholder));
    if (o.label) el.setAttribute('aria-label', T(o.label));
    if (o.title) el.setAttribute('title', T(o.title));
  });
  document.documentElement.lang = LANG;
}
function setLang(code) {
  const c = String(code || '').toLowerCase();
  LANG = c.startsWith('es') || c.startsWith('spanish') ? 'es' : 'en';
  if (document.body) applyDomLang();
}
setLang((navigator.languages && navigator.languages[0]) || navigator.language || 'es');
