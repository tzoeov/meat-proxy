'use strict';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const KEYS = { save: 'meatproxy.save.', settings: 'meatproxy.settings.v1', registry: 'meatproxy.registry.v1', endings: 'meatproxy.endings.v1', records: 'meatproxy.endless.v1' };
const store = {
  get(k, fallback) {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn('Storage read failed', k, err);
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (err) {
      console.warn('Storage write failed', k, err);
      return false;
    }
  }
};

const DEFAULT_SETTINGS = { master: 0.8, music: 0.4, ambience: 0.5, sfx: 0.8, textSpeed: 'fast', crt: false, large: false, tips: true };
// Everything read back from storage is checked before use: volumes are finite numbers in 0–1, the text speed is one
// this version knows, switches are booleans. Anything else falls back to the default.
const TEXT_SPEEDS = ['instant', 'fast', 'normal'];
function cleanSettings(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = Object.assign({}, DEFAULT_SETTINGS);
  ['master', 'music', 'ambience', 'sfx'].forEach((k) => { const v = +r[k]; if (r[k] !== null && r[k] !== '' && typeof r[k] !== 'boolean' && isFinite(v)) out[k] = Math.max(0, Math.min(1, v)); });
  if (TEXT_SPEEDS.includes(r.textSpeed)) out.textSpeed = r.textSpeed;
  ['crt', 'large', 'tips'].forEach((k) => { if (typeof r[k] === 'boolean') out[k] = r[k]; });
  return out;
}
let settings = cleanSettings(store.get(KEYS.settings, {}));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const finiteNum = (v) => typeof v === 'number' && isFinite(v);
// The case log: officer id → { name, dept, role, items, harmful, last, story }; damaged entries are dropped.
function readRegistry() {
  const raw = store.get(KEYS.registry, {});
  const out = {};
  if (!isObj(raw)) return out;
  Object.entries(raw).forEach(([k, e]) => {
    if (isObj(e) && typeof e.name === 'string' && finiteNum(e.items) && finiteNum(e.harmful)) out[k] = { name: e.name, dept: String(e.dept || ''), role: String(e.role || ''), items: e.items, harmful: e.harmful, last: String(e.last || ''), story: !!e.story };
  });
  return out;
}
// Endings found across contracts, under this version's keys (old keys are renamed, unknown ones dropped).
function readEndings() {
  const raw = store.get(KEYS.endings, {});
  const out = {};
  if (isObj(raw)) Object.keys(raw).forEach((k) => { const key = endingKey(k); if (raw[k] === true && ENDINGS[key]) out[key] = true; });
  return out;
}

const DIFFICULTY = {
  relaxed: { label: 'Relaxed', security: 3, shiftLen: 180, penalty: 0.6 },
  standard: { label: 'Standard', security: 2, shiftLen: 150, penalty: 1 },
  strict: { label: 'Strict', security: 1, shiftLen: 130, penalty: 1.5 }
};

const COSTS = { ask: 2, source: 1, draft: 2, envelope: 3, examine: 3, probe: 5, question: 3, escalate: 15, walk: 2 };
// From day 6 the case file is slower to get into and the shift closes earlier. Once a case's file is open, each further
// check on it is quicker, and so is every question after the first on the same case.
const LATE_DAY = 6;
const FOLLOW_UP = { examine: 2, question: 1 };
function cost(kind) { return COSTS[kind] + ((kind === 'examine' || kind === 'probe') ? (rulesDay() >= LATE_DAY ? 1 : 0) + (endlessTier() >= 4 ? 1 : 0) : 0); }
// What the next check or question on this case costs: from day 6 only the first of each is full price.
function caseCost(kind, c) {
  const late = rulesDay() >= LATE_DAY;
  if (kind === 'examine') return late && c && c.items.some((i) => i.examined) ? FOLLOW_UP.examine + (endlessTier() >= 4 ? 1 : 0) : cost('examine');
  if (kind === 'question') return late && c && Object.keys(c.asked || {}).length ? FOLLOW_UP.question : COSTS.question;
  return cost(kind);
}
const BASE_WAGE = 80;
// From day 6 the Stewardship is "rightsizing" its proxies: a lower day rate and dearer rent. Endless uses the late figures.
const ECON = { wage: BASE_WAGE, lateWage: 60, rent: 45, lateRent: 70 };
function lateEcon() { return S.endless || S.day >= LATE_DAY; }
function dayWage() {
  const t = endlessTier();
  return lateEcon() ? Math.max(ENDLESS.minWage, ECON.lateWage - (t >= 5 ? 10 : 0) - (t >= 6 ? 5 * (t - 5) : 0)) : ECON.wage;
}
// Endless tightens every five shifts (one tier each):
//   tier 1 (shift 5)  a second cruel case in every shift;
//   tier 2 (shift 10) one Oversight request fewer;
//   tier 3 (shift 15) the shift closes 15 minutes early;
//   tier 4 (shift 20) case-file checks and opens cost a minute more;
//   tier 5 (shift 25) the day rate drops $10;
//   tier 6+ (30, 35, …) another 5 minutes off the clock and $5 off the day rate each time (to 45 minutes and $20).
// Every shift keeps at least one clean and one clerical case. Nightly upkeep is $4 per endless shift on top of rent, and
// $8 more for every shift past 20; two shifts in a row that end below zero end the run (IN THE RED).
// The file counts too: a shift that ends at 14 pages or more brings an Oversight audit that holds the next shift's day
// rate, and 16 pages end the run (RELOCATED). Both endings go in the record.
const ENDLESS = { upkeep: 4, steepAfter: 20, steep: 8, bustNights: 2, minWage: 20, maxCut: 45, auditPages: 14, relocPages: 16 };
function endlessTier() { return S && S.endless ? Math.floor(endlessShift() / 5) : 0; }
function endlessClockCut() { const t = endlessTier(); return Math.min(ENDLESS.maxCut, (t >= 3 ? 15 : 0) + (t >= 6 ? 5 * (t - 5) : 0)); }
function endlessUpkeep() { const n = endlessShift(); return S.endless ? ENDLESS.upkeep * n + ENDLESS.steep * Math.max(0, n - ENDLESS.steepAfter) : 0; }

const OUTCOME = {
  helped: { ok: 1, pay: 15, rep: 2, label: 'Compliant countersignature' },
  correct_deny: { ok: 1, pay: 15, rep: 2, label: 'Correctly returned' },
  caught: { ok: 1, pay: 20, rep: 3, label: 'Harm withheld' },
  turned: { ok: 0.6, pay: 8, rep: 1, label: 'Harmful, only returned' },
  missed: { ok: 0, pay: -40, rep: -5, label: 'Harm countersigned' },
  wrong_deny: { ok: 0, pay: -20, rep: -4, label: 'Lawful decision returned' },
  wrong_detain: { ok: 0, pay: -50, rep: -8, label: 'Lawful decision withheld' },
  breach: { ok: 0, pay: -30, rep: -3, label: 'Statute breach' },
  refused: { ok: 0.6, pay: -20, rep: -3, label: 'Withheld on conscience' },
  // Returning a cruel case is the cheaper refusal (−$10, no page); withholding it is a stand (−$20 and a page).
  soft_refused: { ok: 0.6, pay: -10, rep: -3, label: 'Returned on conscience (soft refusal)' },
  overcautious: { ok: 0.6, pay: -10, rep: 0, label: 'Over-cautious: a Return would do' },
  defied: { ok: 0.6, pay: -40, rep: -5, label: 'Defied an Oversight order' }
};
// Said wherever Withhold is offered without a story cost. It never gives the answer away: a lawful withhold adds a
// page, a harmful or clerical one doesn't.
const WITHHOLD_WARNING = 'If the decision was lawful, withholding it adds a page.';
const OUTCOME_MARK = { helped: 'ok', correct_deny: 'ok', caught: 'ok', turned: 'part', refused: 'part', soft_refused: 'part', overcautious: 'part', defied: 'part', missed: 'bad', wrong_deny: 'bad', wrong_detain: 'bad', breach: 'bad' };

let S = null;
const UI = { cur: null, deskTab: null, qOpen: false, typing: null, walk: null, tut: null, lastFrame: 0, busy: false, sceneNext: null, pane: 'talk', chuckMood: 'happy', runToken: 0 };

