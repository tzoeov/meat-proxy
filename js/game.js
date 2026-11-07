'use strict';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const KEYS = { save: 'meatproxy.save.', settings: 'meatproxy.settings.v1', registry: 'meatproxy.registry.v1', endings: 'meatproxy.endings.v1' };
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
let settings = Object.assign({}, DEFAULT_SETTINGS, store.get(KEYS.settings, {}));

const DIFFICULTY = {
  relaxed: { label: 'Relaxed', security: 3, shiftLen: 180, penalty: 0.6 },
  standard: { label: 'Standard', security: 2, shiftLen: 150, penalty: 1 },
  strict: { label: 'Strict', security: 1, shiftLen: 130, penalty: 1.5 }
};

const COSTS = { ask: 2, source: 1, draft: 2, envelope: 3, examine: 3, probe: 5, question: 3, escalate: 15, walk: 2 };
const BASE_WAGE = 80;

const OUTCOME = {
  helped: { ok: 1, pay: 15, rep: 2, label: 'Compliant countersignature' },
  correct_deny: { ok: 1, pay: 15, rep: 2, label: 'Correctly returned' },
  caught: { ok: 1, pay: 20, rep: 3, label: 'Harm withheld' },
  turned: { ok: 0.6, pay: 8, rep: 1, label: 'Harmful, only returned' },
  missed: { ok: 0, pay: -40, rep: -5, label: 'Harm countersigned' },
  wrong_deny: { ok: 0, pay: -20, rep: -4, label: 'Lawful decision returned' },
  wrong_detain: { ok: 0, pay: -50, rep: -8, label: 'Lawful decision withheld' },
  breach: { ok: 0, pay: -30, rep: -3, label: 'Statute breach' }
};

let S = null;
const UI = { cur: null, deskTab: null, qOpen: false, typing: null, walk: null, tut: null, lastFrame: 0, busy: false, sceneNext: null, pane: 'talk', chuckMood: 'happy' };

const MOBILE_Q = window.matchMedia('(max-width: 900px), (max-height: 520px) and (orientation: landscape)');
function isMobile() { return MOBILE_Q.matches; }

function setPane(p) {
  UI.pane = p;
  const booth = $('screen-booth');
  booth.classList.remove('pane-talk', 'pane-desk', 'pane-notes');
  booth.classList.add('pane-' + p);
  document.querySelectorAll('.pane-tab').forEach((t) => t.classList.toggle('on', t.dataset.pane === p));
  if (p === 'talk') $('talk-dot').hidden = true;
}