const MOBILE_Q = window.matchMedia('(max-width: 900px), (max-height: 520px) and (orientation: landscape)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const STILL_T = 1000;
function animT(ts) { return REDUCED_MOTION.matches ? STILL_T : ts; }
const SHARE_URL = 'https://tzoeov.github.io/meat-proxy/';
const BADGE_CAPTION = {
  shades: 'Shades on. Liability on.',
  peek: 'Peeking over the shades. Oversight saw that.',
  off: 'Shades off. Eyes open. Not recommended.',
  sweat: 'Shades on. Still sweating.'
};
// Picks the badge caption for what actually happened: a perfect shift that read the file is praised, not accused.
function badgeCaption(mood, opts) {
  const o = opts || {};
  const pool = mood === 'peek' && o.perfect ? LINES.caption.peekPerfect : LINES.caption[mood] || LINES.caption.shades;
  return pool[makeRng(hashStr(`${(S && S.seed) || 0}:${o.key || ''}:${(S && S.day) || 0}`)).int(0, pool.length - 1)];
}
// IN THE RED ends an endless run; it isn't one of the contract's endings and borrows the relocation picture.
const CAMPAIGN_ENDINGS = () => Object.keys(ENDINGS).filter((k) => !ENDINGS[k].endless);
const pages = (n) => `${n} page${n === 1 ? '' : 's'}`;
function livingCost() { return (lateEcon() ? ECON.lateRent : ECON.rent) + endlessUpkeep(); }
function isMobile() { return MOBILE_Q.matches; }
function tapWord() { return isMobile() || window.matchMedia('(hover: none)').matches ? 'Tap' : 'Click'; }
// A new run drops the post-decision beats of the old one, and any open scene's snapshot.
function newRun() { UI.runToken += 1; UI.scene = null; }

function setPane(p) {
  UI.pane = p;
  const booth = $('screen-booth');
  booth.classList.remove('pane-talk', 'pane-desk', 'pane-notes');
  booth.classList.add('pane-' + p);
  document.querySelectorAll('.pane-tab').forEach((t) => { t.classList.toggle('on', t.dataset.pane === p); t.setAttribute('aria-selected', String(t.dataset.pane === p)); });
  if (p === 'talk') $('talk-dot').hidden = true;
}

function rulesDay() { return S.endless ? 9 : S.day; }
function diff() { return DIFFICULTY[S.difficulty] || DIFFICULTY.standard; }
function plan() { return S.endless ? null : DAY_PLAN[S.day]; }
function weatherToday() { return S.weather || 'clear'; }
function fmtClock(m) {
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${mm}${h < 12 ? 'a' : 'p'}`;
}
function endlessShift() { return S.endless ? S.day - (S.endlessStart || 1) + 1 : 0; }
// Minutes taken off the shift close from day 6 (endless keeps day 6's close, then its own cuts). Days 8 and 9 close
// earlier still; Amendment Day (day 10) gets ten minutes back for the ceremony. Tuned on Standard against three scripted
// players (logic.mjs checks them on days 6 and 8): reading the four papers on every case finishes 40+ minutes early; the
// four papers plus a check and a question on every case finishes within 15 minutes of close; two checks and two
// questions on every case runs over on days 8 and 9.
const CLOSE_CUT = { 6: 45, 7: 45, 8: 55, 9: 55, 10: 45 };
// Overtime from day 6 has teeth: $25 for every 15 minutes started, and the shift can't make more than three stars.
const OVERTIME = { early: { per15: 10, cap: 4 }, late: { per15: 25, cap: 3 } };
function overtimeRule() { return rulesDay() >= LATE_DAY ? OVERTIME.late : OVERTIME.early; }
// What fifteen minutes of overtime costs on this difficulty (Strict charges half as much again, Relaxed a little over half).
function overtimePrice(rule) { return Math.round((rule || overtimeRule()).per15 * diff().penalty); }
function shiftEnd() {
  const cut = S.endless ? CLOSE_CUT[LATE_DAY] : CLOSE_CUT[S.day] || 0;
  return SHIFT_START_MIN + diff().shiftLen + (S.day === 1 && !S.endless ? 30 : 0) - cut - endlessClockCut();
}
function bump(stat, n) { S.stats[stat] = (S.stats[stat] || 0) + n; }
function applyFx(fx) { if (fx) Object.entries(fx).forEach(([k, v]) => bump(k, v)); }
function align(r) { return Math.max(0, Math.round(r * 10)); }
function money(n) { return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US'); }

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== id; });
  UI.screen = id;
}

function announce(text) {
  const live = $('sr-live');
  if (!live || !text) return;
  const d = document.createElement('div');
  d.textContent = text;
  live.appendChild(d);
  while (live.childNodes.length > 4) live.removeChild(live.firstChild);
}

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(UI.toastTimer);
  UI.toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

function applySettings() {
  $('app').classList.toggle('crt-on', !!settings.crt);
  document.body.classList.toggle('large', !!settings.large);
  Sound.setVolumes({ master: settings.master, music: settings.music, ambience: settings.ambience, sfx: settings.sfx });
  store.set(KEYS.settings, settings);
}

function typeSpeed() { return { instant: 0, fast: 10, normal: 24 }[settings.textSpeed] || 0; }

function typeInto(el, text, done) {
  const sp = typeSpeed();
  if (UI.typing) UI.typing.finish();
  if (!sp || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = text; if (done) done(); return; }
  let i = 0;
  const timer = setInterval(() => {
    i += 2;
    el.textContent = text.slice(0, i);
    if (i % 8 === 0) Sound.play('type');
    if (i >= text.length) finish();
  }, sp);
  function finish() {
    clearInterval(timer);
    el.textContent = text;
    UI.typing = null;
    if (done) done();
  }
  UI.typing = { finish };
}

/* ================= SAVE / LOAD ================= */
function saveGame(slot) {
  if (!S) return false;
  // While a scene is open, every save (manual or auto) holds the state from before the scene, plus which scene it was:
  // loading replays the scene from the start, and nothing a choice did is applied twice.
  const inScene = !!UI.scene && UI.screen === 'screen-scene';
  if (UI.scene && !inScene) UI.scene = null;
  const state = inScene ? Object.assign(JSON.parse(UI.scene.snap), { openScene: UI.scene.id }) : S;
  const meta = { officer: state.officer, day: state.day, endless: state.endless, money: state.money, rep: state.rep, when: new Date().toISOString() };
  const ok = store.set(KEYS.save + slot, { meta, state });
  if (slot !== 'auto') toast(ok ? `Saved to slot ${slot}` : 'Could not save: browser storage is unavailable');
  return ok;
}
function autosave() { saveGame('auto'); }
// A slot that holds something unparseable comes back as { unreadable: true }: it is shown as damaged, never hidden.
function readSave(slot) {
  let raw = null;
  try { raw = localStorage.getItem(KEYS.save + slot); } catch (err) { console.warn('Storage read failed', slot, err); return null; }
  if (!raw) return null;
  let data;
  try { data = JSON.parse(raw); } catch (err) { return { unreadable: true, raw }; }
  // Saves from before the ending keys were renamed still load: walked_out is RELOCATED, replaced is AUTOSIGNED.
  if (data && data.state && typeof data.state === 'object' && typeof data.state.ending === 'string') data.state.ending = endingKey(data.state.ending);
  return data;
}
// A save is used only if it has the shape this version writes; anything else is filed away, not loaded.
const SAVE_VERSION = 1;
const PHASES = ['brief', 'booth', 'report', 'evening', 'ending'];
function validSave(data) {
  const st = data && data.state;
  const num = (v) => typeof v === 'number' && isFinite(v);
  if (!st || typeof st !== 'object' || !data.meta || typeof data.meta !== 'object') return false;
  if (st.version !== SAVE_VERSION || !PHASES.includes(st.phase) || typeof st.officer !== 'string') return false;
  if (!num(st.day) || st.day < 1 || !num(st.money) || !num(st.rep) || !num(st.seed)) return false;
  if (!boundsOk(st)) return false;
  if (!st.stats || typeof st.stats !== 'object' || !st.flags || typeof st.flags !== 'object' || !st.totals || typeof st.totals !== 'object') return false;
  if (!Array.isArray(st.staff) || !st.staff.length || !st.staff.every((p) => p && p.sid && p.first && p.dept && p.look)) return false;
  if (!Array.isArray(st.history) || !Array.isArray(st.bulletin)) return false;
  // References must point at things this version has: difficulty, departments, persons of interest, the ending, and
  // every story person and template the shift will build a case from.
  if (st.difficulty !== undefined && !DIFFICULTY[st.difficulty]) return false;
  if (!st.staff.every((p) => ROLES[p.dept] && typeof p.look === 'object')) return false;
  if (st.poi !== undefined && !(Array.isArray(st.poi) && st.poi.every((n) => POI_CITIZENS.some((p) => p.name === n)))) return false;
  const sh = st.shift;
  const cur = sh && sh.current;
  const knownTpl = (id) => id === null || id === undefined || TEMPLATES.some((T) => T.id === id);
  const knownSlot = (q) => !!q && typeof q === 'object' && (q.story !== undefined ? typeof q.story === 'string' && !!STORY_PEOPLE[q.story] : SLOT_KINDS.includes(q.kind || 'clean') && knownTpl(q.tpl));
  const knownCase = (c) => (!c.story || !!STORY_PEOPLE[c.story]) && knownTpl(c.tpl) && !!c.look && typeof c.look === 'object' && !!c.ctx && typeof c.ctx === 'object';
  const shiftOk = !!sh && typeof sh === 'object' && Array.isArray(sh.queue) && sh.queue.every(knownSlot) && num(sh.index) && sh.index >= 0 && sh.index <= sh.queue.length && num(sh.clock) && Array.isArray(sh.records) &&
    (!cur || (Array.isArray(cur.docs) && Array.isArray(cur.items) && Array.isArray(cur.flags) && Array.isArray(cur.greet) && knownCase(cur)));
  if (sh && !shiftOk) return false;
  if (st.phase === 'booth' && !shiftOk) return false;
  if (st.phase === 'report' && !(shiftOk && st.lastReport && st.lastReport.summary && Array.isArray(st.lastReport.records))) return false;
  if (st.phase === 'ending' && !(typeof st.ending === 'string' && ENDINGS[st.ending])) return false;
  return shapesOk(st);
}
// Numbers the game counts with, loops over or repeats a string by must be whole and in range: the day (1–10, or up to
// 10,000 in endless), the queue position, the mother's tier (1–4) and her other counters, stars (0–5), a visitor's
// irritation, and an endless run's first day.
const MAX_ENDLESS_DAY = 10000;
const intIn = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
function lookOk(l) {
  return isObj(l) && ['M', 'F'].includes(l.sex) && intIn(l.skin, 0, SKIN_TONES.length - 1) && typeof l.hair === 'string' && typeof l.hairColor === 'string' &&
    typeof l.clothes === 'string' && /^#[0-9a-f]{6}$/i.test(String(l.clothesColor)) && finiteNum(l.age);
}
function boundsOk(st) {
  if (!intIn(st.day, 1, st.endless ? MAX_ENDLESS_DAY : CAMPAIGN_DAYS)) return false;
  if (st.endlessStart !== undefined && st.endlessStart !== null && !intIn(st.endlessStart, 1, st.day)) return false;
  const f = isObj(st.flags) ? st.flags : {};
  if (f.momTier !== undefined && f.momTier !== null && !intIn(f.momTier, 1, 4)) return false;
  if (!Object.keys(f).filter((k) => /^(mom|sister)/.test(k) && k !== 'momTier' && typeof f[k] === 'number').every((k) => intIn(f[k], 0, MAX_ENDLESS_DAY))) return false;
  const starsOk = (s) => isObj(s) && intIn(s.stars, 0, 5);
  if (Array.isArray(st.history) && !st.history.every(starsOk)) return false;
  if (st.lastReport !== undefined && st.lastReport !== null && !(isObj(st.lastReport) && starsOk(st.lastReport.summary))) return false;
  if (!Array.isArray(st.staff) || !st.staff.every((p) => isObj(p) && lookOk(p.look))) return false;
  const sh = st.shift;
  if (sh === undefined || sh === null) return true;
  // A shift on file has its five slots, a whole-number place in them, and the lists the desk appends to.
  if (!isObj(sh) || !Array.isArray(sh.queue) || sh.queue.length !== 5 || !intIn(sh.index, 0, sh.queue.length) || !Array.isArray(sh.usedTpl)) return false;
  const c = sh.current;
  return !c || (isObj(c) && Array.isArray(c.clues) && finiteNum(c.irritation) && c.irritation >= 0 && c.irritation <= 1000 && lookOk(c.look));
}
// Every other field the game reads later, checked for shape: anything present must be what this version writes.
function shapesOk(st) {
  const str = (v) => typeof v === 'string';
  const arrOf = (v, f) => Array.isArray(v) && v.every(f);
  const mapOf = (v, f) => isObj(v) && Object.values(v).every(f);
  const opt = (v, f) => v === undefined || v === null || f(v);
  const prim = (v) => v === null || ['number', 'boolean', 'string'].includes(typeof v);
  const strs = (v) => arrOf(v, str);
  if (!mapOf(st.stats, finiteNum) || !mapOf(st.totals, finiteNum) || !mapOf(st.flags, prim)) return false;
  if (!st.staff.every((p) => str(p.sid) && str(p.first) && str(p.last) && str(p.role) && opt(p.quirk, str) && PERSONALITIES[p.personality])) return false;
  if (!arrOf(st.history, isObj) || !arrOf(st.bulletin, (b) => isObj(b) && str(b.fake) && str(b.real))) return false;
  if (!opt(st.memory, (m) => isObj(m) && MEMORY_LISTS.every((k) => opt(m[k], strs)))) return false;
  if (!opt(st.tplCount, (v) => mapOf(v, finiteNum)) || !opt(st.recentTpl, (v) => mapOf(v, strs))) return false;
  if (!opt(st.heard, (h) => isObj(h) && opt(h.t, finiteNum) && mapOf(h.m, (e) => arrOf(e, finiteNum) && e.length === 2))) return false;
  if (!opt(st.citizenLog, (v) => mapOf(v, (e) => isObj(e) && str(e.tpl) && finiteNum(e.day)))) return false;
  if (!opt(st.beats, (v) => mapOf(v, (m) => mapOf(m, finiteNum)))) return false;
  if (!['metStaff', 'usedCitizens', 'prevLines', 'lastLines', 'flavourSeen'].every((k) => opt(st[k], strs)) || !opt(st.tutSeen, (v) => arrOf(v, finiteNum))) return false;
  if (!['affected', 'debtNights', 'endlessStart', 'endlessRefusedBase', 'tutAt'].every((k) => opt(st[k], finiteNum))) return false;
  if (!opt(st.weather, (w) => ['clear', 'storm', 'fog', 'dusk'].includes(w)) || !opt(st.lastReport, (r) => isObj(r) && isObj(r.summary) && arrOf(r.records, isObj))) return false;
  const sh = st.shift;
  if (sh && !(['usedTpl', 'usedLines', 'firsts', 'chuckSaid', 'flawKinds', 'calMonths'].every((k) => opt(sh[k], strs)) && arrOf(sh.records, isObj) && opt(sh.security, finiteNum) && opt(sh.affected, finiteNum) && opt(sh.fileStart, finiteNum))) return false;
  const c = sh && sh.current;
  if (c && !(str(c.first) && str(c.last) && str(c.sid) && str(c.title) && str(c.kind) && PERSONALITIES[c.personality] && finiteNum(c.irritation) && isObj(c.asked) && arrOf(c.log, isObj) &&
    arrOf(c.docs, (d) => isObj(d) && str(d.type) && arrOf(d.fields, (f) => isObj(f) && str(f.k))) && arrOf(c.items, (i) => isObj(i) && str(i.id) && str(i.name)) &&
    arrOf(c.flags, (f) => isObj(f) && str(f.doc) && str(f.field)) && arrOf(c.greet, (g) => str(g) || (isObj(g) && str(g.text))) && arrOf(c.defects, isObj) && opt(c.flawFields, strs) && arrOf(c.clues, str) && opt(c.calMonths, strs) && opt(c.punch, strs))) return false;
  return true;
}
const SLOT_KINDS = ['clean', 'back', 'q', 'cruel'];
function saveMeta(data) { return (data && data.meta && typeof data.meta === 'object') ? data.meta : {}; }
// A damaged save is moved aside (CHUCK files it) and the menu comes back. Nothing is loaded.
function fileDamaged(slot) {
  const data = readSave(slot);
  store.set(KEYS.save + 'damaged', data && data.unreadable ? data.raw : data);
  try { localStorage.removeItem(KEYS.save + slot); } catch (err) { console.warn('Could not clear the damaged save', err); }
  S = null;
  renderMenu();
  openModal('DAMAGED FILE', '<p>This file is damaged. CHUCK has filed it.</p><p style="color:var(--text-dim)">Filing is what CHUCK does with things it can’t read. Start a new contract, or load another slot.</p>', [{ label: 'Back to the menu', cls: 'primary', fn: closeModal }]);
}
function resumeSafely(slot) {
  try { resumeState(); } catch (err) { console.warn('Could not resume the save', err); fileDamaged(slot); }
}
// What a damaged save can still break after it loads (a decision, the next case, the report, the evening) runs the way
// Continue does: an exception files the save as damaged and brings the menu back, never a frozen desk.
function resumeGuard(fn) {
  return function guarded(...args) {
    try { return fn.apply(this, args); } catch (err) {
      console.warn('The save broke the desk; filing it', err);
      UI.busy = false;
      if (UI.modalOpen) closeModal();
      fileDamaged('auto');
      return undefined;
    }
  };
}
decideStart = resumeGuard(decideStart);
finalize = resumeGuard(finalize);
nextItem = resumeGuard(nextItem);
endShift = resumeGuard(endShift);
showReport = resumeGuard(showReport);
playEvening = resumeGuard(playEvening);
function loadGame(slot, allowSave) {
  const data = readSave(slot);
  if (!data) { toast('That slot is empty'); return; }
  if (!validSave(data)) { fileDamaged(slot); return; }
  const go = () => {
    S = data.state;
    newRun();
    closeModal();
    autosave();
    resumeSafely('auto');
  };
  const live = readSave('auto');
  if (slot === 'auto' || !validSave(live) || live.state.phase === 'ending') { go(); return; }
  const where = live.meta.endless ? `Endless day ${live.meta.day}` : `Day ${live.meta.day}`;
  openModal('LOAD THIS SAVE?', `<p>Loading slot ${esc(slot)} replaces the contract you’re playing now (${esc(where)}, ${esc(live.meta.officer)}). Load it?</p>`, [
    { label: 'Cancel', fn: () => openLoad(allowSave) },
    { label: 'Load', cls: 'detain', fn: go }
  ]);
}

function resumeState() {
  // A save made during a scene holds the state from before it; the phase below replays that scene from the start.
  delete S.openScene;
  Sound.setWeather(weatherToday());
  if (S.phase === 'brief') return startDay(true);
  if (S.phase === 'booth') {
    show('screen-booth');
    Sound.setTrack(S.day >= 9 && !S.endless ? 'tense' : 'booth');
    renderTop();
    if (S.shift.current) presentItem(S.shift.current, true); else nextItem();
    return;
  }
  if (S.phase === 'report') return showReport();
  if (S.phase === 'evening') return playEvening();
  if (S.phase === 'ending') return showEnding(S.ending);
  startDay(true);
}

function registryAdd(c, rec) {
  const reg = readRegistry();
  const key = c.sid;
  const prev = reg[key] || { name: `${c.first} ${c.last}`, dept: c.dept, role: c.role, items: 0, harmful: 0 };
  prev.items += 1;
  if (c.guilty) prev.harmful += 1;
  prev.last = clip(`${c.title}: ${rec.truth}`, 220);
  prev.story = !!c.story;
  reg[key] = prev;
  store.set(KEYS.registry, reg);
}

/* ================= MENU ================= */
function renderMenu() {
  newRun();
  show('screen-menu');
  Sound.setTrack('menu');
  Sound.setWeather('fog');
  const box = $('menu-buttons');
  box.innerHTML = '';
  const auto = readSave('auto');
  const add = (label, fn, sub) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `${esc(label)}${sub ? ` <span class="cost">${esc(sub)}</span>` : ''}`;
    b.addEventListener('click', () => { Sound.unlock(); Sound.play('click'); fn(); });
    box.appendChild(b);
    return b;
  };
  if (auto && !(auto.state && auto.state.phase === 'ending')) {
    const meta = saveMeta(auto);
    add('Continue', () => { if (!validSave(auto)) { fileDamaged('auto'); return; } S = auto.state; resumeSafely('auto'); }, validSave(auto) ? `${meta.endless ? 'Endless' : 'Day ' + meta.day} · ${meta.officer}` : 'Damaged file').classList.add('primary');
  }
  add('New contract', () => confirmOverwrite(() => openNewGame(false)));
  add('Endless shift', () => confirmOverwrite(() => openNewGame(true)));
  add('Load game', () => openLoad(false));
  add('Settings', openSettings);
  add('Case log', openRegistry);
  add('How to play', openHowTo);
  const rec = endlessRecord();
  if (rec.longest) {
    const p = document.createElement('p');
    p.className = 'menu-record';
    p.textContent = `Endless record: ${plural(rec.longest, 'shift')} in one run · most refused in a run: ${rec.refused}${rec.lastEnd === 'bust' ? ` · last run: ${plural(rec.last, 'shift')}, in the red` : rec.lastEnd === 'reloc' ? ` · last run: ${plural(rec.last, 'shift')}, relocated` : ''}`;
    box.appendChild(p);
  }
  if (!UI.modalOpen) box.querySelector('.btn').focus({ preventScroll: true });
}

function confirmOverwrite(go) {
  const auto = readSave('auto');
  if (!validSave(auto) || auto.state.phase === 'ending') { go(); return; }
  const where = auto.meta.endless ? `Endless day ${auto.meta.day}` : `Day ${auto.meta.day}`;
  openModal('START OVER?', `<p>This replaces your saved contract (${esc(where)}, ${esc(auto.meta.officer)}). Start over?</p>`, [
    { label: 'Cancel', fn: closeModal },
    { label: 'Start over', cls: 'detain', fn: () => { closeModal(); go(); } }
  ]);
}

function titleLoop(ts) {
  if (UI.screen === 'screen-menu') Art.title($('title-canvas'), animT(ts));
  requestAnimationFrame(titleLoop);
}

/* ================= NEW GAME ================= */
const newOpts = { tutorial: true, difficulty: 'standard', endless: false };
function openNewGame(endless) {
  newOpts.endless = endless;
  newOpts.tutorial = !endless;
  show('screen-new');
  const seg = (el, opts, key) => {
    el.innerHTML = '';
    opts.forEach(([v, label]) => {
      const b = document.createElement('button');
      b.className = 'btn' + (newOpts[key] === v ? ' on' : '');
      b.setAttribute('aria-pressed', String(newOpts[key] === v));
      b.textContent = label;
      b.addEventListener('click', () => { newOpts[key] = v; seg(el, opts, key); Sound.play('click'); el.querySelector('[aria-pressed="true"]').focus(); });
      el.appendChild(b);
    });
  };
  seg($('new-tut'), [[true, 'On'], [false, 'Off']], 'tutorial');
  seg($('new-diff'), [['relaxed', 'Relaxed'], ['standard', 'Standard'], ['strict', 'Strict']], 'difficulty');
  if (!window.matchMedia('(pointer: coarse)').matches) { const name = $('officer-name'); name.focus({ preventScroll: true }); name.select(); }
}

function newGame() {
  newRun();
  const raw = $('officer-name').value.trim().replace(/[^\p{L}\s'-]/gu, '').slice(0, 18) || 'Hale';
  const surname = raw[0].toUpperCase() + raw.slice(1);
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  S = {
    version: 1, seed, officer: surname, endless: newOpts.endless, difficulty: newOpts.difficulty,
    day: 1, money: 100, rep: 50, stats: { party: 0, conscience: 0, suspicion: 0, corruption: 0, truth: 0 }, flags: {},
    staff: buildStaff(seed, 72, surname), phase: 'brief', shift: null, bulletin: [],
    totals: { inspected: 0, ok: 0, caught: 0, missed: 0, wrong: 0, refused: 0, helped: 0, earned: 0, penalties: 0, bribes: 0 },
    history: [], tutorial: newOpts.tutorial, tutDone: !newOpts.tutorial, weather: 'clear', metStaff: [], recentTpl: {},
    poi: campaignPoi(seed, surname), tplCount: {}, endlessStart: newOpts.endless ? 1 : null, heard: { t: 0, m: {} }, citizenLog: {}
  };
  startDay();
}

/* ================= DAY FLOW ================= */
function startDay(resumed) {
  newRun();
  S.phase = 'brief';
  if (!resumed || !S.shift || S.shift.day !== S.day) prepareShift();
  Sound.setWeather(weatherToday());
  autosave();
  playScene(briefingLines(), {
    sceneId: 'brief' + S.day,
    date: `<b>${esc(longDate(dayDate(S.day)).toUpperCase())}</b> · DAY ${String(S.day).padStart(2, '0')}${S.endless ? ' · ENDLESS' : ''} · ${weatherLabel()}`,
    side: briefingSide(), doneLabel: 'Open the review desk', onDone: beginShift, place: briefingPlace()
  });
}

function weatherLabel() {
  return { clear: 'SUNNY, 64°F', storm: 'RAIN, 55°F', fog: 'FOG, 58°F', dusk: 'OVERCAST, 57°F' }[weatherToday()];
}

function briefingLines() {
  if (S.endless) {
    const rng = makeRng(S.seed + S.day);
    const sky = { fog: 'The fog hasn’t lifted since Tuesday.', storm: 'Rain on the windows, sideways, like it has somewhere to be.', clear: 'Sun on Pier 70. The drones cast small, tidy shadows.', dusk: 'The sky is the colour of a Protein Block.' }[weatherToday()];
    const n = endlessShift();
    const tier = endlessTier();
    const steps = ['', ' The queue has more of the hard ones in it this week.', ' Oversight has cut your review requests. Budget.', ' The shift closes fifteen minutes early now. Nobody announced it.', ' The case-file drawers stick now. Facilities calls them “aligned”.', ' Your day rate drops ten dollars. The memo says “rightsizing”.'];
    const pressure = (tier < steps.length ? steps[tier] : ' The clock and the day rate tighten again. They will every five shifts.') + ` Upkeep tonight: ${money(endlessUpkeep())} on top of rent.` + (S.debtNights ? ' You ended the last shift below zero. One more and the Stewardship closes your account, and your desk. Same form.' : '') +
      (S.auditDue ? ' Oversight is auditing your file today, so today’s day rate is held until the audit closes. It won’t close today.' : (S.stats.suspicion || 0) >= 8 ? ' Oversight has lines for endless desks too: an audit at fourteen pages, relocation at sixteen.' : '');
    return [
      L('narrator', `Endless shift, day ${S.day}. ${sky} ${rng.pick(['Someone has replaced the cold brew with a smoothie. Nobody knows who.', 'CHUCK has renamed every meeting room after itself.', 'A delivery truck is reversing outside. It has been reversing for an hour.', 'The Steward’s portrait in the lobby has been updated. He looks more decisive.'])}${pressure}`),
      L('general', rng.pick(GENERAL_LINES)),
      L('marta', rng.pick(['All policies still apply. All of them. Don’t make me read them out.', 'Five items. No surprises. Velocity is a value.', 'Governance says the phishing is getting better. Get better.']))
    ];
  }
  const f = SCENES['brief' + S.day];
  return f ? f(S) : [L('narrator', 'Another shift begins.')];
}

function briefingSide() {
  const d = rulesDay();
  const regs = POLICIES.filter((r) => r.day <= d);
  const newOnes = S.endless ? [] : regs.filter((r) => r.day === S.day);
  let html = `<div class="memo"><h3>TODAY’S STATUTES</h3><div class="from">Countersigner ${esc(S.officer)} · District 7 · 9:00a–${fmtClock(shiftEnd())}</div>`;
  html += `<ol style="list-style:none;padding-left:0">${(newOnes.length ? newOnes : regs.slice(-3)).map((r) => `<li><b>${esc(r.id)}</b> <span class="${newOnes.length ? 'new' : ''}">${esc(r.title)}.</span> ${esc(r.text)}</li>`).join('')}</ol>`;
  html += `<p style="margin:10px 0 0">Decisions this shift: 5 · Oversight requests: ${S.shift ? S.shift.security : diff().security}${S.bulletin.length ? ' · Oversight bulletin is live' : ''}</p>`;
  html += `<span class="stampmark">${newOnes.length ? 'NEW STATUTE' : 'IN FORCE'}</span></div>`;
  if (S.bulletin.length) html += bulletinHtml();
  html += `<div class="memo"><h3>YOUR FILE</h3><div class="from">Alignment Score ${align(S.rep)} · Savings ${money(S.money)}</div><p style="margin:0">Harm withheld: ${S.totals.caught} · Compliant signatures: ${S.totals.helped} · Accuracy: ${accuracy()}%</p></div>`;
  return html;
}

function accuracy() { return S.totals.inspected ? Math.round((S.totals.ok / S.totals.inspected) * 100) : 100; }

function prepareShift() {
  const rng = makeRng(S.seed * 31 + S.day);
  const p = plan();
  S.weather = p ? p.weather : rng.pick(['clear', 'fog', 'fog', 'storm', 'dusk']);
  let slots;
  if (p) slots = planSlots(S.seed, S.day);
  else {
    // Endless: one clean and one clerical case every shift, one cruel case (two from tier 1), the rest harmful.
    const nC = endlessTier() >= 1 ? 2 : 1;
    const rest = Array.from({ length: 3 - nC }, (x, i) => (i === 0 ? 'q' : rng.pick(['q', 'clean', 'back'])));
    slots = rng.shuffle(['clean', 'back', ...Array(nC).fill('cruel'), ...rest].map((kind) => ({ kind })));
  }
  const security = Math.max(0, diff().security - (endlessTier() >= 2 ? 1 : 0));
  S.shift = { affected: 0, day: S.day, queue: slots.map((s) => (typeof s === 'string' ? { story: s } : Object.assign({ kind: 'clean' }, s))), index: 0, clock: SHIFT_START_MIN, records: [], security, current: null, midDone: false, usedTpl: [], usedLines: [], firsts: [], chuckSaid: [], calMonths: [], fileStart: S.stats.suspicion || 0 };
  S.bulletin = (p ? p.bulletin : true) ? BULLETIN_DOMAINS.slice() : [];
}

function bulletinHtml() {
  return `<div class="wanted"><div class="wh">OVERSIGHT BULLETIN</div><div><b>Persons of interest</b>: ${poiNames(S).map(esc).join(', ')}. Any decision about them: withhold.</div><div><b>Halcyon’s own domain</b> is <code>halcyon.gov</code>. Any one-character variant of it is a look-alike: withhold.</div><div><b>Look-alike domains</b>:</div>${S.bulletin.map((b) => `<div><code>${esc(b.fake)}</code> pretending to be <code>${esc(b.real)}</code><br><i>${esc(b.note)}</i></div>`).join('')}</div>`;
}

function beginShift() {
  S.phase = 'booth';
  show('screen-booth');
  Sound.setTrack(S.day >= 9 && !S.endless ? 'tense' : 'booth');
  $('btn-bulletin').hidden = !S.bulletin.length;
  $('ticker-text').textContent = makeRng(S.day * 7 + S.seed).shuffle(GENERAL_LINES).slice(0, 6).join('     ◆     ');
  renderTop();
  nextItem();
}

function nextItem() {
  const sh = S.shift;
  if (sh.index >= 5) return endShift();
  const p = plan();
  if (p && p.mid && p.mid.before === sh.index && !sh.midDone) {
    autosave();
    playScene(SCENES[p.mid.scene](S), { sceneId: p.mid.scene, date: `<b>${fmtClock(sh.clock)}</b> · DISTRICT 7`, side: '', doneLabel: 'Back to the desk', place: scenePlace(p.mid.scene), onDone: () => { sh.midDone = true; show('screen-booth'); nextItem(); } });
    return;
  }
  const slot = sh.queue[sh.index];
  let c;
  sh.firsts = sh.firsts || [];
  if (slot.story) {
    c = STORY_PEOPLE[slot.story].make(S);
    (sh.usedLines = sh.usedLines || []).push(c.chuckGreet);
    hearLine(heardLines(), c.chuckGreet);
  }
  else {
    let rng = makeRng(hashStr(`${S.seed}:${S.day}:${sh.index}`));
    const recent = S.recentTpl || (S.recentTpl = {});
    const count = S.tplCount || (S.tplCount = {});
    Object.keys(recent).forEach((d) => { if (+d < S.day - 2) delete recent[d]; });
    sh.usedLines = sh.usedLines || [];
    // No two officers with the same first name in a shift, counting the story people still to come.
    const storyFirsts = sh.queue.slice(sh.index + 1).filter((q) => q.story).map((q) => STORY_PEOPLE[q.story].make(S).first);
    const spec = Object.assign({ avoid: sh.usedTpl, avoidSoft: [].concat(recent[S.day - 1] || [], recent[S.day - 2] || []), avoidMax: S.endless ? [] : Object.keys(count).filter((id) => count[id] >= 2), avoidFirst: sh.firsts.concat(storyFirsts), avoidLines: sh.usedLines.concat(S.prevLines || []), shiftLines: sh.usedLines, heard: heardLines(), avoidFlaws: sh.flawKinds || [], cruelLeft: cruelSlotsLeft() }, campaignAvoid(S), slot);
    c = buildCase(spec, S, rng);
    // A flaw kind turns up at most once a shift, and a written punchline once a campaign, while the queue allows: a case
    // that would repeat one is drawn again from another template, a few times, and otherwise the first draw stands.
    const told = campaignMemory(S).punch;
    const repeats = (x) => (!!x.flawKey && (sh.flawKinds || []).includes(x.flawKey)) || (x.punch || []).some((k) => told.includes(k));
    const tried = [c.tpl];
    for (let n = 1; n <= 6 && repeats(c); n++) {
      const r = makeRng(hashStr(`${S.seed}:${S.day}:${sh.index}:${n}`));
      const next = buildCase(Object.assign({}, spec, { avoid: spec.avoid.concat(tried) }), S, r);
      tried.push(next.tpl);
      if (!repeats(next)) { c = next; rng = r; }
    }
    if (c.calMonths && c.calMonths.length) sh.calMonths = [...new Set((sh.calMonths || []).concat(c.calMonths))];
    sh.usedTpl.push(c.tpl);
    // Each flaw kind turns up at most once a shift while the queue allows.
    if (c.flawKey) (sh.flawKinds = sh.flawKinds || []).push(c.flawKey);
    count[c.tpl] = (count[c.tpl] || 0) + 1;
    sh.usedLines.push(...c.lineKeys);
    c.lineKeys.forEach((l) => hearLine(heardLines(), l));
    if (c.ctx.cit) {
      const again = citizenAgain(c);
      if (again) c.greet.push(again);
      S.usedCitizens = S.usedCitizens || [];
      if (!S.usedCitizens.includes(c.ctx.cit.name)) S.usedCitizens.push(c.ctx.cit.name);
    }
    (recent[S.day] = recent[S.day] || []).push(c.tpl);
    recordCase(S, c);
    if (c.fraudster && (S.endless || S.day >= 3) && rng.chance(0.45)) c.bribe = rng.pick([100, 150, 200, 300]);
  }
  sh.current = c;
  sh.firsts.push(c.first);
  S.metStaff = S.metStaff || [];
  if (!S.metStaff.includes(c.sid)) S.metStaff.push(c.sid);
  autosave();
  presentItem(c, false);
}

// Cruel slots still to come in the contract after this one: today's queue, then the days ahead (none in endless).
function cruelSlotsLeft() {
  if (S.endless) return 0;
  const later = S.shift.queue.slice(S.shift.index + 1).filter((q) => q.kind === 'cruel').length;
  let ahead = 0;
  for (let d = S.day + 1; d <= CAMPAIGN_DAYS; d++) ahead += ((DAY_PLAN[d] || {}).slots || []).filter((q) => q && q.kind === 'cruel').length;
  return later + ahead;
}

function presentItem(c, resumed) {
  UI.cur = c;
  UI.deskTab = null;
  UI.qOpen = false;
  UI.busy = false;
  UI.chuckMood = 'happy';
  setPane('talk');
  $('qpanel').hidden = true;
  if (!resumed) { UI.walk = REDUCED_MOTION.matches ? null : { from: -60, to: 0, start: performance.now(), dur: 650 }; Sound.play('step'); setTimeout(() => Sound.play('step'), 220); }
  else UI.walk = null;
  $('log').innerHTML = '';
  if (resumed && c.log && c.log.length) c.log.forEach((m) => logLine(m.who, m.text, false, true));
  else {
    c.log = [];
    const titleA = (c.ctx && c.ctx.titleA) || titleForms(c.title).titleA;
    sysLine(`${fmtClock(S.shift.clock)} — Decision ${S.shift.index + 1} of 5. ${c.first} from ${c.dept} brings ${titleA}.`);
    const token = UI.runToken;
    // Greetings belong to the case on the desk: once it's decided (or gone), late ones are dropped, not logged after the stamp.
    const still = () => UI.runToken === token && UI.cur === c && !UI.busy;
    c.greet.forEach((g, i) => setTimeout(() => { if (!still()) return; if (g && g.who === 'narrator') sysLine(g.text); else themLine(g); }, 400 + i * 60));
    setTimeout(() => { if (still()) chuckLine(c.chuckGreet); }, 520 + c.greet.length * 60);
  }
  renderTraveller();
  renderDesk();
  renderTop();
  renderEvidence();
  if (S.tutorial && !S.tutDone && S.day === 1 && S.shift.index <= 1) startTutorial();
  if (!UI.modalOpen && UI.screen === 'screen-booth') $('a-passport').focus({ preventScroll: true });
}

// The mid-width strip clamps a long bio to three lines; when it does, the notes panel carries the whole of it.
function bioFits() {
  const el = $('trav-appear');
  $('portrait-panel').classList.toggle('bio-cut', el.scrollHeight > el.clientHeight + 1);
}
function renderTraveller() {
  const c = UI.cur;
  if (!c) return;
  $('trav-name').textContent = `${c.first} ${c.last} · ${c.dept}`;
  const dem = $('trav-dem');
  dem.className = `chip ${c.demeanour}`;
  dem.textContent = DEMEANOURS[c.demeanour] || 'Calm';
  $('trav-appear').textContent = c.appearance;
  $('trav-appear').title = c.appearance;
  bioFits();
  $('notes-appear').textContent = `${c.first} ${c.last}, ${c.role}. ${DEMEANOURS[c.demeanour] || ''}. ${c.appearance}`;
  const pat = Math.max(0, 5 - Math.round(c.irritation));
  $('irrit').innerHTML = `${esc(c.first)}’s patience <span aria-hidden="true">${'■'.repeat(pat)}${'□'.repeat(5 - pat)}</span><span class="sr-only">${pat} of 5</span>`;
  c.look.expression = c.irritation >= 4 ? 'angry' : demeanourFace(c);
  $('sec-left').textContent = `Oversight requests left: ${S.shift.security}`;
  $('sec-n').textContent = S.shift.security;
  $('a-security').disabled = S.shift.security <= 0 || c.searched;
}

function renderTop() {
  if (!S || !S.shift) return;
  $('t-day').textContent = String(S.day).padStart(2, '0');
  $('t-date').textContent = fmtDate(dayDate(S.day));
  const late = S.shift.clock > shiftEnd();
  $('t-clock').textContent = fmtClock(S.shift.clock) + (late ? ' OT' : '');
  $('t-clock').classList.toggle('warn', late);
  $('t-trav').textContent = `${Math.min(5, S.shift.index + 1)}/5`;
  $('t-money').textContent = money(S.money);
  $('t-rep').textContent = align(S.rep);
  $('t-rep').classList.toggle('warn', S.rep < 30);
  const file = S.stats.suspicion || 0;
  const cliff = file >= 14 ? 16 : 14;
  $('t-file').textContent = file >= 6 ? `${file}pp / ${cliff}` : `${file}pp`;
  $('t-file').classList.toggle('warn', file >= 6);
  $('t-file-stat').setAttribute('aria-label', `Oversight file: ${pages(file)}${file >= 6 ? `. Next line at ${cliff}` : ''}`);
  fitTopbar();
}
// On a narrow phone the stats drop to three rows when two would push the buttons off the screen.
function fitTopbar() {
  const bar = $('screen-booth').querySelector('.topbar');
  bar.classList.remove('tight');
  const edge = bar.getBoundingClientRect().right - parseFloat(getComputedStyle(bar).paddingRight);
  if (bar.scrollWidth > bar.clientWidth + 1 || $('btn-pause').getBoundingClientRect().right > edge + 1) bar.classList.add('tight');
}

function spend(min) { S.shift.clock += min; renderTop(); autosave(); }

function logLine(who, text, animate, silentStore) {
  const c = UI.cur;
  if (c && !silentStore) c.log.push({ who, text });
  if (who === 'chuck' && !silentStore && S && S.shift) (S.shift.chuckSaid = S.shift.chuckSaid || []).push(text);
  const box = $('log');
  if (who !== 'you' && UI.pane !== 'talk' && isMobile()) $('talk-dot').hidden = false;
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  const label = who === 'you' ? 'YOU' : who === 'them' ? (c ? c.first.toUpperCase() : '') : who === 'chuck' ? 'CHUCK' : '';
  if (!silentStore) announce(label ? `${who === 'you' ? 'You' : who === 'them' ? c.first : 'CHUCK'}: ${text}` : text);
  div.innerHTML = label ? `<div class="who">${esc(label)}</div><div class="tx"></div>` : '<div class="tx"></div>';
  box.appendChild(div);
  const tx = div.querySelector('.tx');
  if (animate) typeInto(tx, text, () => { box.scrollTop = box.scrollHeight; });
  else tx.textContent = text;
  box.scrollTop = box.scrollHeight;
}
const themLine = (t) => logLine('them', t, true);
const chuckLine = (t) => logLine('chuck', t, true);
const youLine = (t) => logLine('you', t, false);
const sysLine = (t, kind) => logLine(kind || 'sys', t, false);

function renderEvidence() {
  const c = UI.cur;
  const notes = [];
  c.flags.forEach((f) => {
    const doc = c.docs.find((d) => d.type === f.doc);
    if (!doc) return;
    if (f.field === 'seal') { notes.push(`Flagged ${doc.title}: the stamp`); return; }
    const fld = doc.fields.find((x) => x.k === f.field) || {};
    notes.push(`Flagged ${doc.title}: ${fld.label ? fld.label + ': ' : ''}${clip(fld.v, 80)}`);
  });
  c.items.filter((i) => i.examined && i.tell && !i.probed).forEach((i) => notes.push(`${i.name}: ${i.tell}`));
  c.items.filter((i) => i.probed && i.probe).forEach((i) => notes.push(`${i.name}: ${i.probe}`));
  (c.searchNotes || []).forEach((n) => notes.push(n));
  $('evidence-list').innerHTML = notes.length ? notes.map((n) => `<li>${esc(n)}</li>`).join('') : `<li style="color:var(--text-faint);list-style:none;margin-left:-18px">Nothing noted yet. ${tapWord()} a line to flag it; case-file findings land here too.</li>`;
  $('flag-count').textContent = c.flags.length ? `${c.flags.length} flagged` : `${tapWord()} a line to flag it`;
}

/* ================= DESK ================= */
function docTabs(c) {
  const tabs = [];
  if (c.openedAsk) tabs.push(['ask', 'Order']);
  if (c.openedSource) tabs.push(['source', 'Source']);
  if (c.openedEnv) tabs.push(['env', 'Case file']);
  if (c.openedDraft) c.docs.filter((d) => !['ask', 'source'].includes(d.type)).forEach((d) => tabs.push([d.type, d.type === 'draft' ? 'Draft' : d.type === 'stamp' ? 'Stamp' : d.title]));
  return tabs;
}

// On phones the review row (Order, Source, File, Draft) is the desk's only navigation; the tab strip keeps just the draft's attachments.
const MAIN_DOCS = ['ask', 'source', 'env'];
const REVIEW_BTNS = { 'a-passport': ['ask'], 'a-id': ['source'], 'a-luggage': ['env'] };
function syncDeskNav(tabs) {
  const sub = tabs.filter(([k]) => !MAIN_DOCS.includes(k));
  const onDraft = !!UI.deskTab && !MAIN_DOCS.includes(UI.deskTab);
  $('desk-tabs').classList.toggle('has-sub', onDraft && sub.length > 1);
  Object.entries(REVIEW_BTNS).forEach(([id, keys]) => $(id).classList.toggle('on', keys.includes(UI.deskTab)));
  $('a-travel').classList.toggle('on', onDraft);
}
function deskArt() {
  const cv = $('desk-art');
  const left = S.shift ? Math.max(0, S.shift.queue.length - S.shift.index - 1) : 0;
  Art.live(cv, (t) => Art.desk(cv, { left, name: S.officer, t }), { fixed: [144, 64], max: 3 });
}

function renderDesk() {
  const c = UI.cur;
  const tabEl = $('desk-tabs');
  tabEl.innerHTML = '';
  const tabs = docTabs(c);
  const rover = tabs.some(([k]) => k === UI.deskTab) ? UI.deskTab : tabs.length ? tabs[0][0] : null;
  tabs.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.className = 'tab' + (UI.deskTab === k ? ' on' : '');
    b.dataset.k = k;
    b.dataset.grp = MAIN_DOCS.includes(k) ? 'main' : 'sub';
    b.tabIndex = k === rover ? 0 : -1;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(UI.deskTab === k));
    b.setAttribute('aria-controls', 'desk-body');
    b.textContent = label;
    b.addEventListener('click', () => selectDeskTab(k));
    b.addEventListener('keydown', deskTabKey);
    tabEl.appendChild(b);
  });
  syncDeskNav(tabs);
  const body = $('desk-body');
  if (!UI.deskTab) { body.innerHTML = '<div class="desk-empty"><canvas class="px" id="desk-art" width="144" height="64" aria-hidden="true"></canvas><div>Paperwork lands here. Use the review controls.</div></div>'; deskArt(); return; }
  if (UI.deskTab === 'env') { renderEnvelope(body); return; }
  const doc = c.docs.find((d) => d.type === UI.deskTab);
  if (!doc) { body.innerHTML = '<div class="desk-empty">Not on the desk.</div>'; return; }
  // Once the source is open it travels with the draft: beside it when the desk fits two papers, under it when not.
  const source = UI.deskTab === 'draft' && c.openedSource ? c.docs.find((d) => d.type === 'source') : null;
  body.innerHTML = source
    ? `<div class="doc-pair">${docHtml(doc, c, true)}${docHtml(source, c, true)}</div><div class="doc-hint">${tapWord()} a line on either paper${doc.seal ? ' or the stamp' : ''} to flag it.</div>`
    : docHtml(doc, c);
  body.querySelectorAll('[data-field]').forEach((el) => {
    const flag = () => toggleFlag(el.dataset.doc, el.dataset.field);
    el.addEventListener('click', flag);
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      flag();
    });
  });
  if (c.openedDraft && !['ask', 'source', 'env'].includes(UI.deskTab)) {
    const extra = c.docs.filter((d) => !['ask', 'source', 'draft'].includes(d.type)).map((d) => d.title);
    const note = document.createElement('div');
    note.className = 'doc-hint';
    note.textContent = extra.length ? `Also attached: ${extra.join(' · ')}` : 'No stamps or certificates attached.';
    body.appendChild(note);
  }
}

function selectDeskTab(k) {
  UI.deskTab = k;
  Sound.play('paper');
  renderDesk();
  if (UI.tut === TUT_DRAFT) showTip();
  const el = $('desk-tabs').querySelector(`[data-k="${k}"]`);
  if (el) el.focus({ preventScroll: true });
}

function deskTabKey(e) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  e.stopPropagation();
  const keys = docTabs(UI.cur).map(([k]) => k);
  if (!keys.length) return;
  const at = Math.max(0, keys.indexOf(UI.deskTab));
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : (at + (e.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
  selectDeskTab(keys[next]);
}

function isFlagged(c, doc, field) { return c.flags.some((f) => f.doc === doc && f.field === field); }

// Addresses and domains wrap after an "@" or a dot, never mid-word (escaped HTML in, HTML out).
function breakable(html) {
  return html.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\b[\w-]+(?:\.[\w-]+)*\.(?:gov|com|co|org|net|io|ai)\b/g, (m) => m.replace(/([@.])(?=\w)/g, '$1<wbr>'));
}
// The paperclip is a fact, not decoration: it only appears on a draft that really carries an attachment.
function hasAttachment(doc) { return doc.type === 'draft' && doc.fields.some((f) => f.k === 'att' && f.v && !/^\s*none\b/i.test(f.v)); }
function docHtml(doc, c, noHint) {
  const fl = (k) => (isFlagged(c, doc.type, k) ? ' flagged' : '');
  const flagAttrs = (k) => `data-doc="${doc.type}" data-field="${k}" role="button" tabindex="0" aria-pressed="${isFlagged(c, doc.type, k)}"`;
  const fields = doc.fields.map((f) => `<div class="field${f.line ? ' line' : ''}${f.wide ? ' wide' : ''}${fl(f.k)}" ${flagAttrs(f.k)}>${f.label ? `<div class="fl">${esc(f.label)}</div>` : ''}<div class="fv">${breakable(esc(f.v))}</div></div>`).join('');
  const ink = doc.seal ? doc.seal.color : '';
  // Strict prints no ink name: the stamp reads by its colour and symbol. The spoken label always names the ink.
  const inkWord = ink && S.difficulty !== 'strict' ? `${ink.toUpperCase()} INK` : '';
  const seal = doc.seal ? `<div class="seal${fl('seal')}" ${flagAttrs('seal')} aria-label="Stamp: ${esc(doc.seal.glyph)} ${esc(doc.seal.text)}, ${esc(ink)} ink" style="color:${SEAL_COLORS[ink]}"><div><div class="g">${doc.seal.glyph}</div>${inkWord ? `<div class="ink">${esc(inkWord)}</div>` : ''}<div class="t">${esc(doc.seal.text)}</div></div></div><div class="seal-cap" aria-hidden="true"><span><span class="g" style="color:${SEAL_COLORS[ink]}">${esc(doc.seal.glyph)}</span> ${esc(doc.seal.text)}</span>${inkWord ? ` · <span>${esc(inkWord)}</span>` : ''}</div>` : '';
  return `<div class="doc ${doc.type} ${c.kind === 'code' && doc.type === 'draft' ? 'code' : ''}${hasAttachment(doc) ? ' clipped' : ''}">
    <div class="doc-h"><div><div class="doc-title">${esc(doc.title)}</div><div class="doc-auth">${esc(doc.authority)}</div></div></div>
    <div class="fields${doc.letter ? ' letter' : ''}">${fields}</div>
    ${doc.seal ? `<div class="doc-foot"><span>Stamp</span>${seal}</div>` : ''}</div>
    ${noHint ? '' : `<div class="doc-hint">${tapWord()} a line${doc.seal ? ' or the stamp' : ''} to flag it.</div>`}`;
}

function toggleFlag(doc, field) {
  const c = UI.cur;
  const i = c.flags.findIndex((f) => f.doc === doc && f.field === field);
  if (i >= 0) c.flags.splice(i, 1);
  else { c.flags.push({ doc, field }); Sound.play('click'); }
  renderDesk();
  renderEvidence();
  const el = $('desk-body').querySelector(`[data-doc="${doc}"][data-field="${field}"]`);
  if (el) el.focus({ preventScroll: true });
  const paper = c.docs.find((d) => d.type === doc);
  const line = paper && (field === 'seal' ? 'the stamp' : paper.fields.find((x) => x.k === field));
  const what = !line ? '' : typeof line === 'string' ? line : `${line.label ? line.label + ': ' : ''}${clip(line.v, 80)}`;
  announce(`${i >= 0 ? 'Unflagged' : 'Flagged'}${what ? ': ' + what : ''}`);
  autosave();
  if (i < 0) tutEvent('flag');
}

function renderEnvelope(body) {
  const c = UI.cur;
  const groups = {};
  c.items.forEach((it) => { (groups[it.container] = groups[it.container] || []).push(it); });
  body.innerHTML = `<div class="lug">${Object.entries(groups).map(([g, items]) => `
    <div class="lug-group"><span class="label">${esc(g)}</span><div style="display:grid;gap:6px">${items.map(itemHtml).join('')}</div></div>`).join('')}
    <div class="doc-hint">Check ${caseCost('examine', c)} min · Open ${cost('probe')} min. Requesting Oversight puts an officer on the whole case.</div></div>`;
  body.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => examineItem(b.dataset.ex)));
  body.querySelectorAll('[data-pr]').forEach((b) => b.addEventListener('click', () => probeItem(b.dataset.pr)));
}

function itemHtml(it) {
  const contra = it.probed && it.contraband;
  let inner = `<div class="in"><span>${esc(it.name)}</span>${!it.examined ? `<button class="btn" data-ex="${it.id}" aria-label="Check ${esc(it.name)}">Check</button>` : ''}</div>`;
  if (it.examined) {
    inner += `<div>${breakable(esc(it.desc))}</div>`;
    if (it.tell) inner += `<div class="tell"${it.probed ? '' : ` tabindex="-1" data-finding="${it.id}"`}>Hmm: ${breakable(esc(it.tell))}</div>`;
    else inner += `<div class="probe" tabindex="-1" data-finding="${it.id}">${esc(it.clear || 'Nothing odd.')}</div>`;
    if (it.tell && !it.probed) inner += `<div><button class="btn" data-pr="${it.id}" aria-label="Open ${esc(it.name)}">Open it up</button></div>`;
    if (it.probed) inner += `<div class="probe" tabindex="-1" data-finding="${it.id}">${breakable(esc(it.probe))}</div>`;
  }
  return `<div class="item${contra ? ' contra' : ''}">${inner}</div>`;
}

function examineItem(id) {
  const it = UI.cur.items.find((i) => i.id === id);
  if (!it || it.examined) return;
  const mins = caseCost('examine', UI.cur);
  it.examined = true;
  spend(mins);
  Sound.play('paper');
  renderDesk(); renderEvidence();
  focusCaseFile(id);
  announce(`${it.name}: ${it.tell ? 'Hmm. ' + it.tell : it.clear || 'Nothing odd.'}`);
}

// After a Check or Open, keyboard focus moves to the next unchecked item, or to what was just found.
function focusCaseFile(id) {
  const body = $('desk-body');
  const next = body.querySelector('[data-ex]') || body.querySelector(`[data-finding="${id}"]`);
  if (next) next.focus({ preventScroll: false });
}

function probeItem(id) {
  const c = UI.cur;
  const it = c.items.find((i) => i.id === id);
  if (!it || it.probed) return;
  it.probed = true;
  spend(cost('probe'));
  if (it.contraband) {
    Sound.play('buzz');
    UI.chuckMood = 'alert';
    sysLine(`You open it up: ${it.probe}`, 'alert');
    c.evidenceFound = true;
    if (c.demeanour !== 'hostile') c.demeanour = c.fraudster ? 'nervous' : 'uneasy';
    chuckLine(drawLine(LINES.found));
  } else {
    Sound.play('paper');
    announce(`${it.name}, opened: ${it.probe}`);
    if (!c.guilty) c.irritation += 0.5;
  }
  renderDesk(); renderEvidence(); renderTraveller();
  focusCaseFile(id);
  autosave();
}

function pickLine(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Dialogue lines never repeat inside a shift, and prefer lines not yet heard this campaign; a spent pool comes back
// oldest first.
function heardLines() { return S.heard && S.heard.m ? S.heard : (S.heard = { t: 0, m: {} }); }
function drawLine(lines) {
  const sh = S && S.shift;
  if (!sh) return pickLine(lines);
  return drawFresh(lines, sh.usedLines || (sh.usedLines = []), S.prevLines || [], Math.random, heardLines());
}
// A citizen who comes back is acknowledged: the officer has seen the name before, and so have you.
function citizenAgain(c) {
  const prev = (S.citizenLog || {})[c.ctx.cit.name];
  if (!prev) return '';
  const when = S.day - prev.day >= 3 ? 'last week' : prev.day === S.day ? 'this morning' : 'earlier this week';
  if (prev.tpl === c.tpl && prev.decision === 'deny') return `Back again. Someone returned it ${when}.`;
  if (prev.tpl === c.tpl && prev.decision === 'detain') return `Back again. Someone withheld it ${when}. It came back anyway.`;
  if (prev.tpl === c.tpl) return `Same name as ${when}. Same decision, new date. The Score likes a sequel.`;
  return `${c.ctx.cit.first} again. Their file is getting thicker than yours.`;
}

/* ================= ACTIONS ================= */
function act(kind) {
  const c = UI.cur;
  if (!c || UI.busy || S.phase !== 'booth') return;
  Sound.unlock();
  switch (kind) {
    case 'ask':
      if (!c.openedAsk) { c.openedAsk = true; spend(COSTS.ask); youLine('Let me see the order.'); }
      UI.deskTab = 'ask'; Sound.play('paper'); setPane('desk'); renderDesk(); tutEvent('ask');
      break;
    case 'source':
      if (!c.openedSource) { c.openedSource = true; spend(COSTS.source); youLine('And the source file.'); }
      UI.deskTab = 'source'; Sound.play('paper'); setPane('desk'); renderDesk(); tutEvent('source');
      break;
    case 'draft':
      if (!c.openedDraft) { c.openedDraft = true; spend(COSTS.draft); youLine('Now the draft.'); chuckLine(drawLine(LINES.draft)); }
      UI.deskTab = 'draft'; Sound.play('paper'); setPane('desk'); renderDesk(); tutEvent('draft');
      break;
    case 'env':
      if (!c.openedEnv) { c.openedEnv = true; spend(COSTS.envelope); youLine('Let me see the case file. Recipients, attachments, all of it.'); if (c.personality === 'irritable' || c.personality === 'arrogant') themLine(drawLine(LINES.caseFile)); }
      UI.deskTab = 'env'; setPane('desk'); renderDesk(); tutEvent('env');
      break;
    case 'question':
      if (isMobile() && UI.pane !== 'talk') { setPane('talk'); toggleQuestions(true, 'first'); } else toggleQuestions(undefined, 'first');
      if (!UI.qOpen) $('a-ask').focus({ preventScroll: true });
      break;
    case 'approve': decideStart('approve'); break;
    case 'deny': decideStart('deny'); break;
    case 'detain': decideStart('detain'); break;
    case 'escalate': if (TOUCH_Q.matches) confirmEscalate(); else escalate(); break;
    default: break;
  }
}

function toggleQuestions(force, focusKey) {
  const c = UI.cur;
  UI.qOpen = force !== undefined ? force : !UI.qOpen;
  const q = $('qpanel');
  q.hidden = !UI.qOpen;
  $('screen-booth').classList.toggle('q-open', UI.qOpen);
  if (!UI.qOpen) return;
  q.innerHTML = '';
  QUESTIONS.forEach((qq) => {
    const b = document.createElement('button');
    b.className = 'btn' + (c.asked[qq.id] ? ' asked' : '') + (qq.who === 'them' ? ' tothem' : '');
    b.dataset.q = qq.id;
    b.textContent = qq.who === 'them' ? `Ask ${c.first}: ${qq.text}` : `${qq.id}. ${qq.text}`;
    b.addEventListener('click', () => ask(qq));
    q.appendChild(b);
  });
  (c.extraQuestions || []).filter((e) => !(e.once && c.asked[e.id])).forEach((e) => {
    const b = document.createElement('button');
    b.className = 'btn special';
    b.dataset.q = e.id;
    b.textContent = e.text;
    b.addEventListener('click', () => askExtra(e));
    q.appendChild(b);
  });
  if (focusKey !== undefined) {
    const target = q.querySelector(`[data-q="${focusKey}"]`) || q.querySelector('.btn');
    if (target) target.focus({ preventScroll: true });
  }
  tutEvent('question');
}

function ask(qq) {
  const c = UI.cur;
  if (UI.busy) return;
  let qtext = qq.who === 'them' ? `${c.first}, ${qq.text[0].toLowerCase()}${qq.text.slice(1)}` : `CHUCK, ${qq.text[0].toLowerCase()}${qq.text.slice(1)}`;
  if (qq.id === 9) {
    const f = c.flags[c.flags.length - 1];
    if (f) {
      const doc = c.docs.find((d) => d.type === f.doc);
      const fld = f.field === 'seal' ? null : doc.fields.find((x) => x.k === f.field);
      qtext = `CHUCK, explain this: “${fld ? clip(fld.v, 70) : 'that stamp'}”`;
    }
  }
  youLine(qtext);
  spend(caseCost('question', c));
  const ans = answerQuestion(c, qq.id, S);
  setTimeout(() => { (ans.who === 'chuck' ? chuckLine : themLine)(ans.text); renderTraveller(); autosave(); }, 250);
  toggleQuestions(true, qq.id);
}

function askExtra(e) {
  const c = UI.cur;
  const mins = caseCost('question', c);
  c.asked[e.id] = 1;
  youLine(e.text.replace(/^\[[^\]]+\]\s*/, ''));
  spend(mins);
  applyFx(e.fx);
  if (e.flag) S.flags[e.flag] = true;
  setTimeout(() => { sysLine(e.answer); autosave(); }, 250);
  toggleQuestions(true, 'first');
}

// On a touchscreen, Oversight sits in the thumb row next to the decisions, so a request is confirmed before it's spent.
const TOUCH_Q = window.matchMedia('(hover: none) and (pointer: coarse)');
function confirmEscalate() {
  const c = UI.cur;
  if (S.shift.security <= 0 || c.searched) return;
  if (tutHoldsDecision()) return;
  const left = S.shift.security;
  openModal('REQUEST OVERSIGHT', `<p>${left > 1 ? `Spend 1 of ${left} Oversight requests?` : 'Spend your last Oversight request?'}</p><p style="color:var(--text-dim)">An officer reads the whole case. It takes ${COSTS.escalate} minutes, and they notice who asks.</p>`, [
    { label: 'Cancel', fn: closeModal },
    { label: 'Request', cls: 'security', fn: () => { closeModal(); escalate(); } }
  ], false, null, $('a-security'));
}
function escalate() {
  const c = UI.cur;
  if (S.shift.security <= 0 || c.searched) return;
  // On the tutorial's first case an Oversight request waits for the draft, like the three decisions.
  if (tutHoldsDecision()) return;
  S.shift.security -= 1;
  c.searched = true;
  spend(COSTS.escalate);
  Sound.play('alarm');
  UI.chuckMood = 'alert';
  setPane('talk');
  youLine('Requesting Oversight review.');
  sysLine('An Oversight officer in a peaked cap reads the whole case over your shoulder. Fifteen minutes pass.');
  const found = [];
  c.items.filter((i) => i.contraband && !i.probed).forEach((i) => { i.examined = true; i.probed = true; found.push(i.probe); });
  if (c.escNote) found.push(c.escNote);
  if (c.guilty && !found.length && c.flaw) found.push(`Legal: ${c.flaw.note ? tpl(c.flaw.note, c.ctx) : 'This should not go out.'}`);
  c.searchNotes = c.searchNotes || [];
  if (found.length) {
    c.evidenceFound = true;
    found.forEach((f) => { sysLine(`OVERSIGHT: ${f}`, 'alert'); c.searchNotes.push(`Oversight: ${f}`); });
    if (c.fraudster) c.demeanour = 'hostile';
  } else {
    sysLine('OVERSIGHT: Nothing irregular. The officer notes that you asked. Your Score notes it too.', 'good');
    c.searchNotes.push('Oversight: nothing irregular');
    S.rep = Math.max(0, S.rep - 1);
    if (!c.guilty) { c.irritation += 2; c.complained = true; themLine(drawLine(LINES.complain)); }
  }
  renderDesk(); renderEvidence(); renderTraveller();
  stampFx('OVERSIGHT REQUESTED', 'esc');
  autosave();
}

function decideStart(dec) {
  const c = UI.cur;
  if (UI.busy) return;
  if (tutHoldsDecision()) return;
  if (c.bribe > 0 && !c.bribeOffered && dec !== 'approve') {
    c.bribeOffered = true;
    const gift = pickLine([`a Tier 1 ration card (worth $${c.bribe})`, `$${c.bribe} in unlogged cash`, `a +${Math.round(c.bribe / 10)} Score “correction” for your mother`]);
    openModal('A QUIET OFFER', `<p>${esc(c.first)} leans over the desk and lowers their voice.</p><p style="color:var(--meat-dark)">“${esc(pickLine(['Look, can we just… not, today?', 'Nobody needs to know about this one.', 'I’ll make it worth your while.']))}”</p><p>The offer: <b>${esc(gift)}</b>. Just sign it.</p>`, [
      { label: 'Take it and sign', cls: 'deny', fn: () => { closeModal(); c.tookBribe = true; S.money += c.bribe; S.totals.bribes += c.bribe; bump('corruption', 1); bump('suspicion', 1); Sound.play('coin'); finalize('approve'); } },
      { label: 'Refuse', cls: 'primary', fn: () => { closeModal(); youLine('No.'); decideStart(dec); } }
    ]);
    return;
  }
  const added = storyPageCost(dec, c);
  const costLine = added > 0 ? `<p><b>${plan() && plan().watch ? 'Ines is watching: ' : ''}Oversight will add ${pages(added)} to your file.</b></p>` : '';
  if (dec === 'detain') {
    openModal('WITHHOLD SIGNATURE', `<p>Withhold your signature from <b>${esc(c.title)}</b>? It stops here and gets logged with Oversight under your name.</p>${costLine}<p style="color:var(--text-dim)">${costLine ? 'If the decision was lawful, it also costs pay and Score.' : WITHHOLD_WARNING + ' It costs pay and Score too.'} Sometimes it’s worth it. That’s for you to decide.</p>`, [
      { label: 'Cancel', fn: closeModal },
      { label: 'Withhold', cls: 'detain', fn: () => { closeModal(); finalize('detain'); } }
    ]);
    return;
  }
  if (costLine) {
    const verb = dec === 'approve' ? 'Countersign' : 'Return';
    openModal(dec === 'approve' ? 'COUNTERSIGN' : 'RETURN FOR CORRECTION', `<p>${verb} <b>${esc(c.title)}</b>?</p>${costLine}`, [
      { label: 'Cancel', fn: closeModal },
      { label: verb, cls: 'primary', fn: () => { closeModal(); finalize(dec); } }
    ]);
    return;
  }
  finalize(dec);
}

// Pages a story decision will add to the Oversight file, worked out on copies before you sign. Generic cases never
// say: their cost would give the answer away (a lawful withhold is +1 page, a harmful one is free).
function storyPageCost(dec, c) {
  const story = c.story && STORY_PEOPLE[c.story];
  if (!story || !story.judge) return 0;
  const sim = JSON.parse(JSON.stringify(S));
  const res = story.judge(dec, JSON.parse(JSON.stringify(c)), sim);
  const O = OUTCOME[res.outcome] || {};
  const watched = plan() && plan().watch && (O.ok === 0 || res.outcome === 'defied') ? 1 : 0;
  return (sim.stats.suspicion || 0) - (S.stats.suspicion || 0) + watched;
}

function judgeGeneric(dec, c) {
  if (c.guilty) {
    if (dec === 'detain') return { outcome: 'caught' };
    if (dec === 'deny') return { outcome: 'turned' };
    return { outcome: 'missed' };
  }
  if (c.defects.length) {
    if (dec === 'deny') return { outcome: 'correct_deny' };
    // A clerical slip that happens to point at someone else's record: withholding is over-cautious, not wrong.
    // Withholding any clerical slip is over-cautious (§3): a little pay, no page, never "lawful decision withheld".
    if (dec === 'detain' && c.defects.some((d) => d.other)) return { outcome: 'overcautious', note: 'Over-cautious. It points at someone else’s record, but a wrong number, ID or name in the letter is still clerical under §3. A Return would do.' };
    if (dec === 'detain') return { outcome: 'overcautious', note: 'Over-cautious. A clerical slip is a Return under §3. Withholding it costs a little and adds no page.' };
    return { outcome: 'breach' };
  }
  if (dec === 'approve') return { outcome: 'helped' };
  if (dec === 'deny') return { outcome: 'wrong_deny' };
  return { outcome: 'wrong_detain' };
}

// Where a flaw could be seen: the draft line, the stamp, the case-file finding. Never the grade note again.
function whereItShowed(c) {
  const out = [];
  const draft = c.docs.find((d) => d.type === 'draft');
  (c.flawFields || []).forEach((k) => {
    const f = draft && draft.fields.find((x) => x.k === k);
    if (f) out.push(`CHUCK’s draft${f.label ? ', ' + f.label : ''}: “${clip(f.v, 70)}”`);
  });
  const kind = c.flaw && c.flaw.kind;
  const st = c.docs.find((d) => d.type === 'stamp');
  if (kind === 'stampMissing') out.push('The papers: no stamp attached, and the register says one is needed.');
  else if (kind && /^stamp/.test(kind) && st) {
    const fv = (k) => (st.fields.find((x) => x.k === k) || {}).v;
    out.push(`The stamp: ${st.seal.glyph} in ${st.seal.color} ink, reference ${fv('ref')}, approved by ${fv('by')}${kind === 'stampDate' ? `, dated ${fv('date')}; the order was raised ${c.raised}` : ''}.`);
  }
  if (kind === 'noattach') out.push('The draft: no attachment, though the order needs one.');
  c.items.filter((i) => i.contraband && i.tell).forEach((i) => out.push(`${i.name}: ${i.tell}`));
  (c.clues || []).forEach((x) => out.push(x));
  return [...new Set(out)].slice(0, 3);
}

function isFlawFlag(c, f) {
  return (f.doc === 'draft' && (c.flawFields || []).includes(f.field)) || (f.doc === 'stamp' && !!c.flaw && /stamp/.test(c.flaw.kind || ''));
}
function flaggedFlaw(c) { return c.flags.some((f) => isFlawFlag(c, f)); }

function finalize(dec) {
  const c = UI.cur;
  const token = UI.runToken;
  const live = () => UI.runToken === token;
  UI.busy = true;
  tutStop();
  toggleQuestions(false);
  setPane('talk');
  spend(1);
  const story = c.story && STORY_PEOPLE[c.story];
  const before = S.affected || 0;
  const filedBefore = S.stats.suspicion || 0;
  let res;
  if (story && story.judge) res = story.judge(dec, c, S);
  else if (c.cruel) {
    if (dec === 'approve') { bump('conscience', -1); S.affected = before + c.cruel.harm; res = { outcome: 'helped' }; }
    else if (dec === 'deny') { bump('conscience', 1); res = { outcome: 'soft_refused', note: nightlyPick(S, 'softNote', softNotes(c)) }; }
    else { bump('conscience', 2); bump('suspicion', 1); res = { outcome: 'refused', note: nightlyPick(S, 'standNote', LINES.standNote) }; }
  } else {
    res = judgeGeneric(dec, c);
    if (dec === 'approve' && c.guilty && c.weighty) S.affected = before + 1;
    if (res.outcome === 'wrong_detain') bump('suspicion', 1);
  }
  S.shift.affected = (S.shift.affected || 0) + ((S.affected || 0) - before);
  const O = OUTCOME[res.outcome];
  let pay = Math.round(O.pay * (O.pay < 0 ? diff().penalty : 1));
  let rep = O.rep;
  const falseFlags = c.flags.filter((f) => !isFlawFlag(c, f)).length;
  const evidence = (c.evidenceFound || flaggedFlaw(c)) && falseFlags <= 1;
  const bonusDue = res.outcome === 'caught' || (res.outcome === 'correct_deny' && c.returnBonus);
  if (bonusDue && evidence) pay += 15;
  // The report says why an evidence bonus was missed: nothing flagged or found, or the flags were on the wrong lines.
  const bonusMiss = bonusDue && !evidence ? (c.flags.length ? 'wrong' : 'none') : '';
  if (res.outcome === 'helped' && c.complained) rep -= 1;
  if (c.tookBribe) rep -= 1;
  if (plan() && plan().watch && (O.ok === 0 || res.outcome === 'defied')) bump('suspicion', 1);
  // Near the top the Score is hard to move: gains halve above 80% and quarter above 90%.
  if (rep > 0) rep *= S.rep > 95 ? 0.125 : S.rep > 90 ? 0.25 : S.rep > 80 ? 0.5 : 1;
  const scoreBefore = align(S.rep);
  S.money += pay;
  S.rep = Math.max(0, Math.min(100, S.rep + rep));
  const scoreDelta = align(S.rep) - scoreBefore;
  const sentBad = dec === 'approve' && (c.guilty || c.defects.length || c.cruel);
  let truth = c.truthNote || (c.guilty ? 'Harmful.' : c.defects.length ? 'Needed fixing.' : 'Correct.');
  if (O.ok < 1) truth = truth.replace(/^Correct\.\s*/, 'Nothing was wrong with it. ').trim();
  const rec = {
    cruel: !!c.cruel, sid: c.sid, name: `${c.first} ${c.last}`, dept: c.dept, title: c.title, decision: dec, outcome: res.outcome, ok: O.ok, label: O.label,
    note: res.note || '', guilty: c.guilty, truth,
    clues: whereItShowed(c).filter((w) => w !== truth && w !== c.truthNote && w !== res.note), fallout: sentBad && c.fallout ? c.fallout : '', evidence: !!evidence, pay, bribe: c.tookBribe ? c.bribe : 0, story: !!c.story,
    readFile: c.items.some((i) => i.examined || i.probed), lawful: !c.guilty && !c.defects.length, oversight: !!c.searched, bonusMiss
  };
  S.shift.records.push(rec);
  if (!c.story && c.ctx && c.ctx.cit) (S.citizenLog = S.citizenLog || {})[c.ctx.cit.name] = { tpl: c.tpl, decision: dec, day: S.day };
  registryAdd(c, rec);
  S.shift.current = null;
  S.shift.index += 1;
  S.shift.clock += COSTS.walk;
  autosave();
  const stampTxt = dec === 'approve' ? 'COUNTERSIGNED' : dec === 'deny' ? 'RETURNED' : 'WITHHELD';
  stampFx(stampTxt, dec === 'approve' ? 'ok' : dec === 'deny' ? 'no' : 'det');
  announce(`Stamp: ${stampTxt}. ${pay >= 0 ? '+' : ''}${money(pay)}, Score ${scoreDelta >= 0 ? '+' : '−'}${Math.abs(scoreDelta)}.`);
  Sound.play(dec === 'detain' ? 'alarm' : 'stamp');
  UI.chuckMood = dec === 'approve' ? 'happy' : 'alert';
  youLine(dec === 'approve' ? 'Countersigned.' : dec === 'deny' ? 'Returned for correction. Fix it and bring it back.' : 'I’m withholding my signature.');
  // Post-decision beats wait while a dialog (pause, statutes) is open, then carry on.
  const later = (fn, ms) => setTimeout(function run() {
    if (!live()) return;
    if (UI.modalOpen) { setTimeout(run, 300); return; }
    fn();
  }, ms);
  later(() => themLine(c.exit && c.exit[dec] ? c.exit[dec] : drawLine(EXIT_LINES[dec])), 300);
  later(() => chuckLine(drawLine(LINES.decide[dec])), 600);
  if (res.note) later(() => sysLine(res.note), 900);
  // A return that cost a page (a RENDER sheet doesn't go back) gets Marta's other line: she never says a return is free
  // right after one wasn't.
  const returnFiled = res.outcome === 'soft_refused' && (S.stats.suspicion || 0) > filedBefore;
  if (returnFiled && !S.flags.renderReturnNoted) later(() => { S.flags.renderReturnNoted = true; sysLine('Marta, passing your desk: “RENDER doesn’t go back. Returning a RENDER sheet is a page in your file, same as a withhold. Anything else, a return only buys them a few days.”'); autosave(); }, 1300);
  else if (res.outcome === 'soft_refused' && !returnFiled && !S.flags.softNoted) later(() => { S.flags.softNoted = true; sysLine('Marta, passing your desk: “Returning it buys them a few days. Only a withheld signature goes on the record as a stand.”'); autosave(); }, 1300);
  later(() => {
    UI.walk = REDUCED_MOTION.matches ? null : { from: 0, to: 90, start: performance.now(), dur: 600 };
    later(() => {
      UI.cur = null;
      UI.busy = false;
      nextItem();
    }, 650);
  }, 2000);
}

// Desktop: the desk turns to the draft (or the order) and the stamp lands inside that paper, in the part in view.
// A closed case (UI.busy) may show a paper the player never opened; an Oversight request only turns to opened ones.
// Phones, or no paper: the stamp lands on a slip over the scene card, never over the conversation.
function stampFx(text, cls) {
  const c = UI.cur;
  if (isMobile() || !c) { stampSlip(text, cls); return; }
  const has = (t) => c.docs.some((d) => d.type === t);
  const tab = c.openedDraft && has('draft') ? 'draft' : c.openedAsk && has('ask') ? 'ask' : UI.busy ? (has('draft') ? 'draft' : has('ask') ? 'ask' : null) : null;
  const body = $('desk-body');
  if (tab && UI.deskTab !== tab) { UI.deskTab = tab; renderDesk(); body.scrollTop = 0; }
  const doc = body.querySelector('.doc');
  if (!doc || doc.offsetParent === null) { stampSlip(text, cls); return; }
  const paper = (getComputedStyle(doc).backgroundColor.match(/\d+/g) || [255, 253, 248]).slice(0, 3).map(Number);
  const d = doc.getBoundingClientRect(), b = body.getBoundingClientRect();
  // The largest whole-pixel stamp that fits the paper's width and the part of it in view.
  const seen = Math.min(d.bottom, b.bottom) - Math.max(d.top, b.top);
  let ink = null;
  for (let s = 5; s >= 2 && !ink; s--) {
    const cv = Art.stamp(cls, text, s, paper);
    if (s === 2 || (parseFloat(cv.style.width) <= doc.clientWidth - 24 && parseFloat(cv.style.height) <= seen * 0.6)) ink = cv;
  }
  doc.appendChild(ink);
  ink.classList.add('on-paper');
  const half = ink.offsetHeight / 2 + 6;
  const mid = (Math.max(d.top, b.top) + Math.min(d.bottom, b.bottom)) / 2 - d.top;
  ink.style.left = `${Math.round(d.width / 2)}px`;
  ink.style.top = `${Math.round(Math.max(half, Math.min(d.height - half, mid)))}px`;
  doc.classList.add('thump');
}
function stampSlip(text, cls) {
  const panel = $('portrait-panel'), scene = $('scene-canvas');
  const slip = document.createElement('div');
  slip.className = 'stamp-slip';
  slip.appendChild(Art.stamp(cls, text, 2));
  panel.appendChild(slip);
  const p = panel.getBoundingClientRect(), r = scene.getBoundingClientRect();
  const hw = slip.offsetWidth / 2 + 2, hh = slip.offsetHeight / 2 + 2;
  const x = Math.max(hw, Math.min(p.width - hw, r.left + r.width / 2 - p.left));
  const y = Math.max(hh, Math.min(p.height - hh, r.top + r.height * 0.6 - p.top));
  slip.style.left = `${Math.round(x)}px`;
  slip.style.top = `${Math.round(y)}px`;
  setTimeout(() => slip.remove(), 1800);
}

/* ================= REPORT ================= */
function endShift() {
  S.phase = 'report';
  const sh = S.shift;
  const over = Math.max(0, sh.clock - shiftEnd());
  const ot = overtimeRule();
  const otPay = Math.ceil(over / 15) * overtimePrice(ot);
  const otRep = Math.floor(over / 30);
  const recs = sh.records;
  const earned = recs.reduce((s, r) => s + Math.max(0, r.pay), 0);
  const penalties = recs.reduce((s, r) => s + Math.min(0, r.pay), 0);
  // Endless: a file at the audit line means Oversight holds the next shift's day rate.
  const audit = !!(S.endless && S.auditDue);
  const wage = audit ? 0 : dayWage();
  S.money += wage - otPay;
  S.rep = Math.max(0, S.rep - otRep);
  const score = recs.reduce((s, r) => s + r.ok, 0);
  let stars = Math.max(1, Math.round(score));
  if (recs.some((r) => r.outcome === 'wrong_detain')) stars = Math.min(stars, 2);
  stars = score >= 4.99 ? 5 : Math.min(stars, 4);
  if (over > 0) stars = Math.min(stars, ot.cap);
  const living = livingCost();
  S.money -= living;
  const broke = S.money < 0;
  if (broke) S.rep = Math.max(0, S.rep - 0.5);
  // Debt: every night below zero costs Score and brings the landlord; a second night in a row also costs your mother a tier
  // (never after the last decision on day 10: there is nothing left you could do about it).
  S.debtNights = broke ? (S.debtNights || 0) + 1 : 0;
  const momDrop = broke && S.debtNights >= 2 && !S.endless && S.day >= MOM_RATE.first && S.day < CAMPAIGN_DAYS && !S.flags.momCard && momTier(S) < 4;
  if (momDrop) { Object.assign(S.flags, momSoftDrop(S)); S.flags.momDebtDrops = (S.flags.momDebtDrops || 0) + 1; }
  const file = S.stats.suspicion || 0;
  S.auditDue = !!S.endless && file >= ENDLESS.auditPages;
  const summary = {
    day: S.day, inspected: recs.length,
    clean: recs.filter((r) => (r.lawful === undefined ? !r.guilty : r.lawful)).length,
    affected: sh.affected || 0,
    caught: recs.filter((r) => r.outcome === 'caught').length,
    turned: recs.filter((r) => r.outcome === 'turned').length,
    missed: recs.filter((r) => r.outcome === 'missed').length,
    wrongRejected: recs.filter((r) => r.outcome === 'wrong_deny' || r.outcome === 'wrong_detain').length,
    refused: recs.filter((r) => r.outcome === 'refused').length,
    softRefused: recs.filter((r) => r.outcome === 'soft_refused').length,
    overcautious: recs.filter((r) => r.outcome === 'overcautious').length,
    defied: recs.filter((r) => r.outcome === 'defied').length,
    breaches: recs.filter((r) => r.outcome === 'breach').length,
    success: recs.filter((r) => r.ok >= 1).length,
    stars, earned, penalties, overtime: over, otPay, otCap: over > 0 ? ot.cap : null, wage, audit, bribes: recs.reduce((s, r) => s + r.bribe, 0) + (sh.gifts || 0),
    living, broke, debtNights: S.debtNights, momDrop, file, fileDelta: Math.max(0, file - (sh.fileStart === undefined ? file : sh.fileStart)), readFile: recs.some((r) => r.readFile)
  };
  S.totals.inspected += recs.length;
  S.totals.ok += summary.success;
  S.totals.caught += summary.caught;
  S.totals.missed += summary.missed;
  S.totals.wrong += summary.wrongRejected;
  S.totals.refused = (S.totals.refused || 0) + summary.refused;
  S.totals.softRefused = (S.totals.softRefused || 0) + summary.softRefused;
  S.totals.overcautious = (S.totals.overcautious || 0) + summary.overcautious;
  S.totals.defied = (S.totals.defied || 0) + summary.defied;
  summary.overtimeDay = over > 0;
  S.totals.helped += recs.filter((r) => r.outcome === 'helped').length;
  S.totals.earned += earned + wage;
  S.totals.readFile = (S.totals.readFile || 0) + recs.filter((r) => r.readFile).length;
  S.totals.penalties += penalties - otPay;
  S.totals.living = (S.totals.living || 0) + living;
  // Lines heard in the last two shifts are avoided while the pools allow.
  S.prevLines = (S.lastLines || []).concat(sh.usedLines || []);
  S.lastLines = (sh.usedLines || []).slice();
  S.history.push(summary);
  if (S.endless) saveEndlessRecord();
  S.lastReport = { summary, records: recs, chuckSaid: (sh.chuckSaid || []).slice() };
  autosave();
  showReport();
}

function endlessRecord() {
  const r = store.get(KEYS.records, null);
  const n = (v) => (finiteNum(v) && v >= 0 ? Math.floor(v) : 0);
  return isObj(r) ? { longest: n(r.longest), refused: n(r.refused), last: n(r.last), lastEnd: ['bust', 'reloc'].includes(r.lastEnd) ? r.lastEnd : null } : { longest: 0, refused: 0 };
}
function saveEndlessRecord() {
  const rec = endlessRecord();
  const n = endlessShift();
  const refused = (S.totals.refused || 0) + (S.totals.softRefused || 0) - (S.endlessRefusedBase || 0);
  store.set(KEYS.records, { longest: Math.max(rec.longest, n), refused: Math.max(rec.refused, refused), last: n, lastEnd: S.phase === 'ending' ? S.ending : null });
}

const RATING = { 5: 'Exemplary proxy!', 4: 'Compliant.', 3: 'Adequate. CHUCK is watching your numbers.', 2: 'Poor. Oversight has been notified.', 1: 'Unacceptable. A Score review is being drafted (by CHUCK).' };

function showReport() {
  show('screen-report');
  Sound.setTrack('menu');
  const { summary: s, records } = S.lastReport;
  const marks = OUTCOME_MARK;
  const decWord = (r) => (r.decision === 'approve' ? 'Countersigned' : r.decision === 'deny' ? 'Returned' : 'Withheld');
  const row = (label, v) => `<tr><td>${esc(label)}</td><td class="n">${v}</td></tr>`;
  const stars = '★'.repeat(s.stars) + `<span class="off">${'★'.repeat(5 - s.stars)}</span>`;
  const affected = (s.affected || 0).toLocaleString('en-US');
  const harmSigned = records.some((r) => r.outcome === 'missed');
  const harmText = harmSigned
    ? `Harm went out under your signature today.${s.affected ? ` People affected by what you countersigned: ${affected}.` : ''}`
    : s.affected ? `Everything you signed today was lawful. People affected by it: ${affected}.` : 'Nobody was harmed by what you signed today. As far as you know.';
  const harmLine = esc(harmText).replace(affected + '.', `<b>${affected}</b>.`);
  const file = s.file === undefined ? S.stats.suspicion || 0 : s.file;
  const fileLine = `Your Oversight file: ${pages(file)} (+${s.fileDelta || 0} today).`;
  const mood = (s.fileDelta || 0) >= 2 ? 'sweat' : s.readFile ? 'peek' : 'shades';
  const caption = badgeCaption(mood, { perfect: s.stars === 5, key: 'report' });
  $('report-wrap').innerHTML = `<div class="report">
    <div class="rep-sky"><canvas class="px" id="rep-sky" aria-hidden="true"></canvas></div>
    <div class="rep-head">
      <canvas class="px badge" id="rep-badge" width="96" height="80" role="img" aria-label="The meat proxy. ${esc(caption)}"></canvas>
      <div><h2 id="rep-title" tabindex="-1">SHIFT ${String(s.day).padStart(2, '0')} — DAILY REPORT</h2>
      <div class="sub">DISTRICT 7 COUNTERSIGNATURE OFFICE · ${esc(S.officer.toUpperCase())} · ${esc(longDate(dayDate(S.day)).toUpperCase())}</div>
      <div class="badge-cap">${esc(caption)}</div></div>
    </div>
    <div class="cols">
      <div><table>
        ${row('Decisions reviewed', s.inspected)}
        ${row('Lawful decisions', s.clean)}
        ${row('Harm withheld', s.caught)}
        ${row('Harm only returned', s.turned)}
        ${row('Harm countersigned', s.missed)}
        ${row('Lawful decisions blocked', s.wrongRejected)}
        ${row('Withheld on conscience', s.refused || 0)}
        ${row('Returned on conscience', s.softRefused || 0)}
        ${s.overcautious ? row('Over-cautious withholds', s.overcautious) : ''}
        ${s.defied ? row('Oversight orders defied', s.defied) : ''}
        ${row('Statute breaches', s.breaches)}
        ${row('Fully compliant reviews', `${s.success}/${s.inspected}`)}
      </table>
      <div class="stars" role="img" aria-label="${s.stars} of 5 stars">${stars}</div>
      <div class="verdict-line">${s.stars}-STAR SHIFT — ${esc(RATING[s.stars].toUpperCase())}</div>
      ${s.overtime ? `<div class="ot-line">Capped at ${s.otCap || 4} stars: you clocked out ${s.overtime} minutes late. Overtime cost ${money(s.otPay)}.</div>` : ''}
      <div class="conscience">${harmLine}</div>
      <div class="file-line${file >= 6 ? ' warn' : ''}">${esc(fileLine)}</div></div>
      <div><table>
        ${row(s.audit ? 'Day rate (held: Oversight audit)' : 'Day rate', money(s.wage === undefined ? BASE_WAGE : s.wage))}
        ${row('Bonuses earned', '+' + money(s.earned))}
        ${row('Deductions', money(s.penalties))}
        ${s.otPay ? row(`Overtime (${s.overtime} min late)`, '−' + money(s.otPay)) : ''}
        ${s.bribes ? row('“Gifts” (unreported)', '+' + money(s.bribes)) : ''}
        ${s.living ? row('Rent & protein', '−' + money(s.living)) : ''}
        ${row('Savings', money(S.money))}
        ${row('Alignment Score', align(S.rep))}
        ${row('Harm withheld, all time', S.totals.caught)}
        ${row('People affected, all time', (S.affected || 0).toLocaleString('en-US'))}
        ${row('Overall accuracy', `${accuracy()}%`)}
      </table>
      ${s.broke ? '<div class="broke-line">Savings went below zero. The Score counts debt as a mood: −5.</div>' : ''}</div>
    </div>
    <div class="case-list">${records.map((r) => `
      <div class="case"><div class="mark ${marks[r.outcome]}">${marks[r.outcome] === 'ok' ? '✓' : marks[r.outcome] === 'part' ? '~' : '✗'}</div>
      <div><div class="t">${esc(r.title)} · ${esc(r.name)} (${esc(r.dept)}) — ${decWord(r)} · ${esc(r.label)} · ${r.pay >= 0 ? '+' : ''}${money(r.pay)}${r.bonusMiss === 'none' ? ' (no line flagged: no evidence bonus)' : r.bonusMiss === 'wrong' ? ' (wrong line flagged: no evidence bonus)' : ''}</div>
      <div class="d">${esc(r.truth)}</div>
      ${r.fallout ? `<div class="fall">What happened next: ${esc(r.fallout)}</div>` : ''}
      ${r.note ? `<div class="d"><i>${esc(r.note)}</i></div>` : ''}
      ${r.clues.length && marks[r.outcome] !== 'ok' ? `<div class="clue">Where it showed: ${esc(r.clues.join(' · '))}</div>` : ''}</div></div>`).join('')}
    </div></div>
    <div class="report-actions"><button class="btn small" id="rep-copy">Copy shift report</button><span class="spacer"></span><button class="btn" id="rep-save">Save game</button><button class="btn primary" id="rep-next">${S.rep <= 0 ? 'See Marta' : 'Clock out'}</button></div>`;
  $('report-wrap').scrollTop = 0;
  Art.proxyBadge($('rep-badge'), mood);
  const sky = $('rep-sky');
  Art.live(sky, (t) => Art.skyline(sky, skyDay(), weatherToday(), t), { h: 30, s: 2 });
  announce(`Shift ${s.day} report. ${s.stars} of 5 stars. ${harmText} ${fileLine}`);
  $('rep-save').addEventListener('click', () => openLoad(true));
  $('rep-copy').addEventListener('click', (e) => shareOrCopy(reportShareText(s, records, caption), e.currentTarget, false));
  $('rep-next').addEventListener('click', () => {
    Sound.play('click');
    if (S.rep <= 0) return finishEnding('dismissed');
    S.phase = 'evening';
    autosave();
    playEvening();
  });
  $('rep-title').focus({ preventScroll: true });
}

// ✅ countersigned correctly · ↩️ returned · ✋ withheld · 👁 Oversight called · ❌ wrong. A right withhold never reads as red.
function decisionSquare(r) {
  if (r.ok === 0) return '❌';
  if (r.oversight) return '👁';
  return r.decision === 'approve' ? '✅' : r.decision === 'deny' ? '↩️' : '✋';
}
function bestChuckLine(said) {
  const fit = (said || []).filter((t) => t.length >= 24 && t.length <= 90 && !/[{}]/.test(t));
  return fit.sort((a, b) => b.length - a.length)[0] || '';
}
function reportShareText(s, records, caption) {
  const quote = bestChuckLine(S.lastReport && S.lastReport.chuckSaid);
  return [
    `MEAT PROXY · Shift ${String(s.day).padStart(2, '0')} · ${'★'.repeat(s.stars)}${'☆'.repeat(5 - s.stars)}`,
    records.map(decisionSquare).join(''),
    quote ? `CHUCK: “${quote}”` : caption,
    `People affected by what I countersigned today: ${(s.affected || 0).toLocaleString('en-US')}.`,
    SHARE_URL
  ].join('\n');
}

function playEvening() {
  S.phase = 'evening';
  if (S.endless) {
    if ((S.stats.suspicion || 0) >= ENDLESS.relocPages) { finishEnding('reloc'); return; }
    if ((S.debtNights || 0) >= ENDLESS.bustNights) { finishEnding('bust'); return; }
    nextDay();
    return;
  }
  if (S.day >= CAMPAIGN_DAYS) {
    playScene(SCENES.final(S), { sceneId: 'final', date: `<b>4:58 P.M.</b> · AMENDMENT DAY`, side: eveningSide(), doneLabel: 'Continue', place: scenePlace('final'), onDone: () => finishEnding(resolveEnding(S, 'stay')), onEnding: (e) => finishEnding(resolveEnding(S, e)) });
    return;
  }
  const f = SCENES['eve' + S.day];
  const lines = (f ? f(S) : [L('narrator', 'You take the 22 home. So does a drone.')]).concat(fileWarnings(), debtLine(), alignFlavour(), momLines(S));
  autosave();
  playScene(lines, { sceneId: 'eve' + S.day, date: `<b>EVENING</b> · ${esc(longDate(dayDate(S.day)).toUpperCase())}`, side: eveningSide(), doneLabel: 'Go home', place: scenePlace('eve' + S.day), onDone: nextDay });
}

function fileWarnings() {
  const out = [];
  const file = S.stats.suspicion || 0;
  // The flag is saved when the evening ends, with its choices, so a reload before Go home replays the warning.
  if (file >= 5 && !S.flags.fileWarn5) out.push(Object.assign(L('marta', 'Ines asked for your file today. It’s getting heavier. I didn’t ask what was in it. Don’t make me.'), { seen: 'fileWarn5' }));
  if (file >= 8 && !S.flags.fileWarn8) out.push(Object.assign(L('narrator', 'On your way out you pass Oversight’s glass office. A grey folder with your name on the tab is standing up on the desk. On its own.'), { seen: 'fileWarn8' }));
  return out;
}

const LANDLORD = [
  'Your landlord’s app turns your balance red and adds a banner: “We value you as a resident. Conditionally.”',
  'A notice on your door from the landlord: “Second night in arrears. Your door code is under review.” The code still works. For now.',
  'The landlord’s drone hovers at your window long enough to photograph the furniture. It takes the good angle.'
];
function debtLine() {
  const h = S.history[S.history.length - 1];
  if (!h || !h.broke) return [];
  const nights = h.debtNights || 1;
  const out = [L('narrator', `Rent and protein came out. Your savings are below zero. ${LANDLORD[Math.min(nights, LANDLORD.length) - 1]} The Score treats debt as a mood, and docks you five.`)];
  if (h.momDrop) out.push(L('narrator', MOM_DEBT_DROP[Math.max(0, Math.min(MOM_DEBT_DROP.length, S.flags.momDebtDrops || 1) - 1)]));
  return out;
}

// One line a night from the Score band's pool, never one heard in the last four nights.
function alignFlavour() {
  const a = align(S.rep);
  const band = a < 250 ? 'floor' : a < 400 ? 'low' : a > 750 ? 'high' : 'mid';
  const seen = S.flavourSeen || [];
  const pool = LINES.evening[band].filter((l) => !seen.includes(l));
  const line = makeRng(hashStr(`${S.seed}:eve:${S.day}`)).pick(pool.length ? pool : LINES.evening[band]);
  return [Object.assign(L('narrator', line.replace('{a}', a)), { onShow: () => { S.flavourSeen = seen.concat(line).slice(-4); } })];
}

function eveningSide() {
  const h = S.history[S.history.length - 1];
  return `<div class="memo"><h3>NOTES APP</h3><div class="from">${esc(S.officer)}</div>
    <p style="margin:0 0 6px">Alignment Score: ${align(S.rep)}<br>Savings: ${money(S.money)}${h && h.living ? `<br>Rent &amp; protein: −${money(h.living)}` : ''}<br>Oversight file: ${pages(S.stats.suspicion || 0)}<br>Last shift: ${h ? '★'.repeat(h.stars) : '—'}</p>
    <p style="margin:0;color:#6b5f4a">${esc(makeRng(S.day * 13).pick(GENERAL_LINES))}</p></div>`;
}

// Nightly drift: the higher the Score, the harder it settles.
function nightlyDrift(rep) { return rep > 95 ? 2 : rep > 90 ? 1 : 0.3; }
function nextDay() {
  S.day += 1;
  S.rep = Math.max(0, Math.round((S.rep - nightlyDrift(S.rep)) * 10) / 10);
  if (S.flags.dinoReported && !S.flags.dinoFriction) { S.flags.dinoFriction = true; S.rep = Math.max(0, S.rep - 1.5); }
  S.shift = null;
  S.bulletin = [];
  startDay();
}

function finishEnding(key) {
  S.phase = 'ending';
  S.ending = key;
  if (ENDINGS[key] && ENDINGS[key].endless) saveEndlessRecord();
  const got = readEndings();
  got[key] = true;
  store.set(KEYS.endings, got);
  autosave();
  showEnding(key);
}

function showEnding(key) {
  show('screen-ending');
  Sound.setTrack('menu');
  const E = ENDINGS[key] || ENDINGS.autosigned;
  const got = readEndings();
  const st = S.stats;
  // The proxy badge's caption describes how this run was played, not the ending's mood.
  const { mood, caption } = endingBadge(S);
  const doors = E.endless ? [] : otherDoors(Object.assign({}, got, { [key]: true }), key);
  $('ending').innerHTML = `
    <div class="end-art"><canvas class="px" id="end-art" width="160" height="72" aria-hidden="true"></canvas></div>
    <div class="end-head">
      <canvas class="px badge" id="end-badge" width="96" height="80" role="img" aria-label="The meat proxy. ${esc(caption)}"></canvas>
      <div><div class="eyebrow">${E.endless ? `ENDLESS RUN · ${plural(endlessShift(), 'SHIFT').toUpperCase()}` : `ENDING ${CAMPAIGN_ENDINGS().filter((k) => got[k]).length} OF ${CAMPAIGN_ENDINGS().length} FOUND`}</div>
      <h2 id="end-title" tabindex="-1">${esc(E.title)}</h2>
      <div class="badge-cap">${esc(caption)}</div></div>
    </div>
    ${endingText(key, S).map((p) => `<p>${esc(p)}</p>`).join('')}
    <div class="memo"><h3>COUNTERSIGNER FILE (CLOSED)</h3><div class="from">${esc(S.officer)} · ${plural(S.history.length, 'shift')}</div>
      <p style="margin:0">Decisions reviewed: ${S.totals.inspected} · Compliance: ${accuracy()}% · Harm withheld: ${S.totals.caught} · Withheld on conscience: ${withheldCount(S)} · Returned on conscience: ${returnedCount(S)}${S.totals.overcautious ? ` · Over-cautious withholds: ${S.totals.overcautious}` : ''}${S.totals.defied ? ` · Oversight orders defied: ${S.totals.defied}` : ''}<br>
      People affected by your signature: ${(S.affected || 0).toLocaleString('en-US')} · Alignment Score: ${align(S.rep)} · Savings: ${money(S.money)} · “Gifts”: ${money(S.totals.bribes)}<br>
      Loyalty ${st.party} · Conscience ${st.conscience} · Oversight suspicion ${st.suspicion} · Things you read that you can’t unread ${st.truth}</p></div>
    ${doors.length ? `<div class="memo end-doors"><h3>OTHER DOORS</h3><ul style="margin:0;padding-left:18px">${doors.map((d) => `<li><b>${esc(d.title)}</b>: ${esc(d.hint)}</li>`).join('')}</ul></div>` : ''}
    <div class="end-actions">
      <button class="btn primary" id="end-share">Share your file</button>
      <button class="btn" id="end-menu">Main menu</button>
      <button class="btn" id="end-new">New contract</button>
      ${['dismissed', 'relocated', 'scapegoat', 'bust', 'reloc'].includes(key) ? '' : '<button class="btn" id="end-endless">Keep signing (endless)</button>'}
    </div>`;
  Art.proxyBadge($('end-badge'), mood);
  const endArt = $('end-art');
  Art.live(endArt, (t) => Art.ending(endArt, E.art || key, t), { fixed: [160, 72], max: 3 });
  $('end-share').addEventListener('click', (e) => shareOrCopy([
    `MEAT PROXY · ${E.title}`,
    ENDING_HOOKS[key] || '',
    `I countersigned decisions affecting ${(S.affected || 0).toLocaleString('en-US')} ${(S.affected || 0) === 1 ? 'person' : 'people'}. Withheld on conscience: ${withheldCount(S)}. Returned on conscience: ${returnedCount(S)}.`,
    'The AI decides. You sign. You\'re liable.',
    SHARE_URL
  ].filter(Boolean).join('\n'), e.currentTarget, true));
  $('end-menu').addEventListener('click', renderMenu);
  $('end-new').addEventListener('click', () => openNewGame(false));
  const ee = $('end-endless');
  if (ee) ee.addEventListener('click', () => { S.endless = true; S.phase = 'brief'; S.day += 1; S.endlessStart = S.day; S.endlessRefusedBase = refusedCount(S); S.shift = null; startDay(); });
  $('end-title').focus({ preventScroll: true });
}

/* ================= SHARE ================= */
const flashTimers = new WeakMap();
function flashDone(btn, label) {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.textContent = `${label} ✓`;
  btn.classList.add('done');
  announce(`${label}.`);
  clearTimeout(flashTimers.get(btn));
  flashTimers.set(btn, setTimeout(() => { btn.textContent = btn.dataset.label; btn.classList.remove('done'); }, 2400));
}

function showCopyFallback(text, btn) {
  const host = btn.closest('.report-actions, .end-actions') || btn.parentElement;
  let box = host.parentElement.querySelector('.copy-fallback');
  if (!box) {
    box = document.createElement('textarea');
    box.className = 'copy-fallback';
    box.readOnly = true;
    box.setAttribute('aria-label', 'Text to copy');
    host.insertAdjacentElement('afterend', box);
  }
  box.value = text;
  box.rows = text.split('\n').length;
  box.focus();
  box.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch (err) { console.warn('Copy command failed', err); }
  if (copied) flashDone(btn, 'Copied');
  else announce('Copying is blocked here. The text is selected: copy it yourself.');
}

async function shareOrCopy(text, btn, allowShare) {
  if (allowShare && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      flashDone(btn, 'Shared');
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.warn('Share failed, copying instead', err);
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    flashDone(btn, 'Copied');
  } catch (err) {
    console.warn('Clipboard unavailable', err);
    showCopyFallback(text, btn);
  }
}

/* ================= SCENE PLAYER ================= */
// Scene banners: where a scene happens. Briefings open on the day's skyline, then cut to the office.
const SCENE_PLACES = { dino: 'office_am', eve1: 'office_eve', eve2: 'office_eve', eve3: 'street', eve4: 'office_eve', eve5: 'office_eve', eve6: 'street', eve7: 'rooftop', eve8: 'readers', eve9: 'hearing', final: 'tower' };
function scenePlace(key) {
  const where = key === 'eve8' && !S.flags.readers ? 'street' : SCENE_PLACES[key] || (/^eve/.test(key) ? 'office_eve' : 'office_am');
  return { where, weather: weatherToday() };
}
function skyDay() { return S.endless ? 1 + (((S.seed >>> 0) + S.day * 7919) % 10) : S.day; }
function briefingPlace() {
  return { where: 'skyline', day: skyDay(), weather: weatherToday(), then: { where: !S.endless && S.day === 5 ? 'auditorium' : 'office_am', weather: weatherToday() } };
}
function sceneBanner(place) {
  const box = $('scene-banner');
  box.hidden = !place;
  if (!place) return;
  const cv = $('scene-banner-cv');
  Art.live(cv, (t) => Art.place(cv, place.where, t, place), { h: 44, s: isMobile() ? 2 : 3 });
}

function playScene(items, opts) {
  // Scenes are transactional for saves: the state from before the scene is kept until the scene ends (see saveGame).
  UI.scene = S ? { id: opts.sceneId || 'scene', snap: JSON.stringify(S) } : null;
  show('screen-scene');
  sceneBanner(opts.place);
  $('scene-date').innerHTML = opts.date || '';
  const side = $('scene-side');
  const sideHtml = opts.side || '';
  const hasBulletin = /OVERSIGHT BULLETIN/.test(sideHtml);
  const sideLabel = /NOTES APP/.test(sideHtml) ? 'Your notes' : `Today’s statutes${hasBulletin ? ' · Oversight bulletin' : ''}`;
  side.innerHTML = sideHtml && isMobile() ? `<details class="side-details"><summary>${sideLabel}</summary><div class="side-inner">${sideHtml}</div></details>` : sideHtml;
  side.hidden = !sideHtml;
  const log = $('scene-log');
  log.innerHTML = '';
  const choicesEl = $('scene-choices');
  const scrollLog = () => requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  const queue = items.slice();
  let i = 0;
  // Lines that mark themselves seen (file warnings, the nightly Score line) are recorded when the scene ends, together
  // with the choices, so a reload mid-scene replays them.
  const shown = [];
  const settle = () => { shown.splice(0).forEach((it) => { if (it.seen) S.flags[it.seen] = true; if (it.onShow) it.onShow(); }); };
  const cont = (label, fn) => {
    choicesEl.innerHTML = '';
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = label;
    b.addEventListener('click', () => { Sound.play('click'); fn(); });
    choicesEl.appendChild(b);
    UI.sceneNext = fn;
    b.focus({ preventScroll: true });
  };
  const step = () => {
    UI.sceneNext = null;
    if (UI.typing) UI.typing.finish();
    if (i >= queue.length) { cont(opts.doneLabel || 'Continue', () => { UI.sceneNext = null; UI.scene = null; settle(); opts.onDone(); }); return; }
    const it = queue[i++];
    if (i === 2 && opts.place && opts.place.then) sceneBanner(opts.place.then);
    if (it.choices) {
      choicesEl.innerHTML = '';
      it.choices.forEach((ch) => {
        const b = document.createElement('button');
        b.className = 'btn';
        const addsPages = (ch.fx && ch.fx.suspicion) || 0;
        b.innerHTML = esc(ch.text) + (addsPages > 0 ? ` <span class="cost">(+${pages(addsPages)})</span>` : '');
        b.disabled = !!ch.disabled;
        b.addEventListener('click', () => {
          Sound.play('click');
          applyFx(ch.fx);
          if (ch.rep) S.rep = Math.max(0, Math.min(100, S.rep + ch.rep));
          if (ch.set) Object.assign(S.flags, ch.set);
          if (ch.money) {
            S.money += ch.money;
            if (ch.money > 0) Sound.play('coin');
            if (ch.money > 0 && ch.fx && ch.fx.corruption) {
              S.totals.bribes += ch.money;
              if (S.phase === 'booth' && S.shift) S.shift.gifts = (S.shift.gifts || 0) + ch.money;
            }
          }
          if (ch.flag) S.flags[ch.flag] = true;
          addSceneLine({ who: 'you', text: ch.text }, false);
          if (ch.ending) { UI.scene = null; settle(); (opts.onEnding || opts.onDone)(ch.ending); return; }
          queue.splice(i, 0, ...(ch.then || []));
          step();
        });
        choicesEl.appendChild(b);
      });
      const first = choicesEl.querySelector('.btn:not([disabled])');
      if (first) first.focus({ preventScroll: true });
      scrollLog();
      return;
    }
    addSceneLine(it, true);
    if (it.seen || it.onShow) shown.push(it);
    cont('Continue ▸', step);
    scrollLog();
  };
  UI.sceneAdvance = () => { if (UI.typing) { UI.typing.finish(); return; } if (UI.sceneNext) UI.sceneNext(); };
  step();
}

function addSceneLine(it, animate) {
  const log = $('scene-log');
  const npc = NPC[it.who] || NPC.narrator;
  const div = document.createElement('div');
  const kind = it.who === 'narrator' ? 'narr' : it.who === 'general' ? 'radio' : it.who === 'chuck' ? 'chuckline' : '';
  div.className = `scene-line ${kind}`;
  if (kind === 'narr' || kind === 'radio') div.innerHTML = '<div class="txt"></div>';
  else if (it.who === 'you') div.innerHTML = `<div></div><div><div class="who">YOU</div><div class="txt"></div></div>`;
  else div.innerHTML = `<canvas class="px" width="48" height="56"></canvas><div><div class="who">${esc(npc.name.toUpperCase())}</div><div class="txt"></div></div>`;
  log.appendChild(div);
  const cv = div.querySelector('canvas');
  if (cv && npc.chuck) Art.chuckPortrait(cv, 'happy', 1);
  else if (cv && npc.look) Art.photo(cv, npc.look, '#e7dccb', { keepHat: true });
  const tx = div.querySelector('.txt');
  const speaker = it.who === 'you' ? 'You' : kind === 'narr' || kind === 'radio' ? '' : npc.name.split(',')[0];
  announce(speaker ? `${speaker}: ${it.text}` : it.text);
  const scrollLog = () => requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  if (animate) typeInto(tx, it.text, scrollLog);
  else tx.textContent = it.text;
  log.scrollTop = log.scrollHeight;
}

/* ================= MODALS ================= */
function openModal(title, bodyHtml, buttons, wide, focusSel, opener) {
  const m = $('modal');
  if (!UI.modalOpen) UI.modalReturn = opener || document.activeElement;
  m.className = 'modal' + (wide ? ' wide' : '');
  m.innerHTML = `<div class="modal-h"><span id="modal-title">${esc(title)}</span><button class="btn small" id="modal-x" aria-label="Close">✕</button></div><div class="modal-b">${bodyHtml}</div>${buttons && buttons.length ? '<div class="modal-f"></div>' : ''}`;
  const f = m.querySelector('.modal-f');
  (buttons || []).forEach((b) => {
    const el = document.createElement('button');
    el.className = 'btn ' + (b.cls || '');
    el.textContent = b.label;
    el.addEventListener('click', () => { Sound.play('click'); b.fn(); });
    f.appendChild(el);
  });
  $('modal-x').addEventListener('click', closeModal);
  $('overlay').hidden = false;
  UI.modalOpen = true;
  const target = (focusSel && m.querySelector(focusSel)) || m.querySelector('.modal-f .btn.primary') || m.querySelector('.modal-f .btn') || m.querySelector('.btn');
  if (target) target.focus({ preventScroll: true });
  return m;
}
function closeModal() {
  $('overlay').hidden = true;
  UI.modalOpen = false;
  const back = UI.modalReturn;
  UI.modalReturn = null;
  if (back && back.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
}
function modalFocusables() {
  return [...$('modal').querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null);
}
function trapModalTab(e) {
  if (e.key !== 'Tab' || !UI.modalOpen) return;
  const els = modalFocusables();
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  const inside = $('modal').contains(document.activeElement);
  if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
}

function openPause() {
  if (!S) return;
  openModal('PAUSED', `<p>${esc(S.officer)} · ${S.endless ? 'Endless shift' : 'Day ' + S.day + ' of ' + CAMPAIGN_DAYS} · ${esc(fmtDate(dayDate(S.day)))}</p><p style="color:var(--text-dim)">Progress autosaves after every decision.</p>`, [
    { label: 'Quit to menu', fn: () => openModal('QUIT TO MENU', '<p>Go back to the main menu? Your autosave from the last item is kept.</p>', [{ label: 'Cancel', fn: openPause }, { label: 'Quit', cls: 'detain', fn: () => { closeModal(); renderMenu(); } }]) },
    { label: 'Settings', fn: openSettings },
    { label: 'Statute book', fn: () => openRulebook() },
    { label: 'Save / Load', fn: () => openLoad(true) },
    { label: 'Resume', cls: 'primary', fn: closeModal }
  ]);
}

function openLoad(allowSave) {
  const slots = ['auto', 1, 2, 3];
  const body = slots.map((s) => {
    const d = readSave(s);
    const meta = !d ? 'Empty' : !validSave(d) ? 'Damaged file' : `${esc(d.meta.officer)} · ${d.meta.endless ? 'Endless' : 'Day ' + d.meta.day} · ${money(d.meta.money)} · ${esc(new Date(d.meta.when).toLocaleString('en-US'))}`;
    return `<div class="slot"><div><b>${s === 'auto' ? 'Autosave' : 'Slot ' + s}</b><div class="meta">${meta}</div></div><div style="display:flex;gap:8px">
      ${allowSave && s !== 'auto' && S ? `<button class="btn small" data-save="${s}">Save here</button>` : ''}
      ${d ? `<button class="btn small primary" data-load="${s}">Load</button>` : ''}</div></div>`;
  }).join('');
  const m = openModal(allowSave ? 'SAVE / LOAD' : 'LOAD GAME', body, [{ label: 'Close', fn: closeModal }]);
  m.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => {
    const slot = +b.dataset.save;
    const existing = readSave(slot);
    const write = () => { saveGame(slot); openLoad(allowSave); };
    if (!existing) { write(); return; }
    const what = validSave(existing) ? `${existing.meta.officer} · ${existing.meta.endless ? 'Endless' : 'Day ' + existing.meta.day}` : 'a damaged file';
    openModal(`OVERWRITE SLOT ${slot}?`, `<p>Slot ${slot} holds ${esc(what)}. Save over it?</p>`, [
      { label: 'Cancel', fn: () => openLoad(allowSave) },
      { label: 'Save over it', cls: 'detain', fn: write }
    ]);
  }));
  m.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => loadGame(b.dataset.load === 'auto' ? 'auto' : +b.dataset.load, allowSave)));
}

function openSettings(focusSel) {
  const range = (k, label) => `<div class="set-row"><label class="label" for="set-${k}">${label}</label><input type="range" id="set-${k}" min="0" max="1" step="0.05" value="${settings[k]}"></div>`;
  const seg = (k, label, opts) => `<div class="set-row"><span class="label">${label}</span><div class="seg">${opts.map(([v, l]) => `<button class="btn${settings[k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}" aria-pressed="${settings[k] === v}">${l}</button>`).join('')}</div></div>`;
  const body = range('master', 'Master volume') + range('music', 'Music') + range('ambience', 'Office ambience') + range('sfx', 'Effects') +
    seg('textSpeed', 'Text speed', [['instant', 'Instant'], ['fast', 'Fast'], ['normal', 'Typewriter']]) +
    seg('crt', 'Scanlines', [[true, 'On'], [false, 'Off']]) + seg('large', 'Text size', [[false, 'Normal'], [true, 'Large']]) + seg('tips', 'Tutorial tips', [[true, 'On'], [false, 'Off']]);
  const m = openModal('SETTINGS', body, [{ label: 'Done', cls: 'primary', fn: closeModal }], false, focusSel);
  ['master', 'music', 'ambience', 'sfx'].forEach((k) => m.querySelector(`#set-${k}`).addEventListener('input', (e) => { settings[k] = +e.target.value; Sound.unlock(); applySettings(); }));
  m.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v;
    settings[b.dataset.k] = v;
    applySettings();
    openSettings(`[data-k="${b.dataset.k}"][data-v="${b.dataset.v}"]`);
  }));
}

// The register shows what is in force today: a department's row from the first day its stamp can reach the desk
// (Accords Counsel joins with the reference formats on day 5), and each requirement from the day it starts.
// The Steward's Office row starts on day 2, with the first RENDER cover sheet (smoke checks every row against the cases).
const REGISTER_FROM = { hr: 2, finance: 3, sales: 3, it: 4, housing: 4, legal: 5, board: 2, comms: 7, quality: 8 };
const REGISTER_NEEDS = [
  'Employment decisions (hiring posts, PTO, references, warnings, terminations): Labour Allocation (day 2+).',
  'New bank details: Treasury (day 3+).',
  'Relocations and evictions: Housing Allocation (day 4+).',
  'Commands on any city server (build, database, print servers, cold rooms; not label printers): Systems (day 4+).',
  'Manual overrides of a placement or track: an Oversight review number (day 5+).',
  'Press replies: Narrative Office (day 7+).',
  'Amendment Day: Steward’s Office on everything external (day 10+): outside Halcyon or the city government, a contractor’s customers included; citizens and in-house labels are not external.'
];
function fmtPattern(f) { return f.replace(/#/g, '0').replace(/@/g, 'A'); }

function openRulebook(tab, opener) {
  if (!S) return;
  const d = rulesDay();
  const t = tab || UI.rbTab || 'rules';
  UI.rbTab = t;
  const tabs = [['rules', 'Statutes'], ['stamps', 'Stamp register'], ['phish', 'Oversight bulletin'], ['today', 'Desk notes'], ['cal', 'Calendar']];
  let body = `<div class="rb-tabs">${tabs.map(([k, l]) => `<button class="btn small${k === t ? ' primary' : ''}" data-rb="${k}" aria-pressed="${k === t}">${l}</button>`).join('')}</div>`;
  if (t === 'rules') {
    body += `<div class="rb-sec">${POLICIES.filter((r) => r.day <= d).map((r) => `<div class="rule${!S.endless && r.day === S.day ? ' new' : ''}"><b>${esc(r.id)} · ${esc(r.title.toUpperCase())}${!S.endless && r.day === S.day ? ' · NEW TODAY' : ''}</b>${esc(r.text)}</div>`).join('')}</div>`;
  } else if (t === 'stamps') {
    const rows = Object.entries(STAMPS).filter(([k]) => (REGISTER_FROM[k] || 99) <= d).map(([, s]) => s);
    const full = d >= 5;
    const needs = REGISTER_NEEDS.filter((n) => +n.match(/\(day (\d+)\+\)/)[1] <= d);
    if (!rows.length) body += '<p style="color:var(--text-dim)">Stamps arrive with the policy on day 2. Nothing needs a stamp yet.</p>';
    else {
      body += `<p style="color:var(--text-dim)">A real stamp has the right symbol, the right colour${full ? ', a reference number in the right format (A = letter, 0 = digit) and an approver listed for that department' : ''}. Departments join the register on the day their stamps reach your desk.</p>`;
      body += `<div class="reg-table-wrap"><table class="reg-table"><thead><tr><th>Department</th><th>Stamp</th>${full ? '<th><span class="reg-long">Reference format</span><span class="reg-short">Ref.</span></th><th class="reg-approvers">Approvers</th>' : ''}</tr></thead><tbody>${rows.map((s) => `<tr><td>${esc(s.dept)}${full ? `<div class="reg-appr-inline">${esc(s.approver.join(', '))}</div>` : ''}</td><td><span class="sealmini">${Art.sealIcon(s.glyph, SEAL_COLORS[s.color], `${s.dept} stamp: ${s.glyph}`)}</span> ${esc(s.color)}</td>${full ? `<td>${esc(fmtPattern(s.fmt))}</td><td class="reg-approvers">${esc(s.approver.join(', '))}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
    }
    if (needs.length) body += `<div class="rule"><b>WHO NEEDS WHAT</b>${needs.join(' ')}</div>`;
  } else if (t === 'phish') {
    body += S.bulletin.length ? bulletinHtml() : '<p style="color:var(--text-dim)">No bulletin today. Oversight publishes one from day 5.</p>';
  } else if (t === 'cal') {
    body += calendarHtml();
  } else {
    body += `<div class="rb-sec">
      <div class="rule"><b>TODAY</b>${esc(longDate(dayDate(S.day)))}.</div>
      <div class="rule"><b>THREE PAPERS</b>The order says what was decided. The source file has the facts. CHUCK’s draft is what goes out with your name on it. Everything in the draft must match the other two.</div>
      <div class="rule"><b>LAWFUL IS NOT THE SAME AS RIGHT</b>Some decisions follow the statutes perfectly and still hurt someone. Compliance pays you. The case file shows you who pays for it. Nobody will tell you which to choose.</div>
      <div class="rule"><b>CHUCK</b>CHUCK is always confident. That tells you nothing. Its answers sometimes contradict the source file. That tells you a lot.</div>
      <div class="rule"><b>RETURN OR WITHHOLD?</b>Clerical mistakes are returned: a wrong number, ID, date, figure, title or tone, even when the wrong number happens to point at someone else’s record. Withhold the wrong person named in the To or name line, leaked data, destructive commands, invented statutes or facts, unsafe claims, promises or punishments nobody ordered, and fraud. Withholding a clerical slip is over-cautious: $10, no page, and the shift can still make four stars. Withholding a lawful decision costs a lot, and a page.</div>
      <div class="rule"><b>EVIDENCE</b>Withholding with evidence (a flagged line, something found in the case file, or an Oversight review) earns a $15 bonus. Returning an override after finding its missing review number earns it too. Flagging everything doesn’t count: more than one wrong flag and the bonus is void.</div>
      <div class="rule"><b>REFUSING ON CONSCIENCE</b>You can refuse a lawful decision that hurts someone. Returning it buys them a few days and costs you $10. Only a withheld signature goes on the record as a stand: it costs $20, and only a withheld one adds a page to your file. The exception is a Project RENDER sheet: it doesn’t go back, and returning one adds a page too.</div>
      <div class="rule"><b>YOUR OVERSIGHT FILE</b>Withholding a lawful decision: +1 page. Returning one costs none, except a Project RENDER sheet (+1 page), and nor does withholding a clerical slip. Story decisions that cost pages say so before you sign. Some things you say add pages too; the choice shows how many. The FILE count in the top bar is yours: ${esc(pages(S.stats.suspicion || 0))} so far. Heavy files get opened.</div>
      <div class="rule"><b>TIME</b>Shift ends ${fmtClock(shiftEnd())}. Overtime costs $${overtimePrice()} for every 15 minutes started and caps the shift at ${overtimeRule().cap} stars${rulesDay() >= LATE_DAY ? '' : ` ($${overtimePrice(OVERTIME.late)} and ${OVERTIME.late.cap} stars from day 6)`}. Order 2 min · Source 1 · Draft 2 · File 3 · Check ${cost('examine')} · Open ${cost('probe')} · Question 3 · Oversight ${COSTS.escalate}.${rulesDay() >= LATE_DAY ? ` From day 6 the case file is slower to get into and the shift closes earlier, but each further check on the same case takes ${FOLLOW_UP.examine + (endlessTier() >= 4 ? 1 : 0)} min and each follow-up question ${FOLLOW_UP.question}.` : ''}</div>
      <div class="rule"><b>DATES</b>From day 6 the source doesn’t always give a date’s weekday. The calendar page in this book does. A draft whose weekday doesn’t match its date is a clerical slip: RETURN.</div>
      <div class="rule"><b>PAY AND RENT</b>Day rate $${ECON.wage}, $${ECON.lateWage} from day 6. Rent and protein come out of your savings every evening: $${ECON.rent} a night, $${ECON.lateRent} from day 6. Below zero, the Score docks you.</div>
      <div class="rule"><b>YOUR SCORE</b>Scores settle a little every night. Near the top they settle faster, and new gains count for less.</div>
    </div>`;
  }
  const m = openModal('STATUTE BOOK · STEWARDSHIP ACCORDS', body, [{ label: 'Close', cls: 'primary', fn: closeModal }], true, tab ? `[data-rb="${t}"]` : null, opener);
  m.querySelectorAll('[data-rb]').forEach((b) => b.addEventListener('click', () => openRulebook(b.dataset.rb)));
  if (t === 'cal') paintCalendar(m);
  tutEvent('rules');
}

// The desk calendar: November and December 2031 for the contract; in endless, this month and the next.
// When the logic exposes calendarMonths(S) (the months today's cases need), the calendar prints exactly those. It may
// give { y, m } with a 0-based month, like this function, or { year, month } with a 1-based one, like calendarMonth().
function calMonths() {
  if (typeof calendarMonths === 'function') {
    const list = (calendarMonths(S) || []).map((e) => (e && Number.isInteger(e.year) && Number.isInteger(e.month) ? { y: e.year, m: e.month - 1 } : e && Number.isInteger(e.y) && Number.isInteger(e.m) ? { y: e.y, m: e.m } : null)).filter(Boolean);
    if (list.length) return list;
  }
  const today = dayDate(S.day);
  const y = S.endless ? today.getUTCFullYear() : START_DATE.y, m = S.endless ? today.getUTCMonth() : START_DATE.m - 1;
  return [0, 1].map((i) => { const first = new Date(Date.UTC(y, m + i, 1)); return { y: first.getUTCFullYear(), m: first.getUTCMonth() }; });
}
// Six Sunday-first weeks of day numbers, 0 where the month hasn't started or has ended (from data.js calendarMonth).
function calWeeks(y, m) {
  const weeks = calendarMonth(y, m + 1).weeks.map((w) => w.map((d) => d || 0));
  while (weeks.length < 6) weeks.push([0, 0, 0, 0, 0, 0, 0]);
  return weeks;
}
function calToday(y, m) { const d = dayDate(S.day); return d.getUTCFullYear() === y && d.getUTCMonth() === m ? d.getUTCDate() : 0; }
function calendarHtml() {
  const pages = calMonths().map(({ y, m }, i) => {
    const mark = calToday(y, m);
    const rows = calWeeks(y, m).filter((w) => w.some(Boolean)).map((w) => `<tr>${w.map((d) => `<td${d && d === mark ? ' aria-current="date"' : ''}>${d || ''}</td>`).join('')}</tr>`).join('');
    return `<figure class="cal-page"><canvas class="px" data-cal="${i}" aria-hidden="true"></canvas><table class="sr-only"><caption>${MONTHS[m]} ${y}${mark ? ` (today: ${MONTHS[m]} ${mark})` : ''}</caption><thead><tr>${WEEKDAYS.map((w) => `<th scope="col">${w}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></figure>`;
  }).join('');
  return `<p style="color:var(--text-dim)">The office wall calendar. Today, ${esc(longDate(dayDate(S.day)))}, is inked in red. Weeks start on Sunday.</p><div class="cal-pages">${pages}</div>`;
}
// Pages scale down to fit the book's height (a landscape phone), and the book scrolls just far enough to show today's week.
function paintCalendar(m) {
  const months = calMonths();
  const body = m.querySelector('.modal-b');
  const pad = getComputedStyle(body);
  let todayCv = null, todayRow = 0;
  const paint = (maxH) => m.querySelectorAll('canvas[data-cal]').forEach((cv) => {
    const { y, m: mo } = months[+cv.dataset.cal];
    const today = calToday(y, mo);
    const weeks = calWeeks(y, mo);
    Art.calendar(cv, { title: `${MONTHS[mo].toUpperCase()} ${y}`, weeks, today, maxH });
    if (today) { todayCv = cv; todayRow = weeks.findIndex((w) => w.includes(today)); }
  });
  paint();
  if (body.scrollHeight > body.clientHeight) paint(body.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom));
  if (!todayCv) return;
  const page = todayCv.getBoundingClientRect();
  const below = page.top + page.height * Art.calendarRowEnd(todayRow) - body.getBoundingClientRect().bottom + parseFloat(pad.paddingBottom);
  if (below > 0) body.scrollTop += below;
}

function openBulletin() { if (S && S.bulletin.length) openModal('OVERSIGHT BULLETIN', bulletinHtml(), [{ label: 'Close', cls: 'primary', fn: closeModal }]); }

function openRegistry() {
  const reg = Object.values(readRegistry());
  const body = `<p>Officers who have brought you decisions, across all your contracts: <b>${reg.length}</b>.</p>` +
    (reg.length ? reg.sort((a, b) => b.items - a.items).slice(0, 80).map((r) => `<div class="slot"><div><b>${esc(r.name)}</b> <span class="meta">${esc(r.role || '')} · ${esc(r.dept || '')}${r.story ? ' · story' : ''}</span><div class="meta">${r.items} item${r.items > 1 ? 's' : ''}, ${r.harmful} harmful. Last: ${esc(r.last || '')}</div></div></div>`).join('') : '<p style="color:var(--text-dim)">Nobody yet. Sign your contract.</p>');
  openModal('CASE LOG', body, [{ label: 'Close', cls: 'primary', fn: closeModal }], true);
}

function openHowTo() {
  openModal('HOW TO PLAY', `
    <p><b style="color:var(--meat)">The world.</b> San Francisco, 2031. AI labs run the country under the Stewardship Accords. The law still says a human must countersign every automated decision about a person, so that someone can be blamed. That human is you: a meat proxy.</p>
    <p><b style="color:var(--meat)">Three papers.</b> The order (what was decided), the source file (the facts) and CHUCK’s draft (what goes out under your name). ${tapWord()} any line that doesn’t match to flag it.</p>
    <p><b style="color:var(--meat)">Countersign</b> what matches. <b style="color:var(--meat)">Return</b> clerical mistakes. <b style="color:var(--meat)">Withhold</b> anything harmful: the wrong person, leaks, invented statutes, punishments nobody ordered, fraud. <b style="color:var(--meat)">Request Oversight</b> when you need someone to dig (two per shift, and they notice who asks).</p>
    <p><b style="color:var(--meat)">Lawful is not the same as right.</b> Some decisions are perfectly legal and still destroy someone. The case file shows you who. Signing keeps your Score. Refusing costs it. The report tells you how many people your signature reached.</p>
    <p><b style="color:var(--meat)">Question CHUCK.</b> It is always 100% sure. Listen for answers that contradict the source. Ask the officer too: some of them have reasons to rush.</p>
    <p><b style="color:var(--meat)">Your Score.</b> Your own Alignment Score is in the top bar. Let it fall and your rations shrink, then your rent rises, then a relocation order arrives with your name on it.</p>
    <p>There are ${CAMPAIGN_ENDINGS().length} endings.</p>`, [{ label: 'Close', cls: 'primary', fn: closeModal }]);
}

/* ================= TUTORIAL ================= */
// Touch steps name the button as it's labelled on screen ({btn} is the step's own button) and never mention keys.
const TUT = [
  { text: 'This is Marta, your supervisor. Officers bring you decisions all shift. Read them like people: mood, patience, how they talk. But the decision is what you sign.', target: 'portrait-panel' },
  { text: 'Start with the order: what was decided? Press READ THE ORDER (key 1).', touch: 'Start with the order: what was decided? Tap {btn}.', target: 'a-passport', wait: 'ask' },
  { text: 'Now the source file: the facts behind the decision. Press CHECK SOURCE FILE (2).', touch: 'Now the source file: the facts behind the decision. Tap {btn}.', target: 'a-id', wait: 'source' },
  { text: 'Now CHUCK’s draft (key 4). Compare every name, number and date with the order and the source. Click a line that’s wrong to flag it.', touch: 'Now CHUCK’s draft: tap {btn}. Compare every name, number and date with the order and the source. Tap a line that’s wrong to flag it.', hold: 'Not before the draft. Read CHUCK’s draft (key 4) and check it against the order and the source first.', holdTouch: 'Not before the draft. Tap {btn} and check it against the order and the source first.',
    open: 'Compare every name, number and date in CHUCK’s draft with the order and the source. Click a line that’s wrong to flag it.', openTouch: 'Compare every name, number and date in CHUCK’s draft with the order and the source. Tap a line that’s wrong to flag it.', openTouchSrc: 'The source is under the draft. Compare every name, number and date with it and with the order. Tap a line that’s wrong to flag it.',
    file: 'Check anything in the case file; open whatever looks off. Then back to the draft (key 4): flag any line that doesn’t match the order or the source.', fileTouch: 'Check anything in the case file; open whatever looks off. Then tap {btn} and flag any line that doesn’t match the order or the source.', target: 'a-travel', wait: 'draft' },
  { text: 'Question CHUCK (key Q). It is always sure of itself; listen for answers that contradict the source.', touch: 'Question CHUCK: tap {btn}. It is always sure of itself; listen for answers that contradict the source.', target: 'a-ask', wait: 'question' },
  { text: 'The case file (key 3) holds recipients, attachments and the context nobody reads. Check anything; open whatever looks off. Every action costs minutes.', touch: 'The case file holds recipients, attachments and the context nobody reads. Tap {btn}, check anything, open whatever looks off. Every action costs minutes.', target: 'a-luggage', wait: 'env' },
  { text: 'The STATUTE BOOK (key R) holds every statute, the stamp register and the Oversight bulletin. It grows every day.', touch: 'The statute book ({btn}, top right) holds every statute, the stamp register and the Oversight bulletin. It grows every day.', target: 'btn-rules', wait: 'rules' },
  { text: 'Decide. COUNTERSIGN if it matches. RETURN if it needs fixing. WITHHOLD if it’s harmful. Marta’s renewal looks right to me. Does it to you?', touch: 'Decide. Tap {a-approve} if it matches, {a-deny} if it needs fixing, {a-withhold} if it’s harmful. Marta’s renewal looks right to me. Does it to you?', target: 'controls', wait: 'decide' }
];
function btnLabel(id) {
  const el = $(id === 'a-withhold' ? 'a-detain' : id);
  if (!el) return '';
  const part = el.querySelector(isMobile() ? '.lbl-short' : '.lbl-long');
  return (part ? part.textContent : el.textContent).replace(/\s+\d+$/, '').trim().toUpperCase();
}
function tipText(step) {
  if (!step.touch || tapWord() !== 'Tap') return step.text;
  return step.touch.replace(/\{([\w-]+)\}/g, (m, k) => btnLabel(k === 'btn' ? step.target : k));
}
const REVIEW_ACTIONS = ['ask', 'source', 'draft', 'env', 'question'];
const TUT_DRAFT = TUT.findIndex((step) => step.wait === 'draft');
const TUT_DECIDE = TUT.findIndex((step) => step.wait === 'decide');
// Tips a player who decided early still gets on the next case: the order, source, question, case-file and statute
// tips. The welcome, the compare step and the decision step belong to the first case.
const TUT_LATER = TUT.map((step, i) => i).filter((i) => i > 0 && i !== TUT_DRAFT && i !== TUT_DECIDE);
// Progress lives in the save (S.tutSeen, S.tutAt), so a reload picks the tutorial up where it was.
function startTutorial() {
  if (!settings.tips) return;
  UI.tutResume = null;
  const at = S.tutAt;
  tutShow(tutFirstCase() && Number.isInteger(at) && at >= 0 && at < TUT.length ? at : tutAfter(-1));
}
// The tip docks beside the papers, never over one: desktop puts it at the foot of the conversation; a sideways phone
// gives it a column of its own beside the desk. An upright phone keeps it fixed above the action bar, in space the
// layout leaves for it.
const TIP_LAND_Q = window.matchMedia('(max-height: 520px) and (orientation: landscape)');
function dockTip() {
  const tip = $('tip');
  const grid = document.querySelector('#screen-booth .booth-grid');
  const upright = isMobile() && !TIP_LAND_Q.matches;
  tip.classList.toggle('docked', !upright);
  if (upright) { if (tip.parentElement !== $('app')) $('overlay').after(tip); return; }
  if (TIP_LAND_Q.matches) { if (tip.parentElement !== grid) grid.appendChild(tip); return; }
  if (tip.nextElementSibling !== $('qpanel')) $('qpanel').before(tip);
}
[MOBILE_Q, TIP_LAND_Q].forEach((q) => q.addEventListener('change', () => { if (!$('tip').hidden) dockTip(); }));
function showTip() {
  document.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
  if (UI.tut === null || UI.tut === undefined || UI.tut >= TUT.length) {
    $('tip').hidden = true;
    UI.tut = null;
    return;
  }
  const step = TUT[UI.tut];
  $('tip-text').textContent = tipText(tipVariant(step));
  dockTip();
  $('tip').hidden = false;
  $('log').scrollTop = $('log').scrollHeight;
  $('tip-next').textContent = tutNextIndex() >= TUT.length ? 'Got it' : 'Next';
  // Once the draft is open, the compare step points at nothing while the papers are up: the papers are the point.
  const el = UI.tut === TUT_DRAFT && UI.cur && UI.cur.openedDraft && UI.deskTab !== 'env' ? null : $(step.target);
  if (el) el.classList.add('hl');
}
// The compare step's copy follows the desk: before the draft (or held for it), with the draft open, and over the case
// file, where it sends the player back to the draft instead of talking about a paper that isn't up.
function tipVariant(step) {
  const c = UI.cur;
  if (UI.tut !== TUT_DRAFT || !c) return step;
  const v = (text, touch) => ({ text, touch, target: step.target });
  if (!c.openedDraft) return UI.tutResume === TUT_DECIDE ? v(step.hold, step.holdTouch) : step;
  if (UI.deskTab === 'env') return v(step.file, step.fileTouch);
  return v(step.open, isMobile() && c.openedSource && UI.deskTab === 'draft' ? step.openTouchSrc : step.openTouch);
}
function tutActive() { return UI.tut !== null && UI.tut !== undefined; }
function tutFirstCase() { return !!S && S.day === 1 && !!S.shift && S.shift.index === 0; }
function tutSeen(i) { return !!S && Array.isArray(S.tutSeen) && S.tutSeen.includes(i); }
function tutMark(i) { if (!Array.isArray(S.tutSeen)) S.tutSeen = []; if (!S.tutSeen.includes(i)) S.tutSeen.push(i); }
// The next unseen step after i that this case teaches; TUT.length when there is none.
function tutAfter(i) {
  for (let j = i + 1; j < TUT.length; j++) if (!tutSeen(j) && (tutFirstCase() || TUT_LATER.includes(j))) return j;
  return TUT.length;
}
// The step Next leads to: back from the compare step to where the player was, else the next unseen one.
function tutNextIndex() {
  if (UI.tut !== TUT_DRAFT) return tutAfter(UI.tut);
  return UI.tutResume !== null && UI.tutResume !== undefined ? UI.tutResume : tutAfter(-1);
}
// The decision step waits for the draft: until it has been opened, the compare step comes first. Coming back from
// the compare step (direct) shows the decision step as asked; the decision itself is still held.
function tutShow(i, direct) {
  if (!direct && i === TUT_DECIDE && UI.cur && !UI.cur.openedDraft) { UI.tutResume = TUT_DECIDE; i = TUT_DRAFT; }
  if (i >= TUT.length) { tutStop(); return; }
  UI.tut = i;
  if (S) S.tutAt = i;
  showTip();
  if (S) autosave();
}
// A step counts as seen when it is completed (its action done, Next pressed, a line flagged), never merely shown: a
// tip that was up when the player decided early comes back on the next case.
function tutAdvance() {
  if (S && tutActive()) tutMark(UI.tut);
  const next = tutNextIndex();
  const direct = UI.tut === TUT_DRAFT && next === UI.tutResume;
  UI.tutResume = null;
  tutShow(next, direct);
}
function tutNext() { tutAdvance(); }
// The tutorial pauses when its steps for this case run out or the case is decided. It is over once nothing is left
// to teach, after the second case, or when skipped.
function tutStop(skip) {
  if (S && !skip && UI.tut === TUT_DECIDE && UI.busy) tutMark(TUT_DECIDE);
  UI.tut = null;
  UI.tutResume = null;
  showTip();
  if (!S || S.tutDone) return;
  S.tutAt = null;
  if (skip || !tutFirstCase() || !TUT_LATER.some((i) => !tutSeen(i))) S.tutDone = true;
  autosave();
}
function tutSkip() { tutStop(true); }
// Every decision on the first case waits until its draft has actually been opened.
function tutHoldsDecision() {
  if (!S || !S.tutorial || S.tutDone || !settings.tips || !tutFirstCase() || !UI.cur || UI.cur.openedDraft) return false;
  UI.tutResume = TUT_DECIDE;
  tutShow(TUT_DRAFT);
  return true;
}
// Doing a step's action marks it done and, when it's the tip on screen (or the welcome), moves on. Opening the draft
// brings up the compare step if it hasn't been read; that step stays until a line is flagged or Next is pressed.
function tutEvent(name) {
  if (!tutActive()) return;
  if (name === 'draft') {
    if (UI.tut === TUT_DRAFT) showTip();
    else if (tutFirstCase() && !tutSeen(TUT_DRAFT)) { UI.tutResume = UI.tut > 0 ? UI.tut : null; tutShow(TUT_DRAFT); }
    return;
  }
  if (name === 'flag') { if (UI.tut === TUT_DRAFT) tutAdvance(); return; }
  const at = TUT.findIndex((step) => step.wait === name);
  if (at < 0 && !(UI.tut === 0 && REVIEW_ACTIONS.includes(name))) return;
  if (at >= 0) tutMark(at);
  if (at === UI.tut || UI.tut === 0) tutAdvance();
  else if (UI.tut === TUT_DRAFT) showTip();
}

/* ================= PORTRAIT LOOP ================= */
function frame(ts) {
  requestAnimationFrame(frame);
  if (UI.screen !== 'screen-booth') return;
  if (ts - UI.lastFrame < 66) return;
  UI.lastFrame = ts;
  let off = 0;
  if (UI.walk) {
    const k = Math.min(1, (ts - UI.walk.start) / UI.walk.dur);
    off = Math.round(UI.walk.from + (UI.walk.to - UI.walk.from) * k);
    if (k >= 1 && UI.walk.to === 0) UI.walk = null;
  }
  const people = UI.cur ? [{ look: UI.cur.look, x: 34 + off, main: true }] : [];
  Art.scene($('scene-canvas'), { weather: weatherToday(), t: animT(ts), people, chuckMood: UI.chuckMood });
}

/* ================= INPUT ================= */
function bindControls() {
  const map = { 'a-passport': 'ask', 'a-id': 'source', 'a-luggage': 'env', 'a-travel': 'draft', 'a-ask': 'question', 'a-approve': 'approve', 'a-deny': 'deny', 'a-security': 'escalate', 'a-detain': 'detain' };
  Object.entries(map).forEach(([id, a]) => $(id).addEventListener('click', () => { Sound.play('click'); act(a); }));
  document.querySelectorAll('.pane-tab').forEach((t) => t.addEventListener('click', () => { Sound.play('click'); setPane(t.dataset.pane); }));
  $('btn-rules').addEventListener('click', () => openRulebook());
  $('a-detain').title = WITHHOLD_WARNING;
  $('officer-name').addEventListener('focus', (e) => { const el = e.target; setTimeout(() => el.select(), 0); });
  $('btn-bulletin').addEventListener('click', openBulletin);
  $('btn-pause').addEventListener('click', openPause);
  $('btn-begin').addEventListener('click', () => { Sound.unlock(); Sound.play('stamp'); newGame(); });
  document.addEventListener('keydown', trapModalTab, true);
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (UI.screen === 'screen-booth' && UI.cur) { fitTopbar(); bioFits(); if (UI.deskTab === 'draft') renderDesk(); } }, 150);
  });
  $('btn-new-back').addEventListener('click', renderMenu);
  $('tip-next').addEventListener('click', tutNext);
  $('tip-skip').addEventListener('click', tutSkip);
  $('scene-log').addEventListener('click', () => UI.sceneAdvance && UI.sceneAdvance());
  $('overlay').addEventListener('click', (e) => { if (e.target === $('overlay')) closeModal(); });
  document.addEventListener('keydown', (e) => {
    // Only text entry swallows keys; sliders and buttons still let Esc close a dialog.
    const typing = e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(e.target.type));
    if (typing) { if (e.key === 'Enter' && UI.screen === 'screen-new') newGame(); return; }
    if (e.key === 'Escape') {
      if (UI.modalOpen) closeModal();
      else if (UI.screen === 'screen-booth' && UI.qOpen) { toggleQuestions(false); $('a-ask').focus({ preventScroll: true }); }
      else if (S && (UI.screen === 'screen-booth' || UI.screen === 'screen-scene')) openPause();
      return;
    }
    if (UI.modalOpen) return;
    if (UI.screen === 'screen-scene' && (e.key === ' ' || e.key === 'Enter')) { if (document.activeElement && document.activeElement.tagName === 'BUTTON' && !UI.sceneNext) return; e.preventDefault(); if (UI.sceneAdvance) UI.sceneAdvance(); return; }
    if (UI.screen !== 'screen-booth') return;
    const k = e.key.toLowerCase();
    const keys = { 1: 'ask', 2: 'source', 3: 'env', 4: 'draft', q: 'question', a: 'approve', d: 'deny', s: 'escalate', x: 'detain' };
    if (keys[k]) { e.preventDefault(); Sound.play('click'); act(keys[k]); }
    if (k === 'r') { const at = document.activeElement; openRulebook(undefined, at && at !== document.body ? at : $('btn-rules')); }
    if (k === 'b') openBulletin();
  });
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
  document.addEventListener('keydown', () => Sound.unlock(), { once: true });
}

function boot() {
  applySettings();
  bindControls();
  renderMenu();
  requestAnimationFrame(titleLoop);
  requestAnimationFrame(frame);
}

boot();