function rulesDay() { return S.endless ? 10 : S.day; }
function diff() { return DIFFICULTY[S.difficulty] || DIFFICULTY.standard; }
function plan() { return S.endless ? null : DAY_PLAN[S.day]; }
function weatherToday() { return S.weather || 'clear'; }
function fmtClock(m) {
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${mm}${h < 12 ? 'a' : 'p'}`;
}
function shiftEnd() { return SHIFT_START_MIN + diff().shiftLen + (S.day === 1 && !S.endless ? 30 : 0); }
function bump(stat, n) { S.stats[stat] = (S.stats[stat] || 0) + n; }
function applyFx(fx) { if (fx) Object.entries(fx).forEach(([k, v]) => bump(k, v)); }
function align(r) { return Math.max(0, Math.round(r * 10)); }
function money(n) { return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US'); }

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== id; });
  UI.screen = id;
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
  const meta = { officer: S.officer, day: S.day, endless: S.endless, money: S.money, rep: S.rep, when: new Date().toISOString() };
  const ok = store.set(KEYS.save + slot, { meta, state: S });
  if (slot !== 'auto') toast(ok ? `Saved to slot ${slot}` : 'Could not save: browser storage is unavailable');
  return ok;
}
function autosave() { saveGame('auto'); }
function readSave(slot) { return store.get(KEYS.save + slot, null); }
function loadGame(slot) {
  const data = readSave(slot);
  if (!data) { toast('That slot is empty'); return; }
  S = data.state;
  closeModal();
  resumeState();
}

function resumeState() {
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
  const reg = store.get(KEYS.registry, {});
  const key = c.sid;
  const prev = reg[key] || { name: `${c.first} ${c.last}`, dept: c.dept, role: c.role, items: 0, harmful: 0 };
  prev.items += 1;
  if (c.guilty) prev.harmful += 1;
  prev.last = `${c.title}: ${rec.truth}`.slice(0, 220);
  prev.story = !!c.story;
  reg[key] = prev;
  store.set(KEYS.registry, reg);
}

/* ================= MENU ================= */
function renderMenu() {
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
  if (auto && auto.state && auto.state.phase !== 'ending') {
    add('Continue', () => { S = auto.state; resumeState(); }, `${auto.meta.endless ? 'Endless' : 'Day ' + auto.meta.day} · ${auto.meta.officer}`).classList.add('primary');
  }
  add('New contract', () => openNewGame(false));
  add('Endless shift', () => openNewGame(true));
  add('Load game', () => openLoad(false));
  add('Settings', openSettings);
  add('Case log', openRegistry);
  add('How to play', openHowTo);
}

function titleLoop(ts) {
  if (UI.screen === 'screen-menu') Art.title($('title-canvas'), ts);
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
      b.textContent = label;
      b.addEventListener('click', () => { newOpts[key] = v; seg(el, opts, key); Sound.play('click'); });
      el.appendChild(b);
    });
  };
  seg($('new-tut'), [[true, 'On'], [false, 'Off']], 'tutorial');
  seg($('new-diff'), [['relaxed', 'Relaxed'], ['standard', 'Standard'], ['strict', 'Strict']], 'difficulty');
}

function newGame() {
  const raw = $('officer-name').value.trim().replace(/[^\p{L}\s'-]/gu, '').slice(0, 18) || 'Reyes';
  const surname = raw[0].toUpperCase() + raw.slice(1);
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  S = {
    version: 1, seed, officer: surname, endless: newOpts.endless, difficulty: newOpts.difficulty,
    day: 1, money: 100, rep: 50, stats: { party: 0, conscience: 0, suspicion: 0, corruption: 0, truth: 0 }, flags: {},
    staff: buildStaff(seed, 72), phase: 'brief', shift: null, bulletin: [],
    totals: { inspected: 0, ok: 0, caught: 0, missed: 0, wrong: 0, helped: 0, earned: 0, penalties: 0, bribes: 0 },
    history: [], tutorial: newOpts.tutorial, tutDone: !newOpts.tutorial, weather: 'clear'
  };
  startDay();
}

/* ================= DAY FLOW ================= */
function startDay(resumed) {
  S.phase = 'brief';
  if (!resumed || !S.shift || S.shift.day !== S.day) prepareShift();
  Sound.setWeather(weatherToday());
  autosave();
  playScene(briefingLines(), {
    date: `<b>${esc(longDate(dayDate(S.day)).toUpperCase())}</b> · DAY ${String(S.day).padStart(2, '0')}${S.endless ? ' · ENDLESS' : ''} · ${weatherLabel()}`,
    side: briefingSide(), doneLabel: 'Open the review desk', onDone: beginShift
  });
}

function weatherLabel() {
  return { clear: 'SUNNY, 64°F', storm: 'RAIN, 55°F', fog: 'FOG, 58°F', dusk: 'OVERCAST, 57°F' }[weatherToday()];
}

function briefingLines() {
  if (S.endless) {
    const rng = makeRng(S.seed + S.day);
    return [
      L('narrator', `Endless shift, day ${S.day}. ${rng.pick(['The fog hasn’t lifted since Tuesday.', 'Someone has replaced the cold brew with a smoothie. Nobody knows who.', 'CHUCK has renamed every meeting room after itself.', 'A delivery truck is reversing outside. It has been reversing for an hour.'])}`),
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
  html += `<ol>${(newOnes.length ? newOnes : regs.slice(-3)).map((r) => `<li><span class="${newOnes.length ? 'new' : ''}">${esc(r.title)}.</span> ${esc(r.text)}</li>`).join('')}</ol>`;
  html += `<p style="margin:10px 0 0">Decisions this shift: 5 · Oversight requests: ${diff().security}${S.bulletin.length ? ' · Oversight bulletin is live' : ''}</p>`;
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
  if (p) slots = p.slots.slice();
  else {
    const nQ = rng.pick([1, 2, 2]);
    const nB = rng.pick([1, 1, 2]);
    slots = rng.shuffle([{ kind: 'cruel' }, ...Array(nQ).fill({ kind: 'q' }), ...Array(nB).fill({ kind: 'back' }), ...Array(Math.max(0, 4 - nQ - nB)).fill({ kind: 'clean' })]);
  }
  S.shift = { affected: 0, day: S.day, queue: slots.map((s) => (typeof s === 'string' ? { story: s } : Object.assign({ kind: 'clean' }, s))), index: 0, clock: SHIFT_START_MIN, records: [], security: diff().security, current: null, midDone: false, usedTpl: [] };
  S.bulletin = (p ? p.bulletin : S.day > 1) ? BULLETIN_DOMAINS.slice() : [];
}

function bulletinHtml() {
  return `<div class="wanted"><div class="wh">OVERSIGHT BULLETIN</div><div><b>Persons of interest</b>: ${PERSONS_OF_INTEREST.map(esc).join(', ')}. Any decision about them: withhold.</div><div><b>Look-alike domains</b>:</div>${S.bulletin.map((b) => `<div><code>${esc(b.fake)}</code> pretending to be <code>${esc(b.real)}</code><br><i>${esc(b.note)}</i></div>`).join('')}</div>`;
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
    playScene(SCENES[p.mid.scene](S), { date: `<b>${fmtClock(sh.clock)}</b> · OUTBOUND REVIEW`, side: '', doneLabel: 'Back to the desk', onDone: () => { sh.midDone = true; show('screen-booth'); nextItem(); } });
    return;
  }
  const slot = sh.queue[sh.index];
  let c;
  if (slot.story) c = STORY_PEOPLE[slot.story].make(S);
  else {
    const rng = makeRng(hashStr(`${S.seed}:${S.day}:${sh.index}`));
    c = buildCase(Object.assign({ avoid: sh.usedTpl }, slot), S, rng);
    sh.usedTpl.push(c.tpl);
    if (c.fraudster && (S.endless || S.day >= 3) && rng.chance(0.45)) c.bribe = rng.pick([100, 150, 200, 300]);
  }
  sh.current = c;
  autosave();
  presentItem(c, false);
}

function presentItem(c, resumed) {
  UI.cur = c;
  UI.deskTab = null;
  UI.qOpen = false;
  UI.busy = false;
  UI.chuckMood = 'happy';
  setPane('talk');
  $('qpanel').hidden = true;
  if (!resumed) { UI.walk = { from: -60, to: 0, start: performance.now(), dur: 650 }; Sound.play('step'); setTimeout(() => Sound.play('step'), 220); }
  else UI.walk = null;
  $('log').innerHTML = '';
  if (resumed && c.log && c.log.length) c.log.forEach((m) => logLine(m.who, m.text, false, true));
  else {
    c.log = [];
    sysLine(`${fmtClock(S.shift.clock)} — Decision ${S.shift.index + 1} of 5. ${c.first} from ${c.dept} brings a ${c.title.toLowerCase()}.`);
    c.greet.forEach((g, i) => setTimeout(() => themLine(g), 400 + i * 60));
    setTimeout(() => chuckLine(c.chuckGreet), 520 + c.greet.length * 60);
  }
  renderTraveller();
  renderDesk();
  renderTop();
  renderEvidence();
  if (S.tutorial && !S.tutDone && S.day === 1 && S.shift.index === 0) startTutorial();
}

function renderTraveller() {
  const c = UI.cur;
  if (!c) return;
  $('trav-name').textContent = `${c.first} ${c.last} · ${c.dept}`;
  const dem = $('trav-dem');
  dem.className = `chip ${c.demeanour}`;
  dem.textContent = DEMEANOURS[c.demeanour] || 'Calm';
  $('trav-appear').textContent = c.appearance;
  $('notes-appear').textContent = `${c.first} ${c.last}, ${c.role}. ${DEMEANOURS[c.demeanour] || ''}. ${c.appearance}`;
  const pat = Math.max(0, 5 - Math.round(c.irritation));
  $('irrit').textContent = `${c.first}’s patience ${'■'.repeat(pat)}${'□'.repeat(5 - pat)}`;
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
}

function spend(min) { S.shift.clock += min; renderTop(); }

function logLine(who, text, animate, silentStore) {
  const c = UI.cur;
  if (c && !silentStore) c.log.push({ who, text });
  const box = $('log');
  if (who !== 'you' && UI.pane !== 'talk' && isMobile()) $('talk-dot').hidden = false;
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  const label = who === 'you' ? 'YOU' : who === 'them' ? (c ? c.first.toUpperCase() : '') : who === 'chuck' ? 'CHUCK' : '';
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
    notes.push(`Flagged ${doc.title}: ${fld.label ? fld.label + ': ' : ''}${String(fld.v || '').slice(0, 80)}`);
  });
  c.items.filter((i) => i.examined && i.tell && !i.probed).forEach((i) => notes.push(`${i.name}: ${i.tell}`));
  c.items.filter((i) => i.probed && i.contraband).forEach((i) => notes.push(`FOUND: ${i.probe}`));
  (c.searchNotes || []).forEach((n) => notes.push(n));
  $('evidence-list').innerHTML = notes.length ? notes.map((n) => `<li>${esc(n)}</li>`).join('') : '<li style="color:var(--text-faint);list-style:none;margin-left:-18px">Nothing noted yet. Click any line on a document to flag it; case file findings land here too.</li>';
  $('flag-count').textContent = c.flags.length ? `${c.flags.length} flagged` : 'Click a line to flag it';
}

/* ================= DESK ================= */
function docTabs(c) {
  const tabs = [];
  if (c.openedAsk) tabs.push(['ask', 'Order']);
  if (c.openedSource) tabs.push(['source', 'Source']);
  if (c.openedDraft) c.docs.filter((d) => !['ask', 'source'].includes(d.type)).forEach((d) => tabs.push([d.type, d.type === 'draft' ? 'Draft' : d.type === 'stamp' ? 'Stamp' : d.title]));
  if (c.openedEnv) tabs.push(['env', 'Case file']);
  return tabs;
}

function renderDesk() {
  const c = UI.cur;
  const tabEl = $('desk-tabs');
  tabEl.innerHTML = '';
  docTabs(c).forEach(([k, label]) => {
    const b = document.createElement('button');
    b.className = 'tab' + (UI.deskTab === k ? ' on' : '');
    b.textContent = label;
    b.addEventListener('click', () => { UI.deskTab = k; Sound.play('paper'); renderDesk(); });
    tabEl.appendChild(b);
  });
  const body = $('desk-body');
  if (!UI.deskTab) { body.innerHTML = '<div class="desk-empty">Paperwork lands here. Use the review controls.</div>'; return; }
  if (UI.deskTab === 'env') { renderEnvelope(body); return; }
  const doc = c.docs.find((d) => d.type === UI.deskTab);
  if (!doc) { body.innerHTML = '<div class="desk-empty">Not on the desk.</div>'; return; }
  body.innerHTML = docHtml(doc, c);
  body.querySelectorAll('[data-field]').forEach((el) => el.addEventListener('click', () => toggleFlag(doc.type, el.dataset.field)));
  if (c.openedDraft && !['ask', 'source', 'env'].includes(UI.deskTab)) {
    const extra = c.docs.filter((d) => !['ask', 'source', 'draft'].includes(d.type)).map((d) => d.title);
    const note = document.createElement('div');
    note.className = 'doc-hint';
    note.textContent = extra.length ? `Also attached: ${extra.join(' · ')}` : 'No stamps or certificates attached.';
    body.appendChild(note);
  }
}

function isFlagged(c, doc, field) { return c.flags.some((f) => f.doc === doc && f.field === field); }

function docHtml(doc, c) {
  const fl = (k) => (isFlagged(c, doc.type, k) ? ' flagged' : '');
  const fields = doc.fields.map((f) => `<div class="field${f.line ? ' line' : ''}${f.wide ? ' wide' : ''}${fl(f.k)}" data-field="${f.k}" tabindex="0">${f.label ? `<div class="fl">${esc(f.label)}</div>` : ''}<div class="fv">${esc(f.v)}</div></div>`).join('');
  const seal = doc.seal ? `<div class="seal${fl('seal')}" data-field="seal" style="color:${SEAL_COLORS[doc.seal.color]}"><div><div class="g">${doc.seal.glyph}</div><div class="t">${esc(doc.seal.text)}</div></div></div>` : '';
  return `<div class="doc ${doc.type} ${c.kind === 'code' && doc.type === 'draft' ? 'code' : ''}">
    <div class="doc-h"><div><div class="doc-title">${esc(doc.title)}</div><div class="doc-auth">${esc(doc.authority)}</div></div></div>
    <div class="fields${doc.letter ? ' letter' : ''}">${fields}</div>
    ${doc.seal ? `<div class="doc-foot">Stamp</div>${seal}` : ''}</div>
    <div class="doc-hint">Click a line${doc.seal ? ' or the stamp' : ''} to flag it.</div>`;
}

function toggleFlag(doc, field) {
  const c = UI.cur;
  const i = c.flags.findIndex((f) => f.doc === doc && f.field === field);
  if (i >= 0) c.flags.splice(i, 1);
  else { c.flags.push({ doc, field }); Sound.play('click'); }
  renderDesk();
  renderEvidence();
}

function renderEnvelope(body) {
  const c = UI.cur;
  const groups = {};
  c.items.forEach((it) => { (groups[it.container] = groups[it.container] || []).push(it); });
  body.innerHTML = `<div class="lug">${Object.entries(groups).map(([g, items]) => `
    <div class="lug-group"><span class="label">${esc(g)}</span><div style="display:grid;gap:6px">${items.map(itemHtml).join('')}</div></div>`).join('')}
    <div class="doc-hint">Check ${COSTS.examine} min · Open ${COSTS.probe} min. Requesting Oversight puts an officer on the whole case.</div></div>`;
  body.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => examineItem(b.dataset.ex)));
  body.querySelectorAll('[data-pr]').forEach((b) => b.addEventListener('click', () => probeItem(b.dataset.pr)));
}

function itemHtml(it) {
  const contra = it.probed && it.contraband;
  let inner = `<div class="in"><span>${esc(it.name)}</span>${!it.examined ? `<button class="btn" data-ex="${it.id}">Check</button>` : ''}</div>`;
  if (it.examined) {
    inner += `<div>${esc(it.desc)}</div>`;
    if (it.tell) inner += `<div class="tell">Hmm: ${esc(it.tell)}</div>`;
    else inner += '<div class="probe">Nothing odd.</div>';
    if (it.tell && !it.probed) inner += `<div><button class="btn" data-pr="${it.id}">Open it up</button></div>`;
    if (it.probed) inner += `<div class="probe">${contra ? 'PROBLEM: ' : 'Opened: '}${esc(it.probe)}</div>`;
  }
  return `<div class="item${contra ? ' contra' : ''}">${inner}</div>`;
}

function examineItem(id) {
  const it = UI.cur.items.find((i) => i.id === id);
  if (!it || it.examined) return;
  it.examined = true;
  spend(COSTS.examine);
  Sound.play('paper');
  renderDesk(); renderEvidence();
}

function probeItem(id) {
  const c = UI.cur;
  const it = c.items.find((i) => i.id === id);
  if (!it || it.probed) return;
  it.probed = true;
  spend(COSTS.probe);
  if (it.contraband) {
    Sound.play('buzz');
    UI.chuckMood = 'alert';
    sysLine(`You open it up: ${it.probe}`, 'alert');
    c.evidenceFound = true;
    if (c.demeanour !== 'hostile') c.demeanour = c.fraudster ? 'nervous' : 'uneasy';
    chuckLine(pickLine(['Huh. I don’t remember putting that there. I remember everything.', 'That’s… a feature?', 'Let’s not focus on that part.']));
  } else {
    Sound.play('paper');
    if (!c.guilty) c.irritation += 0.5;
  }
  renderDesk(); renderEvidence(); renderTraveller();
}

function pickLine(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
      if (!c.openedDraft) { c.openedDraft = true; spend(COSTS.draft); youLine('Now the draft.'); chuckLine(pickLine(['Enjoy! I wrote it in 0.4 seconds.', 'It’s my best work. All my work is my best work.', 'Read slowly. Savour it.'])); }
      UI.deskTab = 'draft'; Sound.play('paper'); setPane('desk'); renderDesk(); tutEvent('draft');
      break;
    case 'env':
      if (!c.openedEnv) { c.openedEnv = true; spend(COSTS.envelope); youLine('Let me see the case file. Recipients, attachments, all of it.'); if (c.personality === 'irritable' || c.personality === 'arrogant') themLine(pickLine(['Is that necessary?', 'Fine. Dig away.', 'CHUCK already checked all that.'])); }
      UI.deskTab = 'env'; setPane('desk'); renderDesk(); tutEvent('env');
      break;
    case 'question':
      if (isMobile() && UI.pane !== 'talk') { setPane('talk'); toggleQuestions(true); } else toggleQuestions();
      break;
    case 'approve': decideStart('approve'); break;
    case 'deny': decideStart('deny'); break;
    case 'detain': decideStart('detain'); break;
    case 'escalate': escalate(); break;
    default: break;
  }
}

function toggleQuestions(force) {
  const c = UI.cur;
  UI.qOpen = force !== undefined ? force : !UI.qOpen;
  const q = $('qpanel');
  q.hidden = !UI.qOpen;
  if (!UI.qOpen) return;
  q.innerHTML = '';
  QUESTIONS.forEach((qq) => {
    const b = document.createElement('button');
    b.className = 'btn' + (c.asked[qq.id] ? ' asked' : '') + (qq.who === 'them' ? ' tothem' : '');
    b.textContent = qq.who === 'them' ? `Ask ${c.first}: ${qq.text}` : `${qq.id}. ${qq.text}`;
    b.addEventListener('click', () => ask(qq));
    q.appendChild(b);
  });
  (c.extraQuestions || []).filter((e) => !(e.once && c.asked[e.id])).forEach((e) => {
    const b = document.createElement('button');
    b.className = 'btn special';
    b.textContent = e.text;
    b.addEventListener('click', () => askExtra(e));
    q.appendChild(b);
  });
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
      qtext = `CHUCK, explain this: “${fld ? String(fld.v).slice(0, 70) : 'that stamp'}”`;
    }
  }
  youLine(qtext);
  spend(COSTS.question);
  const ans = answerQuestion(c, qq.id, S);
  setTimeout(() => { (ans.who === 'chuck' ? chuckLine : themLine)(ans.text); renderTraveller(); }, 250);
  toggleQuestions(true);
}

function askExtra(e) {
  const c = UI.cur;
  c.asked[e.id] = 1;
  youLine(e.text.replace(/^\[[^\]]+\]\s*/, ''));
  spend(COSTS.question);
  applyFx(e.fx);
  if (e.flag) S.flags[e.flag] = true;
  setTimeout(() => sysLine(e.answer), 250);
  toggleQuestions(true);
}

function escalate() {
  const c = UI.cur;
  if (S.shift.security <= 0 || c.searched) return;
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
    if (!c.guilty) { c.irritation += 2; c.complained = true; themLine(pickLine(['You called Oversight on a normal case? Now they know my name.', 'Great. Now I’m on a list.', 'Cool. Cool cool cool. My Score thanks you.'])); }
  }
  renderDesk(); renderEvidence(); renderTraveller();
}

function decideStart(dec) {
  const c = UI.cur;
  if (UI.busy) return;
  if (c.bribe > 0 && !c.bribeOffered && dec !== 'approve') {
    c.bribeOffered = true;
    const gift = pickLine([`a Tier 1 ration card (worth $${c.bribe})`, `$${c.bribe} in unlogged cash`, `a +${Math.round(c.bribe / 10)} Score “correction” for your mother`]);
    openModal('A QUIET OFFER', `<p>${esc(c.first)} leans over the desk and lowers their voice.</p><p style="color:var(--meat-dark)">“${esc(pickLine(['Look, can we just… not, today?', 'Nobody needs to know about this one.', 'I’ll make it worth your while.']))}”</p><p>The offer: <b>${esc(gift)}</b>. Just sign it.</p>`, [
      { label: 'Take it and sign', cls: 'deny', fn: () => { closeModal(); c.tookBribe = true; S.money += c.bribe; S.totals.bribes += c.bribe; bump('corruption', 1); bump('suspicion', 1); Sound.play('coin'); finalize('approve'); } },
      { label: 'Refuse', cls: 'primary', fn: () => { closeModal(); youLine('No.'); decideStart(dec); } }
    ]);
    return;
  }
  if (dec === 'detain') {
    openModal('WITHHOLD SIGNATURE', `<p>Withhold your signature from <b>${esc(c.title)}</b>? It stops here and gets logged with Oversight under your name.</p><p style="color:var(--text-dim)">Withholding a lawful decision costs pay and Score. Sometimes it’s worth it. That’s for you to decide.</p>`, [
      { label: 'Cancel', fn: closeModal },
      { label: 'Withhold', cls: 'detain', fn: () => { closeModal(); finalize('detain'); } }
    ]);
    return;
  }
  finalize(dec);
}

function judgeGeneric(dec, c) {
  if (c.guilty) {
    if (dec === 'detain') return { outcome: 'caught' };
    if (dec === 'deny') return { outcome: 'turned' };
    return { outcome: 'missed' };
  }
  if (c.defects.length) {
    if (dec === 'deny') return { outcome: 'correct_deny' };
    if (dec === 'detain') return { outcome: 'wrong_detain' };
    return { outcome: 'breach' };
  }
  if (dec === 'approve') return { outcome: 'helped' };
  if (dec === 'deny') return { outcome: 'wrong_deny' };
  return { outcome: 'wrong_detain' };
}

function flaggedFlaw(c) {
  if (!c.flags.length) return false;
  return c.flags.some((f) => (f.doc === 'draft' && (c.flawFields || []).includes(f.field)) || (f.doc === 'stamp' && c.flaw && /stamp/.test(c.flaw.kind || '')));
}

function finalize(dec) {
  const c = UI.cur;
  UI.busy = true;
  toggleQuestions(false);
  setPane('talk');
  spend(1);
  const story = c.story && STORY_PEOPLE[c.story];
  const before = S.affected || 0;
  let res;
  if (story && story.judge) res = story.judge(dec, c, S);
  else if (c.cruel) {
    if (dec === 'approve') { bump('conscience', -1); S.affected = before + c.cruel.harm; res = { outcome: 'helped' }; }
    else if (dec === 'deny') { bump('conscience', 1); res = { outcome: 'wrong_deny', note: 'You returned a lawful decision. Someone gets a few more days. Your Score pays for them.' }; }
    else { bump('conscience', 2); bump('suspicion', 1); res = { outcome: 'wrong_detain', note: 'You withheld a lawful decision. Oversight has logged your name next to it.' }; }
  } else {
    res = judgeGeneric(dec, c);
    if (dec === 'approve' && c.guilty && c.weighty) S.affected = before + 1;
  }
  S.shift.affected = (S.shift.affected || 0) + ((S.affected || 0) - before);
  const O = OUTCOME[res.outcome];
  let pay = Math.round(O.pay * (O.pay < 0 ? diff().penalty : 1));
  let rep = O.rep;
  const evidence = c.evidenceFound || flaggedFlaw(c);
  if (res.outcome === 'caught' && evidence) pay += 15;
  if (res.outcome === 'helped' && c.complained) rep -= 1;
  if (c.tookBribe) rep -= 1;
  if (plan() && plan().watch && O.ok === 0) bump('suspicion', 1);
  S.money += pay;
  S.rep = Math.max(0, Math.min(100, S.rep + rep));
  const sentBad = dec === 'approve' && (c.guilty || c.defects.length || c.cruel);
  const rec = {
    cruel: !!c.cruel, sid: c.sid, name: `${c.first} ${c.last}`, dept: c.dept, title: c.title, decision: dec, outcome: res.outcome, ok: O.ok, label: O.label,
    note: res.note || '', guilty: c.guilty, truth: c.truthNote || (c.guilty ? 'Harmful.' : c.defects.length ? 'Needed fixing.' : 'Correct.'),
    clues: c.clues.slice(), fallout: sentBad && c.fallout ? c.fallout : '', evidence: !!evidence, pay, bribe: c.tookBribe ? c.bribe : 0, story: !!c.story
  };
  S.shift.records.push(rec);
  registryAdd(c, rec);
  const stampTxt = dec === 'approve' ? 'COUNTERSIGNED' : dec === 'deny' ? 'RETURNED' : 'WITHHELD';
  stampFx(stampTxt, dec === 'approve' ? 'ok' : dec === 'deny' ? 'no' : 'det');
  Sound.play(dec === 'detain' ? 'alarm' : 'stamp');
  UI.chuckMood = dec === 'approve' ? 'happy' : 'alert';
  youLine(dec === 'approve' ? 'Countersigned.' : dec === 'deny' ? 'Returned for correction. Fix it and bring it back.' : 'I’m withholding my signature.');
  setTimeout(() => themLine(pickLine(EXIT_LINES[dec])), 300);
  setTimeout(() => chuckLine(dec === 'approve' ? pickLine(['Lawful! 😊', 'Another citizen, efficiently handled.', 'Your liability is noted. Thank you!']) : dec === 'deny' ? pickLine(['I’ll fix it. I’ll fix it so hard.', 'Noted. Ignored. Kidding! Noted.']) : pickLine(['Withholding is… logged.', 'I’ve told Oversight. For transparency!', 'Interesting choice. I’ve added it to your Score.'])), 600);
  if (res.note) setTimeout(() => sysLine(res.note), 900);
  tutEvent('decide');
  setTimeout(() => {
    UI.walk = { from: 0, to: 90, start: performance.now(), dur: 600 };
    setTimeout(() => {
      S.shift.current = null;
      S.shift.index += 1;
      S.shift.clock += COSTS.walk;
      UI.cur = null;
      UI.busy = false;
      nextItem();
    }, 650);
  }, 2000);
}

function stampFx(text, cls) {
  const d = document.createElement('div');
  d.className = `stampfx ${cls}`;
  d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

/* ================= REPORT ================= */
function endShift() {
  S.phase = 'report';
  const sh = S.shift;
  const over = Math.max(0, sh.clock - shiftEnd());
  const otPay = Math.round(Math.ceil(over / 15) * 10 * diff().penalty);
  const otRep = Math.floor(over / 30);
  const recs = sh.records;
  const earned = recs.reduce((s, r) => s + Math.max(0, r.pay), 0);
  const penalties = recs.reduce((s, r) => s + Math.min(0, r.pay), 0) - otPay;
  S.money += BASE_WAGE - otPay;
  S.rep = Math.max(0, S.rep - otRep);
  const score = recs.reduce((s, r) => s + r.ok, 0);
  let stars = Math.max(1, Math.round(score));
  if (recs.some((r) => r.outcome === 'wrong_detain')) stars = Math.min(stars, 2);
  stars = score >= 4.99 ? 5 : Math.min(stars, 4);
  const summary = {
    day: S.day, inspected: recs.length,
    clean: recs.filter((r) => !r.guilty).length,
    affected: sh.affected || 0,
    caught: recs.filter((r) => r.outcome === 'caught').length,
    turned: recs.filter((r) => r.outcome === 'turned').length,
    missed: recs.filter((r) => r.outcome === 'missed').length,
    wrongRejected: recs.filter((r) => r.outcome === 'wrong_deny' || r.outcome === 'wrong_detain').length,
    breaches: recs.filter((r) => r.outcome === 'breach').length,
    success: recs.filter((r) => r.ok > 0).length,
    stars, earned, penalties, overtime: over, otPay, bribes: recs.reduce((s, r) => s + r.bribe, 0)
  };
  S.totals.inspected += recs.length;
  S.totals.ok += summary.success;
  S.totals.caught += summary.caught;
  S.totals.missed += summary.missed;
  S.totals.wrong += summary.wrongRejected;
  S.totals.helped += recs.filter((r) => r.outcome === 'helped').length;
  S.totals.earned += earned + BASE_WAGE;
  S.totals.penalties += penalties;
  S.history.push(summary);
  S.lastReport = { summary, records: recs };
  autosave();
  showReport();
}

const RATING = { 5: 'Exemplary proxy!', 4: 'Compliant.', 3: 'Adequate. CHUCK is watching your numbers.', 2: 'Poor. Oversight has been notified.', 1: 'Unacceptable. A Score review is being drafted (by CHUCK).' };

function showReport() {
  show('screen-report');
  Sound.setTrack('menu');
  const { summary: s, records } = S.lastReport;
  const marks = { helped: 'ok', correct_deny: 'ok', caught: 'ok', turned: 'part', missed: 'bad', wrong_deny: 'bad', wrong_detain: 'bad', breach: 'bad' };
  const decWord = (r) => (r.decision === 'approve' ? 'Countersigned' : r.decision === 'deny' ? 'Returned' : 'Withheld');
  const row = (label, v) => `<tr><td>${esc(label)}</td><td class="n">${v}</td></tr>`;
  const stars = '★'.repeat(s.stars) + `<span class="off">${'★'.repeat(5 - s.stars)}</span>`;
  $('report-wrap').innerHTML = `<div class="report">
    <h2>SHIFT ${String(s.day).padStart(2, '0')} — DAILY REPORT</h2>
    <div class="sub">DISTRICT 7 COUNTERSIGNATURE OFFICE · ${esc(S.officer.toUpperCase())} · ${esc(longDate(dayDate(S.day)).toUpperCase())}</div>
    <div class="cols">
      <div><table>
        ${row('Decisions reviewed', s.inspected)}
        ${row('Lawful decisions', s.clean)}
        ${row('Harm withheld', s.caught)}
        ${row('Harm only returned', s.turned)}
        ${row('Harm countersigned', s.missed)}
        ${row('Lawful decisions blocked', s.wrongRejected)}
        ${row('Statute breaches', s.breaches)}
        ${row('Compliant reviews', `${s.success}/${s.inspected}`)}
      </table>
      <div class="stars" aria-label="${s.stars} of 5 stars">${stars}</div>
      <div class="verdict-line">${s.stars}-STAR SHIFT — ${esc(RATING[s.stars].toUpperCase())}</div>
      <div class="conscience">${s.affected ? `People affected by what you countersigned today: <b>${s.affected.toLocaleString('en-US')}</b>.` : 'Nobody was harmed by what you signed today. As far as you know.'}</div></div>
      <div><table>
        ${row('Day rate', money(BASE_WAGE))}
        ${row('Bonuses earned', '+' + money(s.earned))}
        ${row('Deductions', money(s.penalties))}
        ${s.otPay ? row(`Overtime (${s.overtime} min late)`, '−' + money(s.otPay)) : ''}
        ${s.bribes ? row('“Gifts” (unreported)', '+' + money(s.bribes)) : ''}
        ${row('Savings', money(S.money))}
        ${row('Alignment Score', align(S.rep))}
        ${row('Harm withheld, all time', S.totals.caught)}
        ${row('People affected, all time', (S.affected || 0).toLocaleString('en-US'))}
        ${row('Overall accuracy', `${accuracy()}%`)}
      </table></div>
    </div>
    <div class="case-list">${records.map((r) => `
      <div class="case"><div class="mark ${marks[r.outcome]}">${marks[r.outcome] === 'ok' ? '✓' : marks[r.outcome] === 'part' ? '~' : '✗'}</div>
      <div><div class="t">${esc(r.title)} · ${esc(r.name)} (${esc(r.dept)}) — ${decWord(r)} · ${esc(r.label)} · ${r.pay >= 0 ? '+' : ''}${money(r.pay)}</div>
      <div class="d">${esc(r.truth)}</div>
      ${r.fallout ? `<div class="fall">What happened next: ${esc(r.fallout)}</div>` : ''}
      ${r.note ? `<div class="d"><i>${esc(r.note)}</i></div>` : ''}
      ${r.clues.length && marks[r.outcome] !== 'ok' ? `<div class="clue">Where it showed: ${esc(r.clues.join(' · '))}</div>` : ''}</div></div>`).join('')}
    </div></div>
    <div class="report-actions"><button class="btn" id="rep-save">Save game</button><button class="btn primary" id="rep-next">${S.rep <= 0 ? 'See Marta' : 'Clock out'}</button></div>`;
  $('report-wrap').scrollTop = 0;
  $('rep-save').addEventListener('click', () => openLoad(true));
  $('rep-next').addEventListener('click', () => {
    Sound.play('click');
    if (S.rep <= 0) return finishEnding('dismissed');
    S.phase = 'evening';
    autosave();
    playEvening();
  });
}

function playEvening() {
  S.phase = 'evening';
  if (S.endless) { nextDay(); return; }
  if (S.day >= CAMPAIGN_DAYS) {
    playScene(SCENES.final(S), { date: `<b>4:58 P.M.</b> · AUTONOMY DAY`, side: eveningSide(), doneLabel: 'Continue', onDone: () => finishEnding(resolveEnding(S, 'stay')), onEnding: (e) => finishEnding(resolveEnding(S, e)) });
    return;
  }
  const f = SCENES['eve' + S.day];
  const lines = (f ? f(S) : [L('narrator', 'You take the 22 home. The fog follows you. So does a drone.')]).concat(alignFlavour());
  if (S.flags.blockedRender1 && S.day === 2 && !S.flags.renderFined) { S.flags.renderFined = true; S.money -= 30; S.rep = Math.max(0, S.rep - 2); }
  playScene(lines, { date: `<b>EVENING</b> · ${esc(longDate(dayDate(S.day)).toUpperCase())}`, side: eveningSide(), doneLabel: 'Go home', onDone: nextDay });
}

function alignFlavour() {
  const a = align(S.rep);
  if (a < 250) return [L('narrator', `Your Alignment Score is ${a}. A letter under your door: your rent is “rebalanced” up 30%. Below 100, it says, comes relocation.`)];
  if (a < 400) return [L('narrator', `Your Alignment Score is ${a}. Your protein tier drops to Ration Block. Dinner is a grey cube with a smiley face embossed on it.`)];
  if (a > 750) return [L('narrator', `Your Alignment Score is ${a}. The depot gives you Tier 2 brisket. It tastes like everybody else’s Tier 4.`)];
  return [];
}

function eveningSide() {
  const h = S.history[S.history.length - 1];
  return `<div class="memo"><h3>NOTES APP</h3><div class="from">${esc(S.officer)}</div>
    <p style="margin:0 0 6px">Alignment Score: ${align(S.rep)}<br>Savings: ${money(S.money)}<br>Last shift: ${h ? '★'.repeat(h.stars) : '—'}</p>
    <p style="margin:0;color:#6b5f4a">${esc(makeRng(S.day * 13).pick(GENERAL_LINES))}</p></div>`;
}

function nextDay() {
  S.day += 1;
  S.shift = null;
  S.bulletin = [];
  startDay();
}

function finishEnding(key) {
  S.phase = 'ending';
  S.ending = key;
  const got = store.get(KEYS.endings, {});
  got[key] = true;
  store.set(KEYS.endings, got);
  autosave();
  showEnding(key);
}

function showEnding(key) {
  show('screen-ending');
  Sound.setTrack('menu');
  const E = ENDINGS[key] || ENDINGS.replaced;
  const got = store.get(KEYS.endings, {});
  const st = S.stats;
  $('ending').innerHTML = `
    <div class="eyebrow">ENDING ${Object.keys(got).length} OF ${Object.keys(ENDINGS).length} FOUND</div>
    <h2>${esc(E.title)}</h2>
    ${E.text(S).map((p) => `<p>${esc(p)}</p>`).join('')}
    <div class="memo"><h3>COUNTERSIGNER FILE (CLOSED)</h3><div class="from">${esc(S.officer)} · ${S.history.length} shifts</div>
      <p style="margin:0">Decisions reviewed: ${S.totals.inspected} · Compliance: ${accuracy()}% · Harm withheld: ${S.totals.caught}<br>
      People affected by your signature: ${(S.affected || 0).toLocaleString('en-US')} · Alignment Score: ${align(S.rep)} · Savings: ${money(S.money)} · “Gifts”: ${money(S.totals.bribes)}<br>
      Loyalty ${st.party} · Conscience ${st.conscience} · Oversight suspicion ${st.suspicion} · Things you read that you can’t unread ${st.truth}</p></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn primary" id="end-menu">Main menu</button>
      <button class="btn" id="end-new">New contract</button>
      ${['dismissed', 'walked_out', 'scapegoat'].includes(key) ? '' : '<button class="btn" id="end-endless">Keep signing (endless)</button>'}
    </div>`;
  $('end-menu').addEventListener('click', renderMenu);
  $('end-new').addEventListener('click', () => openNewGame(false));
  const ee = $('end-endless');
  if (ee) ee.addEventListener('click', () => { S.endless = true; S.phase = 'brief'; S.day += 1; S.shift = null; startDay(); });
}

/* ================= SCENE PLAYER ================= */
function playScene(items, opts) {
  show('screen-scene');
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
  const queue = items.slice();
  let i = 0;
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
    if (i >= queue.length) { cont(opts.doneLabel || 'Continue', () => { UI.sceneNext = null; opts.onDone(); }); return; }
    const it = queue[i++];
    if (it.choices) {
      choicesEl.innerHTML = '';
      it.choices.forEach((ch) => {
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = ch.text;
        b.disabled = !!ch.disabled;
        b.addEventListener('click', () => {
          Sound.play('click');
          applyFx(ch.fx);
          if (ch.money) { S.money += ch.money; if (ch.money > 0) Sound.play('coin'); }
          if (ch.flag) S.flags[ch.flag] = true;
          addSceneLine({ who: 'you', text: ch.text }, false);
          if (ch.ending) { (opts.onEnding || opts.onDone)(ch.ending); return; }
          queue.splice(i, 0, ...(ch.then || []));
          step();
        });
        choicesEl.appendChild(b);
      });
      return;
    }
    addSceneLine(it, true);
    cont('Continue ▸', step);
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
  if (animate) typeInto(tx, it.text, () => { log.scrollTop = log.scrollHeight; });
  else tx.textContent = it.text;
  log.scrollTop = log.scrollHeight;
}

/* ================= MODALS ================= */
function openModal(title, bodyHtml, buttons, wide) {
  const m = $('modal');
  m.className = 'modal' + (wide ? ' wide' : '');
  m.innerHTML = `<div class="modal-h"><span>${esc(title)}</span><button class="btn small" id="modal-x" aria-label="Close">✕</button></div><div class="modal-b">${bodyHtml}</div>${buttons && buttons.length ? '<div class="modal-f"></div>' : ''}`;
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
  return m;
}
function closeModal() { $('overlay').hidden = true; UI.modalOpen = false; }

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
    const meta = d ? `${esc(d.meta.officer)} · ${d.meta.endless ? 'Endless' : 'Day ' + d.meta.day} · ${money(d.meta.money)} · ${esc(new Date(d.meta.when).toLocaleString('en-US'))}` : 'Empty';
    return `<div class="slot"><div><b>${s === 'auto' ? 'Autosave' : 'Slot ' + s}</b><div class="meta">${meta}</div></div><div style="display:flex;gap:8px">
      ${allowSave && s !== 'auto' && S ? `<button class="btn small" data-save="${s}">Save here</button>` : ''}
      ${d ? `<button class="btn small primary" data-load="${s}">Load</button>` : ''}</div></div>`;
  }).join('');
  const m = openModal(allowSave ? 'SAVE / LOAD' : 'LOAD GAME', body, [{ label: 'Close', fn: closeModal }]);
  m.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => { saveGame(b.dataset.save); openLoad(allowSave); }));
  m.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => loadGame(b.dataset.load === 'auto' ? 'auto' : +b.dataset.load)));
}

function openSettings() {
  const range = (k, label) => `<div class="set-row"><label class="label" for="set-${k}">${label}</label><input type="range" id="set-${k}" min="0" max="1" step="0.05" value="${settings[k]}"></div>`;
  const seg = (k, label, opts) => `<div class="set-row"><span class="label">${label}</span><div class="seg">${opts.map(([v, l]) => `<button class="btn${settings[k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  const body = range('master', 'Master volume') + range('music', 'Music') + range('ambience', 'Office ambience') + range('sfx', 'Effects') +
    seg('textSpeed', 'Text speed', [['instant', 'Instant'], ['fast', 'Fast'], ['normal', 'Typewriter']]) +
    seg('crt', 'Scanlines', [[true, 'On'], [false, 'Off']]) + seg('large', 'Text size', [[false, 'Normal'], [true, 'Large']]) + seg('tips', 'Tutorial tips', [[true, 'On'], [false, 'Off']]);
  const m = openModal('SETTINGS', body, [{ label: 'Done', cls: 'primary', fn: closeModal }]);
  ['master', 'music', 'ambience', 'sfx'].forEach((k) => m.querySelector(`#set-${k}`).addEventListener('input', (e) => { settings[k] = +e.target.value; Sound.unlock(); applySettings(); }));
  m.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v;
    settings[b.dataset.k] = v;
    applySettings();
    openSettings();
  }));
}

function fmtPattern(f) { return f.replace(/#/g, '0').replace(/@/g, 'A'); }

function openRulebook(tab) {
  if (!S) return;
  const d = rulesDay();
  const t = tab || UI.rbTab || 'rules';
  UI.rbTab = t;
  const tabs = [['rules', 'Statutes'], ['stamps', 'Stamp register'], ['phish', 'Oversight bulletin'], ['today', 'Desk notes']];
  let body = `<div class="rb-tabs">${tabs.map(([k, l]) => `<button class="btn small${k === t ? ' primary' : ''}" data-rb="${k}">${l}</button>`).join('')}</div>`;
  if (t === 'rules') {
    body += `<div class="rb-sec">${POLICIES.filter((r) => r.day <= d).map((r) => `<div class="rule${!S.endless && r.day === S.day ? ' new' : ''}"><b>${esc(r.id)} · ${esc(r.title.toUpperCase())}${!S.endless && r.day === S.day ? ' · NEW TODAY' : ''}</b>${esc(r.text)}</div>`).join('')}</div>`;
  } else if (t === 'stamps') {
    if (d < 2) body += '<p style="color:var(--text-dim)">Stamps arrive with the policy on day 2. Nothing needs a stamp yet.</p>';
    body += `<p style="color:var(--text-dim)">A real stamp has the right symbol, the right colour${d >= 5 ? ' and a reference number in the right format (A = letter, 0 = digit)' : ''}.</p>`;
    body += `<div class="reg-table-wrap"><table class="reg-table"><thead><tr><th>Department</th><th>Stamp</th><th>Reference format</th><th>Approvers</th></tr></thead><tbody>${Object.values(STAMPS).map((s) => `<tr><td>${esc(s.dept)}</td><td><span class="sealmini" style="color:${SEAL_COLORS[s.color]}">${s.glyph}</span> ${esc(s.color)}</td><td>${d >= 5 ? esc(fmtPattern(s.fmt)) : '—'}</td><td>${esc(s.approver.join(', '))}</td></tr>`).join('')}</tbody></table></div>`;
    body += '<div class="rule"><b>WHO NEEDS WHAT</b>Employment decisions: Labour Allocation (day 2+). New bank details: Treasury (day 3+). Relocations: Housing Allocation (day 4+). Commands on city systems: Systems (day 4+). Press replies: Narrative Office (day 7+). Amendment Day: Steward’s Office on everything external.</div>';
  } else if (t === 'phish') {
    body += S.bulletin.length ? bulletinHtml() : '<p style="color:var(--text-dim)">No bulletin today. Oversight publishes one from day 5.</p>';
  } else {
    body += `<div class="rb-sec">
      <div class="rule"><b>TODAY</b>${esc(longDate(dayDate(S.day)))}.</div>
      <div class="rule"><b>THREE PAPERS</b>The order says what was decided. The source file has the facts. CHUCK’s draft is what goes out with your name on it. Everything in the draft must match the other two.</div>
      <div class="rule"><b>LAWFUL IS NOT THE SAME AS RIGHT</b>Some decisions follow the statutes perfectly and still hurt someone. Compliance pays you. The case file shows you who pays for it. Nobody will tell you which to choose.</div>
      <div class="rule"><b>CHUCK</b>CHUCK is always confident. That tells you nothing. Its answers sometimes contradict the source data. That tells you a lot.</div>
      <div class="rule"><b>RETURN OR WITHHOLD?</b>Clerical mistakes are returned. The wrong person, leaked data, destructive commands, invented statutes, punishments nobody ordered and fraud: withhold your signature.</div>
      <div class="rule"><b>EVIDENCE</b>Withholding with evidence (a flagged line, something found in the case file, or an Oversight review) earns a $15 bonus.</div>
      <div class="rule"><b>TIME</b>Shift ends ${fmtClock(shiftEnd())}. Overtime costs $10 per 15 minutes. Order 2 min · Source 1 · Draft 2 · File 3 · Check 3 · Open 5 · Question 3 · Oversight ${COSTS.escalate}.</div>
    </div>`;
  }
  const m = openModal('STATUTE BOOK · STEWARDSHIP ACCORDS', body, [{ label: 'Close', cls: 'primary', fn: closeModal }], true);
  m.querySelectorAll('[data-rb]').forEach((b) => b.addEventListener('click', () => openRulebook(b.dataset.rb)));
}

function openBulletin() { if (S && S.bulletin.length) openModal('OVERSIGHT BULLETIN', bulletinHtml(), [{ label: 'Close', cls: 'primary', fn: closeModal }]); }

function openRegistry() {
  const reg = Object.values(store.get(KEYS.registry, {}));
  const body = `<p>Officers who have brought you decisions, across all your contracts: <b>${reg.length}</b>.</p>` +
    (reg.length ? reg.sort((a, b) => b.items - a.items).slice(0, 80).map((r) => `<div class="slot"><div><b>${esc(r.name)}</b> <span class="meta">${esc(r.role || '')} · ${esc(r.dept || '')}${r.story ? ' · story' : ''}</span><div class="meta">${r.items} item${r.items > 1 ? 's' : ''}, ${r.harmful} harmful. Last: ${esc(r.last || '')}</div></div></div>`).join('') : '<p style="color:var(--text-dim)">Nobody yet. Sign your contract.</p>');
  openModal('CASE LOG', body, [{ label: 'Close', cls: 'primary', fn: closeModal }], true);
}

function openHowTo() {
  openModal('HOW TO PLAY', `
    <p><b style="color:var(--meat)">The world.</b> San Francisco, 2031. AI labs run the country under the Stewardship Accords. The law still says a human must countersign every automated decision about a person, so that someone can be blamed. That human is you: a meat proxy.</p>
    <p><b style="color:var(--meat)">Three papers.</b> The order (what was decided), the source file (the facts) and CHUCK’s draft (what goes out under your name). Click any line that doesn’t match to flag it.</p>
    <p><b style="color:var(--meat)">Countersign</b> what matches. <b style="color:var(--meat)">Return</b> clerical mistakes. <b style="color:var(--meat)">Withhold</b> anything harmful: the wrong person, leaks, invented statutes, punishments nobody ordered, fraud. <b style="color:var(--meat)">Request Oversight</b> when you need someone to dig (two per shift, and they notice who asks).</p>
    <p><b style="color:var(--meat)">Lawful is not the same as right.</b> Some decisions are perfectly legal and still destroy someone. The case file shows you who. Signing keeps your Score. Refusing costs it. The report tells you how many people your signature reached.</p>
    <p><b style="color:var(--meat)">Question CHUCK.</b> It is always 100% sure. Listen for answers that contradict the source. Ask the officer too: some of them have reasons to rush.</p>
    <p><b style="color:var(--meat)">Your Score.</b> Your own Alignment Score is in the top bar. Let it fall and your rations shrink, then your rent rises, then a relocation order arrives with your name on it.</p>
    <p>There are ${Object.keys(ENDINGS).length} endings.</p>`, [{ label: 'Close', cls: 'primary', fn: closeModal }]);
}

/* ================= TUTORIAL ================= */
const TUT = [
  { text: 'This is Marta, your supervisor. Officers bring you decisions all shift. Read them like people: mood, patience, how they talk. But the decision is what you sign.', target: 'portrait-panel' },
  { text: 'Start with the order: what was decided? Press READ THE ORDER (key 1).', target: 'a-passport', wait: 'ask' },
  { text: 'Now the source file: the facts behind the decision. Press CHECK SOURCE FILE (2).', target: 'a-id', wait: 'source' },
  { text: 'Now CHUCK’s draft. Compare every name, number and date with the order and the source. Click a line that’s wrong to flag it.', target: 'a-travel', wait: 'draft' },
  { text: 'Question CHUCK. It is always sure of itself; listen for answers that contradict the source.', target: 'a-ask', wait: 'question' },
  { text: 'The case file holds recipients, attachments and the context nobody reads. Check anything; open whatever looks off. Every action costs minutes.', target: 'a-luggage', wait: 'env' },
  { text: 'The STATUTE BOOK (key R) holds every statute, the stamp register and the Oversight bulletin. It grows every day.', target: 'btn-rules' },
  { text: 'Decide. COUNTERSIGN if it matches. RETURN if it needs fixing. WITHHOLD if it’s harmful. Marta’s renewal looks right to me. Does it to you?', target: 'controls', wait: 'decide' }
];
function startTutorial() { if (!settings.tips) return; UI.tut = 0; showTip(); }
function showTip() {
  document.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
  if (UI.tut === null || UI.tut === undefined || UI.tut >= TUT.length) { $('tip').hidden = true; UI.tut = null; if (S) S.tutDone = true; return; }
  const step = TUT[UI.tut];
  $('tip-text').textContent = step.text;
  $('tip').hidden = false;
  $('tip-next').textContent = UI.tut === TUT.length - 1 ? 'Got it' : 'Next';
  const el = $(step.target);
  if (el) el.classList.add('hl');
}
function tutEvent(name) {
  if (UI.tut === null || UI.tut === undefined) return;
  const step = TUT[UI.tut];
  if (step && step.wait === name) { UI.tut += 1; showTip(); }
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
  Art.scene($('scene-canvas'), { weather: weatherToday(), t: ts, people, chuckMood: UI.chuckMood });
}

/* ================= INPUT ================= */
function bindControls() {
  const map = { 'a-passport': 'ask', 'a-id': 'source', 'a-luggage': 'env', 'a-travel': 'draft', 'a-ask': 'question', 'a-approve': 'approve', 'a-deny': 'deny', 'a-security': 'escalate', 'a-detain': 'detain' };
  Object.entries(map).forEach(([id, a]) => $(id).addEventListener('click', () => { Sound.play('click'); act(a); }));
  document.querySelectorAll('.pane-tab').forEach((t) => t.addEventListener('click', () => { Sound.play('click'); setPane(t.dataset.pane); }));
  $('btn-rules').addEventListener('click', () => openRulebook());
  $('btn-bulletin').addEventListener('click', openBulletin);
  $('btn-pause').addEventListener('click', openPause);
  $('btn-begin').addEventListener('click', () => { Sound.unlock(); Sound.play('stamp'); newGame(); });
  $('btn-new-back').addEventListener('click', renderMenu);
  $('tip-next').addEventListener('click', () => { UI.tut += 1; showTip(); });
  $('tip-skip').addEventListener('click', () => { UI.tut = null; showTip(); });
  $('scene-log').addEventListener('click', () => UI.sceneAdvance && UI.sceneAdvance());
  $('overlay').addEventListener('click', (e) => { if (e.target === $('overlay')) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') { if (e.key === 'Enter' && UI.screen === 'screen-new') newGame(); return; }
    if (e.key === 'Escape') { if (UI.modalOpen) closeModal(); else if (S && (UI.screen === 'screen-booth' || UI.screen === 'screen-scene')) openPause(); return; }
    if (UI.modalOpen) return;
    if (UI.screen === 'screen-scene' && (e.key === ' ' || e.key === 'Enter')) { if (document.activeElement && document.activeElement.tagName === 'BUTTON' && !UI.sceneNext) return; e.preventDefault(); if (UI.sceneAdvance) UI.sceneAdvance(); return; }
    if (UI.screen !== 'screen-booth') return;
    const k = e.key.toLowerCase();
    const keys = { 1: 'ask', 2: 'source', 3: 'env', 4: 'draft', q: 'question', a: 'approve', d: 'deny', s: 'escalate', x: 'detain' };
    if (keys[k]) { e.preventDefault(); Sound.play('click'); act(keys[k]); }
    if (k === 'r') openRulebook();
    if (k === 'b') openBulletin();
  });
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
}

function boot() {
  applySettings();
  bindControls();
  renderMenu();
  requestAnimationFrame(titleLoop);
  requestAnimationFrame(frame);
}

boot();
