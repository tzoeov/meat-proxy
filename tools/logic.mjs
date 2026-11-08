// Headless game-logic test: drives the real game in Chrome over file:// and exits non-zero on any failure.
// Usage: node tools/logic.mjs [url]   (needs playwright-core; set PW_HOME to a package.json whose node_modules has it)
import { createRequire } from 'module';
const require = createRequire(process.env.PW_HOME || '/tmp/shades-harness/package.json');
const { chromium } = require('playwright-core');
const url = process.argv[2] || new URL('../index.html', import.meta.url).href;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
// Every page runs on a seeded Math.random, restarted on each load, so a run is the same run every time. LOGIC_SEED
// picks another one.
const LOGIC_SEED = Number(process.env.LOGIC_SEED || 20311110) >>> 0;

let failures = 0, passes = 0;
const errors = [];
const ok = (cond, name, detail) => {
  if (cond) { passes++; console.log('  ok  ', name); }
  else { failures++; console.log('  FAIL', name, detail === undefined ? '' : JSON.stringify(detail)); }
};

async function open(viewport, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: viewport || { width: 1280, height: 800 } }, opts || {}));
  await ctx.addInitScript((seed0) => {
    let seed = seed0;
    Math.random = () => {
      seed = (seed + 0x6D2B79F5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try {
      if (!sessionStorage.getItem('keep')) { localStorage.clear(); sessionStorage.setItem('keep', '1'); }
      if (!localStorage.getItem('meatproxy.settings.v1')) localStorage.setItem('meatproxy.settings.v1', JSON.stringify({ textSpeed: 'instant', tips: true, music: 0, sfx: 0, ambience: 0, master: 0 }));
    } catch (e) { /* storage blocked: the game copes */ }
    const st = window.setTimeout;
    window.setTimeout = (fn, ms, ...a) => st(fn, Math.min(ms || 0, 1), ...a);
    // Shared helpers for the tests below.
    window.__t = {
      tick: () => new Promise((r) => setTimeout(r, 0)),
      async until(cond, n = 3000) { for (let i = 0; i < n; i++) { if (cond()) return true; await window.__t.tick(); } return false; },
      start(endless, tutorial) {
        newOpts.endless = !!endless; newOpts.tutorial = !!tutorial;
        const realNow = Date.now, realRandom = Math.random;
        Date.now = () => 4242; Math.random = () => 0;
        newGame();
        Date.now = realNow; Math.random = realRandom;
      },
      // Puts a chosen case on the desk and signs it, then waits for the next case or the report.
      async decide(c, dec) {
        await window.__t.until(() => UI.cur && !UI.busy);
        S.shift.current = c; presentItem(c, true);
        const before = S.shift.index;
        finalize(dec);
        await window.__t.until(() => S.shift.index > before && !UI.busy && (UI.screen === 'screen-report' || UI.cur));
        return S.shift.records[S.shift.records.length - 1];
      },
      gen(kind, tpl) { return buildCase({ kind, tpl }, S, makeRng(hashStr(kind + ':' + (tpl || '') + ':' + S.shift.index))); },
      async scene(pick) {
        const seen = [];
        for (let i = 0; i < 400 && UI.screen === 'screen-scene'; i++) {
          const btns = [...document.querySelectorAll('#scene-choices .btn')];
          const choice = btns.find((b) => !b.classList.contains('primary'));
          if (choice) { const want = (pick && btns.find((b) => pick.test(b.textContent))) || choice; want.click(); }
          else if (btns[0]) { seen.push(...[...document.querySelectorAll('#scene-log .txt')].map((e) => e.textContent)); btns[0].click(); }
          await window.__t.tick();
        }
        return [...new Set(seen)];
      }
    };
  }, LOGIC_SEED);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(url);
  await page.waitForSelector('#menu-buttons .btn');
  return { ctx, page };
}

// Reloads with storage intact. Under load Chrome can start the reload before the page's last localStorage write has
// reached the browser process; anything that didn't arrive is written back and the menu drawn again, so a test always
// continues the game it saved, and then waits for the Continue button itself.
async function reloadKeep(page, needContinue = true) {
  const snap = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
  await page.reload();
  await page.waitForSelector('#menu-buttons .btn');
  await page.evaluate((snap) => {
    let lost = 0;
    for (const [k, v] of Object.entries(snap)) if (localStorage.getItem(k) !== v) { localStorage.setItem(k, v); lost++; }
    if (lost) renderMenu();
  }, snap);
  if (needContinue) await page.waitForSelector('#menu-buttons .btn:has-text("Continue")');
}

// ---- 1. Every outcome: grade, label, money, file and report row -----------------------------------------
console.log('outcomes');
{
  const { ctx, page } = await open();
  const shifts = [
    [['clean', null, 'approve', 'helped'], ['back', null, 'deny', 'correct_deny'], ['q', null, 'detain', 'caught'], ['q', null, 'deny', 'turned'], ['q', null, 'approve', 'missed']],
    [['clean', null, 'deny', 'wrong_deny'], ['clean', null, 'detain', 'wrong_detain'], ['back', null, 'approve', 'breach'], ['cruel', null, 'detain', 'refused'], ['cruel', null, 'deny', 'soft_refused']],
    [['back', 'delete-orders', 'detain', 'overcautious'], ['clean', null, 'approve', 'helped'], ['clean', null, 'approve', 'helped'], ['clean', null, 'approve', 'helped'], ['clean', null, 'approve', 'helped']],
    [['story', 'frank', 'approve', 'defied'], ['clean', null, 'approve', 'helped'], ['clean', null, 'approve', 'helped'], ['clean', null, 'approve', 'helped'], ['clean', null, 'approve', 'helped']]
  ];
  for (const plan of shifts) {
    const res = await page.evaluate(async (plan) => {
      __t.start(false, false);
      beginShift();
      const out = [];
      const file0 = S.stats.suspicion;
      for (const [kind, tpl, dec] of plan) {
        const c = kind === 'story' ? STORY_PEOPLE[tpl].make(S) : __t.gen(kind, tpl);
        const money0 = S.money, susp0 = S.stats.suspicion;
        const r = await __t.decide(c, dec);
        out.push({ outcome: r.outcome, label: r.label, pay: r.pay, money: S.money - money0, pages: S.stats.suspicion - susp0, other: !!(c.defects[0] && c.defects[0].other) });
      }
      await __t.until(() => UI.screen === 'screen-report');
      const rows = [...document.querySelectorAll('.case-list .case .t')].map((e) => e.textContent);
      return { out, rows, stars: S.lastReport.summary.stars, harm: document.querySelector('.report .conscience').textContent, filePages: S.stats.suspicion - file0, focus: document.activeElement && document.activeElement.id, success: S.lastReport.summary.success, statsTable: document.querySelector('.report table').textContent };
    }, plan);
    plan.forEach(([, , dec, want], i) => {
      const got = res.out[i];
      ok(got.outcome === want, `${dec} → ${want}`, got);
      ok(res.rows[i] && res.rows[i].includes(got.label), `report row shows “${got.label}”`, res.rows[i]);
    });
    const outcomes = res.out.map((o) => o.outcome);
    if (outcomes.includes('wrong_detain')) ok(res.stars <= 2, 'a lawful decision withheld caps the shift at 2 stars', res.stars);
    if (outcomes.includes('overcautious')) {
      const oc = res.out[outcomes.indexOf('overcautious')];
      ok(oc.other, 'the over-cautious case is a someone-else’s-record flaw');
      ok(oc.pay === -10 && oc.pages === 0, 'over-cautious: −$10 and no page', oc);
      ok(res.stars === 4, 'over-cautious does not cap stars at 2 (4 helped + 1 over-cautious = 4 stars)', res.stars);
      ok(res.success === 4, '“Fully compliant reviews” counts only full credit', res.success);
    }
    if (outcomes.includes('soft_refused')) {
      const s = res.out[outcomes.indexOf('soft_refused')], w = res.out[outcomes.indexOf('refused')];
      ok(s.pages === 0 && w.pages === 1, 'returning a cruel case adds no page; withholding adds one', [s.pages, w.pages]);
      ok(/Withheld on conscience/.test(res.statsTable) && /Returned on conscience/.test(res.statsTable), 'report counts withheld and returned refusals separately');
    }
    if (outcomes.includes('defied')) {
      ok(!/Harm went out/.test(res.harm), 'sending Frank’s report is not “harm went out”', res.harm);
      ok(res.out[0].pay === -40, 'defying Oversight costs the same $40 as before', res.out[0].pay);
    }
    ok(res.focus === 'rep-title', 'report focuses its heading', res.focus);
  }
  await ctx.close();
}

// ---- 2. Ending precedence for all 12 endings ------------------------------------------------------------
console.log('endings');
{
  const { ctx, page } = await open();
  const cases = [
    ['readers', 'readers', { suspicion: 10, conscience: 3 }, {}, 500],
    ['relocated', 'readers', { suspicion: 16 }, {}, 500],
    ['parachute', 'parachute', { suspicion: 4 }, { parachute: true }, 500],
    ['relocated', 'parachute', { suspicion: 9 }, { parachute: true }, 500],
    ['informer', 'informer', { truth: 4 }, {}, 500],
    ['scapegoat', 'stay', { suspicion: 14, conscience: 9 }, { storyOut: true, frankSent: true }, 500],
    ['front_page', 'stay', { suspicion: 13, conscience: 9 }, { storyOut: true, frankSent: true }, 500],
    ['slow_hand', 'stay', { conscience: 6 }, {}, 500],
    ['dry_aged', 'stay', { corruption: 2 }, {}, 1900],
    ['head_of_ai', 'stay', { party: 6, conscience: 0 }, {}, 500],
    ['read_only', 'stay', { party: 2, conscience: 2 }, {}, 500]
  ];
  for (const [want, choice, stats, flags, money] of cases) {
    const r = await page.evaluate(([choice, stats, flags, money]) => {
      __t.start(false, false);
      Object.assign(S.stats, { party: 0, conscience: 0, suspicion: 0, corruption: 0, truth: 0 }, stats);
      Object.assign(S.flags, flags);
      S.money = money; S.day = 10;
      S.totals.refused = 2; S.totals.softRefused = 1;
      const key = resolveEnding(S, choice);
      finishEnding(key);
      return { key, title: document.getElementById('end-title').textContent, focus: document.activeElement.id, text: document.getElementById('ending').textContent };
    }, [choice, stats, flags, money]);
    ok(r.key === want, `${want} (choice ${choice}, ${JSON.stringify(stats)})`, r.key);
  }
  const d = await page.evaluate(async () => {
    __t.start(false, false);
    beginShift();
    for (let i = 0; i < 5; i++) await __t.decide(__t.gen('clean'), 'approve');
    await __t.until(() => UI.screen === 'screen-report');
    S.rep = 0;
    showReport();
    document.getElementById('rep-next').click();
    await __t.until(() => UI.screen === 'screen-ending');
    const hooks = Object.keys(ENDINGS).filter((k) => !ENDING_HOOKS[k]);
    return { ending: S.ending, focus: document.activeElement.id, shifts: document.querySelector('#ending .memo .from').textContent, hooks };
  });
  ok(d.ending === 'dismissed', 'dismissed (Score 0 at the report)', d.ending);
  ok(d.focus === 'end-title', 'ending focuses its heading', d.focus);
  ok(/1 shift\b/.test(d.shifts) && !/1 shifts/.test(d.shifts), '“1 shift”, not “1 shifts”', d.shifts);
  ok(!d.hooks.length, 'every ending has a share hook', d.hooks);
  const share = await page.evaluate(async () => {
    let got = '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { got = t; } }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    document.getElementById('end-share').click();
    await __t.until(() => got);
    return got;
  });
  ok(share.includes(await page.evaluate(() => ENDING_HOOKS.dismissed)), 'ending share text carries the hook line', share);
  await ctx.close();
}

// ---- 3. Reloading in the evening replays the file warning ---------------------------------------------------
console.log('reload');
{
  const { ctx, page } = await open();
  await page.evaluate(async () => {
    __t.start(false, false);
    beginShift();
    for (let i = 0; i < 5; i++) await __t.decide(__t.gen('clean'), 'approve');
    await __t.until(() => UI.screen === 'screen-report');
    S.stats.suspicion = 5;
    document.getElementById('rep-next').click();
  });
  await reloadKeep(page);
  const r = await page.evaluate(async () => {
    const cont = [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent));
    cont.click();
    const lines = await __t.scene();
    return { lines, flag: !!S.flags.fileWarn5, phase: S.phase };
  });
  ok(r.lines.some((l) => /Ines asked for your file today/.test(l)), 'after a reload the evening still shows Marta’s file warning', r.lines.slice(-6));
  ok(r.flag, 'the warning flag is set once the line has been shown');
  // Shown once only: a second evening does not repeat it.
  const again = await page.evaluate(() => fileWarnings().length);
  ok(again === 0, 'the warning is not queued again after it was shown', again);
  await ctx.close();
}

// ---- 4. Narration matches state; story grading --------------------------------------------------------------
console.log('narration');
{
  const { ctx, page } = await open();
  const r = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false);
    S.flags.dinoReported = true; S.rep = 80;
    S.phase = 'evening'; nextDay();
    out.dino = S.rep;
    __t.start(false, false);
    S.day = 6; S.rep = 70;
    playScene(SCENES.eve6(S), { onDone: () => {} });
    await __t.scene(/Report Ravi/);
    out.ravi = S.rep;
    __t.start(false, false);
    out.render = SCENES.brief9(Object.assign({}, S, { flags: { blockedRender1: true } })).map((l) => l.text || '').join(' ');
    const qs = SCENES.brief9(Object.assign({}, S, { flags: { frankSent: true, bayviewBlocked: true, sawRender: true } }));
    out.interviewPages = qs.filter((l) => l.choices).reduce((s, l) => s + Math.max(...l.choices.map((ch) => (ch.fx && ch.fx.suspicion) || 0)), 0);
    const frank = STORY_PEOPLE.frank.make(S);
    out.frankFirst = frank.first;
    S.day = 8; beginShift(); S.shift.index = 3;
    presentItem(frank, false);
    await __t.tick(); await __t.tick();
    out.frankLine = document.getElementById('log').textContent;
    const v = STORY_PEOPLE.valentina.make(S);
    v.items.forEach((i) => { i.examined = true; });
    UI.cur = v; S.shift.current = v; presentItem(v, true);
    probeItem(v.items.find((i) => i.contraband).id);
    const m0 = S.money;
    finalize('deny');
    await __t.until(() => !UI.busy);
    out.valentina = S.money - m0;
    out.valentinaOutcome = S.shift.records[S.shift.records.length - 1].outcome;
    const w = STORY_PEOPLE.valentina.make(S);
    UI.cur = w; S.shift.current = w; presentItem(w, true);
    probeItem(w.items.find((i) => i.contraband).id);
    finalize('detain');
    const wr = S.shift.records[S.shift.records.length - 1];
    out.valentinaWithhold = [wr.pay, wr.outcome];
    await __t.until(() => !UI.busy);
    return out;
  });
  ok(Math.abs(r.dino - (80 - 0.3 - 1.5)) < 0.01, 'reporting Dino costs 15 Score points overnight', r.dino);
  ok(Math.abs(r.ravi - 74) < 0.01, 'reporting Ravi adds 40 Score points', r.ravi);
  ok(!/opened a RENDER sample/.test(r.render) && /withheld a RENDER cover sheet/.test(r.render), 'Ines asks about the sample only if you opened it', r.render.slice(0, 200));
  ok(r.interviewPages <= 2, 'the day-9 interview adds at most 2 pages', r.interviewPages);
  ok(r.frankFirst === 'Frank' && /Frank from Model Safety/.test(r.frankLine), 'Frank is “Frank”, not “Dr.”', r.frankLine.slice(0, 120));
  ok(r.valentina === 30 && r.valentinaOutcome === 'correct_deny', 'returning Valentina after opening the file is full credit plus the evidence bonus (+$30)', [r.valentina, r.valentinaOutcome]);
  ok(r.valentinaWithhold[1] === 'overcautious' && r.valentinaWithhold[0] === -10, 'withholding Valentina is over-cautious (−$10), not “harm withheld”', r.valentinaWithhold);
  await ctx.close();
}

// ---- 5. Focus, keys, settings ---------------------------------------------------------------------------------
console.log('focus and keys');
{
  const { ctx, page } = await open();
  await page.evaluate(() => { __t.start(false, false); beginShift(); });
  await page.waitForTimeout(50);
  await page.keyboard.press('3');
  const f1 = await page.evaluate(() => {
    const b = document.querySelector('#desk-body [data-ex]');
    const label = b.getAttribute('aria-label');
    b.click();
    const a = document.activeElement;
    return { label, focus: a && (a.dataset.ex ? 'next-check' : a.dataset.finding ? 'finding' : a.tagName + '#' + a.id), left: document.querySelectorAll('#desk-body [data-ex]').length };
  });
  ok(/^Check /.test(f1.label) && f1.label !== 'Check', 'case-file buttons are named (“Check Recipients”)', f1.label);
  ok(f1.focus === 'next-check' || (f1.left === 0 && f1.focus === 'finding'), 'after Check, focus moves to the next unchecked item', f1);
  const f2 = await page.evaluate(() => { document.querySelectorAll('#desk-body [data-ex]').forEach((b) => b.click()); const a = document.activeElement; return a && a.dataset.finding ? 'finding' : a.tagName; });
  ok(f2 === 'finding', 'with nothing left to check, focus lands on the finding', f2);
  await page.keyboard.press('q');
  await page.keyboard.press('Escape');
  const q = await page.evaluate(() => ({ open: UI.qOpen, modal: UI.modalOpen, focus: document.activeElement.id }));
  ok(!q.open && !q.modal && q.focus === 'a-ask', 'Esc in the question panel closes the panel, not the game', q);
  await page.evaluate(() => { document.body.focus(); document.activeElement.blur(); });
  await page.keyboard.press('r');
  await page.keyboard.press('Escape');
  const rb = await page.evaluate(() => ({ modal: UI.modalOpen, focus: document.activeElement.id }));
  ok(!rb.modal && rb.focus === 'btn-rules', 'closing the statute book opened with R returns focus to the statute button', rb);
  await page.evaluate(() => { document.getElementById('a-detain').focus(); });
  await page.keyboard.press('r');
  await page.keyboard.press('Escape');
  ok(await page.evaluate(() => document.activeElement.id) === 'a-detain', 'closing the statute book returns focus to where you were');
  await page.evaluate(() => openSettings());
  await page.focus('#set-music');
  await page.keyboard.press('Escape');
  ok(!(await page.evaluate(() => UI.modalOpen)), 'Esc closes Settings while a slider has focus');
  const top = await page.evaluate(() => { S.stats.suspicion = 9; renderTop(); return { t: document.getElementById('t-file').textContent, role: document.getElementById('t-file-stat').getAttribute('role'), label: document.getElementById('t-file-stat').getAttribute('aria-label'), money: document.querySelector('#t-money').previousElementSibling.textContent, irrit: document.getElementById('irrit').textContent }; });
  ok(top.t === '9pp / 14', 'the FILE meter shows the next line (“9pp / 14”)', top.t);
  ok(top.role === 'img' && /9 pages/.test(top.label), 'FILE stat is role="img" with a label', top);
  ok(/Savings/i.test(top.money), 'top bar says SAVINGS, not PAY', top.money);
  ok(/of 5/.test(top.irrit), 'the patience meter has a text equivalent', top.irrit);
  const large = await page.evaluate(() => {
    act('draft');
    const before = parseFloat(getComputedStyle(document.querySelector('#desk-body .field .fv')).fontSize);
    settings.large = true; applySettings(); renderDesk();
    const after = parseFloat(getComputedStyle(document.querySelector('#desk-body .field .fv')).fontSize);
    settings.large = false; applySettings();
    return { before, after };
  });
  ok(large.after >= 18 && large.after > large.before, 'Large text enlarges the papers (≥18px)', large);
  const sc = await page.evaluate(async () => {
    playScene([L('narrator', 'x'), { choices: [{ text: 'First', fx: { suspicion: 1 } }, { text: 'Second', fx: {} }] }], { onDone: () => {} });
    document.querySelector('#scene-choices .btn').click();
    await __t.tick();
    const b = document.querySelector('#scene-choices .btn');
    return { focus: document.activeElement.textContent, cost: b.textContent };
  });
  ok(/^First/.test(sc.focus), 'scene choices take focus on the first choice', sc.focus);
  ok(/\(\+1 page\)/.test(sc.cost), 'choices that add pages say so (“(+1 page)”)', sc.cost);
  const chip = await page.evaluate(() => { const d = document.getElementById('trav-dem'); d.className = 'chip nervous'; return getComputedStyle(d).color; });
  ok(chip === 'rgb(154, 74, 12)', 'the Nervous chip uses the 4.5:1 colour', chip);
  await ctx.close();
}
{
  const { ctx, page } = await open();
  const nm = await page.evaluate(() => { openNewGame(false); const el = document.getElementById('officer-name'); return { value: el.value, ph: el.placeholder }; });
  ok(nm.value === '' && nm.ph === 'Hale', 'the name field is empty with a “Hale” placeholder', nm);
  await page.click('#officer-name');
  await page.keyboard.type('Vasquez');
  await page.keyboard.press('Enter');
  ok(await page.evaluate(() => S.officer) === 'Vasquez', 'typing a name gives that name, not “HaleVasquez”');
  const blank = await page.evaluate(() => { openNewGame(false); document.getElementById('officer-name').value = ''; newGame(); return S.officer; });
  ok(blank === 'Hale', 'an empty name falls back to Hale', blank);
  await ctx.close();
}

// ---- 6. Phone tutorial wording ---------------------------------------------------------------------------
console.log('phone');
{
  const { ctx, page } = await open({ width: 390, height: 844 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const tips = await page.evaluate(async () => {
    __t.start(false, true);
    beginShift();
    await __t.until(() => !document.getElementById('tip').hidden);
    const out = [];
    for (let i = 0; i < TUT.length; i++) { UI.tut = i; showTip(); out.push(document.getElementById('tip-text').textContent); }
    return out;
  });
  ok(tips.some((t) => /Tap ORDER/.test(t)) && tips.some((t) => /Tap SOURCE/.test(t)), 'touch tips name the phone buttons (“Tap SOURCE”)', tips.slice(1, 3));
  ok(!tips.some((t) => /\bkey\b|\(\d\)|Press /.test(t)), 'touch tips never mention keys', tips.filter((t) => /key|Press/.test(t)));
  await ctx.close();
}

// ---- 7. Share text, endless escalation and the endless record ----------------------------------------------
console.log('share and endless');
{
  const { ctx, page } = await open();
  const r = await page.evaluate(async () => {
    __t.start(false, false);
    beginShift();
    await __t.decide(__t.gen('clean'), 'approve');
    await __t.decide(__t.gen('back'), 'deny');
    await __t.decide(__t.gen('q'), 'detain');
    const c = __t.gen('q'); c.searched = true;
    await __t.decide(c, 'detain');
    await __t.decide(__t.gen('clean'), 'deny');
    await __t.until(() => UI.screen === 'screen-report');
    let got = '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { got = t; } }, configurable: true });
    document.getElementById('rep-copy').click();
    await __t.until(() => got);
    const out = { share: got };
    __t.start(true, false);
    S.endlessStart = S.day - 9; prepareShift();
    out.sec10 = S.shift.security; out.cruel10 = S.shift.queue.filter((q) => q.kind === 'cruel').length;
    out.mix10 = ['clean', 'back'].every((k) => S.shift.queue.some((q) => q.kind === k));
    S.endlessStart = S.day - 14; prepareShift();
    out.close15 = shiftEnd(); S.endlessStart = S.day; out.close1 = shiftEnd();
    out.secBase = diff().security;
    S.endlessStart = S.day - 11; S.totals.refused = 3;
    saveEndlessRecord();
    renderMenu();
    out.menu = (document.querySelector('.menu-record') || {}).textContent || '';
    return out;
  });
  const lines = r.share.split('\n');
  ok(lines[1] === '✅↩️✋👁❌', 'shift share has the 5-glyph decision row (a right withhold is ✋, not red)', lines[1]);
  ok(/^CHUCK: “|^[A-Z]/.test(lines[2]) && lines.length >= 4, 'shift share has a punchline (CHUCK quote or caption)', lines[2]);
  ok(r.sec10 === r.secBase - 1 && r.cruel10 === 2 && r.mix10, 'endless shift 10: one fewer Oversight request, two cruel cases, still a clean and a clerical one', r);
  ok(r.close1 - r.close15 === 15, 'endless shift 15: the clock is 15 minutes shorter', [r.close1, r.close15]);
  ok(/12 shifts/.test(r.menu) && /3/.test(r.menu), 'the menu shows the endless record', r.menu);
  await ctx.close();
}

// ---- 8. Round 4 rules: evidence void, pause, mother, economy, Score, endless, debt, saves, endings, reloads ----------
console.log('rules');
{
  const { ctx, page } = await open();
  const r = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false);
    beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    // Evidence bonus: one wrong flag is forgiven, two void it.
    const flagged = (wrong) => {
      let c, k = 0;
      do c = buildCase({ kind: 'q', tpl: 'late-invoice' }, S, makeRng(77 + wrong * 1000 + k++)); while (!c.flawFields.length);
      const d = c.docs.find((x) => x.type === 'draft');
      const clean = d.fields.filter((f) => !c.flawFields.includes(f.k)).slice(0, wrong);
      c.flags = [{ doc: 'draft', field: c.flawFields[0] }].concat(clean.map((f) => ({ doc: 'draft', field: f.k })));
      return c;
    };
    out.bonus1 = (await __t.decide(flagged(1), 'detain')).pay;
    out.bonus2 = (await __t.decide(flagged(2), 'detain')).pay;
    // Pause holds the post-decision beats.
    await __t.until(() => UI.cur && !UI.busy);
    const c = __t.gen('clean');
    S.shift.current = c; presentItem(c, true);
    const logBefore = document.querySelectorAll('#log .msg.them').length;
    finalize('approve');
    openPause();
    for (let i = 0; i < 300; i++) await __t.tick();
    out.paused = { busy: UI.busy, same: UI.cur === c, exitLines: document.querySelectorAll('#log .msg.them').length - logBefore };
    closeModal();
    await __t.until(() => !UI.busy && (UI.screen === 'screen-report' || (UI.cur && UI.cur !== c)));
    out.resumed = UI.screen === 'screen-report' || (!!UI.cur && UI.cur !== c);
    // A greeting that arrives after a quick decision is dropped, never logged after the stamp.
    await __t.until(() => UI.cur && !UI.busy);
    const q = __t.gen('clean');
    S.shift.current = q; presentItem(q, false);
    finalize('detain');
    for (let i = 0; i < 60; i++) await __t.tick();
    const msgs = [...document.querySelectorAll('#log .msg')].map((m) => m.className + '|' + m.textContent);
    const at = msgs.findIndex((m) => /withholding my signature/.test(m));
    out.lateGreet = msgs.slice(at + 1).filter((m) => /chuck/.test(m) && m.includes(q.chuckGreet)).length;
    return out;
  });
  ok(r.bonus1 === 35 && r.bonus2 === 20, 'evidence bonus: one wrong flag keeps it (+$35), two void it (+$20)', [r.bonus1, r.bonus2]);
  ok(r.paused.busy && r.paused.same && r.paused.exitLines === 0, 'pause holds the post-decision beats: no reaction, no next case', r.paused);
  ok(r.resumed, 'closing the pause lets the beats carry on to the next case');
  ok(r.lateGreet === 0, 'a CHUCK greeting due after a quick decision is dropped, not shown as a reaction', r.lateGreet);
  const m = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false);
    // Mother: skipping drops her tier; a bill you can't cover can only be skipped.
    S.day = 3; S.money = 500;
    playScene(momLines(S), { onDone: () => {} });
    await __t.scene(/Not this week/);
    out.skipTier = momTier(S);
    S.day = 4; S.money = 20;
    const lines = momLines(S);
    const send = lines[1].choices[0];
    out.cantCover = { disabled: !!send.disabled, text: send.text };
    S.money = 500;
    playScene(momLines(S), { onDone: () => {} });
    await __t.scene(/^Send/);
    out.paidTier = momTier(S);
    // Day 6: a one-time private-care card that locks her tier and ends the bills.
    S.day = 6; S.money = 450;
    out.cardDisabled = momLines(S)[1].choices.find((ch) => /private-care/.test(ch.text)).disabled;
    S.money = 900;
    const before = S.money;
    playScene(momLines(S), { onDone: () => {} });
    await __t.scene(/private-care/);
    out.card = { cost: before - S.money, tier: momTier(S), billDay7: momBill(Object.assign({}, S, { day: 7 })), ending: endingText('autosigned', S).slice(-1)[0] };
    // Bought at Tier 2 (never dropped): $500 and the plain private-room line.
    __t.start(false, false);
    S.day = 6; S.money = 900; S.flags.momPaid = 3;
    playScene(momLines(S), { onDone: () => {} });
    await __t.scene(/private-care/);
    out.card2 = { cost: 900 - S.money, line: endingText('autosigned', S).slice(-1)[0] };
    S.day = 2;
    out.cardBefore6 = momLines(Object.assign({}, S, { day: 5, flags: {} })).some((l) => l.choices && l.choices.some((ch) => /private-care/.test(ch.text)));
    // Debt: each night in the red costs Score and brings the landlord; the second in a row drops her tier.
    __t.start(false, false);
    S.day = 4; S.flags.momPaid = 1; S.flags.momTier = 2;
    beginShift();
    S.shift.records = []; S.shift.index = 5; S.money = -300; const rep0 = S.rep;
    endShift();
    out.debt1 = { nights: S.debtNights, tier: momTier(S), rep: +(rep0 - S.rep).toFixed(2), line: debtLine().map((l) => l.text).join(' ') };
    S.day = 5; prepareShift(); S.shift.records = []; S.money = -300;
    endShift();
    out.debt2 = { nights: S.debtNights, tier: momTier(S), line: debtLine().map((l) => l.text).join(' ') };
    S.day = 6; prepareShift(); S.shift.records = []; S.money = 900;
    endShift();
    out.debt3 = S.debtNights;
    return out;
  });
  ok(m.skipTier === 3, 'skipping her bill drops her care tier (2 → 3)', m.skipTier);
  ok(m.paidTier === 3, 'paying keeps her tier where it is', m.paidTier);
  ok(m.cantCover.disabled && /can’t cover it/.test(m.cantCover.text), 'a bill you can’t cover shows “You can’t cover it” and can’t be sent', m.cantCover);
  ok(m.cardDisabled, 'the private-care card can’t be bought without $500');
  ok(m.card.cost === 650 && m.card.tier === 1 && m.card.billDay7 === 0 && /private room/.test(m.card.ending) && /three weeks in a shared room/.test(m.card.ending), 'the card bought from Tier 3 costs $650, ends the bills, and the ending keeps the weeks she spent in the shared room', m.card);
  ok(m.card2.cost === 500 && /private room with a window and a Tier 1 card/.test(m.card2.line), 'the card bought at Tier 2 costs $500 and gives the plain private-room line', m.card2);
  ok(!m.cardBefore6, 'no private-care card before day 6');
  ok(m.debt1.nights === 1 && m.debt1.tier === 2 && m.debt1.rep === 0.5 && /landlord/i.test(m.debt1.line), 'first night in debt: −5 Score and a landlord beat, tier kept', m.debt1);
  ok(m.debt2.nights === 2 && m.debt2.tier === 3 && /down a tier/.test(m.debt2.line), 'second night in a row in debt: her tier drops too', m.debt2);
  ok(m.debt3 === 0, 'savings back above zero reset the debt count', m.debt3);
  const e = await page.evaluate(() => {
    const out = {};
    __t.start(false, false);
    const at = (day) => { S.day = day; return { wage: dayWage(), rent: livingCost(), check: cost('examine'), open: cost('probe'), close: shiftEnd() }; };
    out.d5 = at(5); out.d6 = at(6); out.d8 = at(8); out.d10 = at(10);
    // Diminishing Score gains near the top.
    const gain = (rep) => { S.rep = rep; const before = S.rep; S.day = 4; beginShift(); const c = __t.gen('clean'); UI.cur = c; S.shift.current = c; finalize('approve'); return +(S.rep - before).toFixed(3); };
    out.gains = [gain(50), gain(85), gain(92), gain(97)];
    // Endless runs on the day-9 rule book.
    __t.start(true, false);
    out.endless = { rulesDay: rulesDay(), stamp: requiredStamp(TEMPLATES.find((T) => T.id === 'holiday'), S.day, S.endless), side: briefingSide() };
    const shifts = [];
    for (const n of [1, 5, 10, 15, 20, 25, 30, 40]) {
      S.endlessStart = S.day - n + 1; prepareShift();
      shifts.push({ n, kinds: S.shift.queue.map((q) => q.kind).sort().join(','), sec: S.shift.security, close: shiftEnd(), check: cost('examine'), wage: dayWage(), rent: livingCost() });
    }
    out.shifts = shifts;
    return out;
  });
  ok(e.d5.wage === 80 && e.d5.rent === 45 && e.d5.check === 3 && e.d6.wage === 60 && e.d6.rent === 70 && e.d6.check === 4 && e.d6.open === 6, 'day-6 economy: $60 day rate, $70 rent, case-file checks +1 min', [e.d5, e.d6]);
  ok(e.d5.close - e.d6.close === 45 && e.d5.close - e.d8.close === 55 && e.d10.close - e.d8.close === 10, 'the clock closes 45 minutes early from day 6, 55 on days 8–9, and Amendment Day gets ten minutes back', [e.d5.close, e.d6.close, e.d8.close, e.d10.close]);
  ok(e.gains[0] === 2 && e.gains[1] === 1 && e.gains[2] === 0.5 && e.gains[3] === 0.25, 'Score gains diminish above 80/90/95', e.gains);
  ok(e.endless.rulesDay === 9 && e.endless.stamp === 'hr' && /§18/.test(e.endless.side) && /§19/.test(e.endless.side) && !/§20|Amendment Day/.test(e.endless.side), 'endless plays the day-9 rule book (§18 and §19 in force, not Amendment Day’s §20)', e.endless.rulesDay);
  ok(e.shifts.every((x) => /clean/.test(x.kinds) && /back/.test(x.kinds)), 'every endless shift keeps a clean and a clerical case', e.shifts.map((x) => x.kinds));
  const sh = Object.fromEntries(e.shifts.map((x) => [x.n, x]));
  ok(sh[1].kinds.split('cruel').length - 1 === 1 && sh[5].kinds.split('cruel').length - 1 === 2, 'endless shift 5: a second cruel case');
  ok(sh[20].check === sh[15].check + 1 && sh[25].wage === sh[20].wage - 10 && sh[30].wage === sh[25].wage - 5 && sh[30].close === sh[25].close - 5 && sh[40].close < sh[30].close, 'endless keeps tightening every 5 shifts past 15', e.shifts);
  ok(sh[40].rent > sh[20].rent && sh[20].rent > sh[1].rent, 'endless upkeep rises with the shift count', [sh[1].rent, sh[20].rent, sh[40].rent]);
  const b = await page.evaluate(async () => {
    __t.start(true, false);
    S.endlessStart = S.day - 30;
    beginShift(); S.shift.records = []; S.shift.index = 5; S.money = -500;
    endShift(); playEvening();
    const first = UI.screen;
    await __t.until(() => UI.screen !== 'screen-report');
    beginShift(); S.shift.records = []; S.shift.index = 5; S.money = -500;
    endShift(); playEvening();
    return { first, ending: S.ending, screen: UI.screen, title: (document.getElementById('end-title') || {}).textContent, record: JSON.parse(localStorage.getItem('meatproxy.endless.v1')), endless: !!document.getElementById('end-endless') };
  });
  ok(b.ending === 'bust' && b.title === 'IN THE RED' && b.record.lastEnd === 'bust' && !b.endless, 'endless: two shifts below zero end the run (IN THE RED) and record it', b);
  await ctx.close();
}

// ---- 9. Endings follow the lines Ines and Dino state ---------------------------------------------------------------------
console.log('ending lines');
{
  const { ctx, page } = await open();
  const r = await page.evaluate(() => {
    const bad = [];
    __t.start(false, false);
    for (let s = 0; s <= 20; s++) for (const choice of ['stay', 'readers', 'parachute', 'informer']) {
      Object.assign(S.stats, { party: 0, conscience: 0, suspicion: s, corruption: 0, truth: 0 });
      S.flags = { parachute: true, readers: true };
      const k = resolveEnding(S, choice);
      const want = s >= 16 ? 'relocated' : choice === 'readers' ? 'readers' : choice === 'parachute' ? (s >= 9 ? 'relocated' : 'parachute') : choice === 'informer' ? 'informer' : s >= 14 ? 'scapegoat' : null;
      if (want && k !== want) bad.push([s, choice, k, want]);
      if (!want && ['scapegoat', 'relocated'].includes(k)) bad.push([s, choice, k]);
    }
    S.day = 7; const ines = SCENES.brief7(S).map((l) => l.text).join(' ');
    S.day = 8; S.stats.suspicion = 7; S.flags = {};
    const dino = SCENES.eve8(S).map((l) => l.text || '').join(' ');
    S.stats.corruption = 2; S.stats.suspicion = 0; S.stats.conscience = 0; S.stats.party = 0;
    S.money = 1200; const dry = resolveEnding(S, 'stay'); S.money = 1199; const notDry = resolveEnding(S, 'stay');
    return { bad, ines, dino, lines: [FILE_LINES.loop, FILE_LINES.relocated, PARACHUTE_PAGES], dry, notDry };
  });
  ok(!r.bad.length, 'every path follows the stated lines: 16 relocates anywhere, 14 at the desk is the loop, Dino’s way out shuts at 9', r.bad.slice(0, 5));
  ok(/Fourteen pages, and if you’re still at that desk/.test(r.ines) && /Sixteen, and you’re relocated, wherever you are/.test(r.ines) && r.lines[0] === 14 && r.lines[1] === 16, 'Ines states the 14 and 16 lines the endings use', r.ines.slice(0, 200));
  ok(/With nine pages in your Oversight file/.test(r.dino) && r.lines[2] === 9 && /You have seven/.test(r.dino), 'Dino states his nine-page line in his offer, with your count', r.dino.slice(-200));
  ok(r.dry === 'dry_aged' && r.notDry !== 'dry_aged', 'DRY-AGED needs corruption 2 and $1,200', [r.dry, r.notDry]);
  await ctx.close();
}

// ---- 10. Reload after the file warning was shown, before Go home ---------------------------------------------------------
console.log('warning reload');
{
  const { ctx, page } = await open();
  await page.evaluate(async () => {
    __t.start(false, false);
    beginShift();
    for (let i = 0; i < 5; i++) await __t.decide(__t.gen('clean'), 'approve');
    await __t.until(() => UI.screen === 'screen-report');
    S.stats.suspicion = 5;
    document.getElementById('rep-next').click();
    // Advance only until Marta's warning is on screen.
    for (let i = 0; i < 200 && !/Ines asked for your file/.test(document.getElementById('scene-log').textContent); i++) {
      const btns = [...document.querySelectorAll('#scene-choices .btn')];
      (btns.find((b) => !b.classList.contains('primary')) || btns[0]).click();
      await __t.tick();
    }
  });
  const mid = await page.evaluate(() => ({ shown: /Ines asked for your file/.test(document.getElementById('scene-log').textContent), saved: JSON.parse(localStorage.getItem('meatproxy.save.auto')).state.flags.fileWarn5 }));
  await reloadKeep(page);
  const r = await page.evaluate(async () => {
    [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent)).click();
    const lines = await __t.scene();
    return { lines, flag: !!S.flags.fileWarn5, day: S.day };
  });
  ok(mid.shown && !mid.saved, 'the warning was on screen, and is not saved as seen before the evening ends', mid);
  ok(r.lines.some((l) => /Ines asked for your file/.test(l)), 'reloading after the warning, before Go home, replays it', r.lines.slice(-4));
  ok(r.flag && r.day === 2, 'after Go home the warning is saved as seen', r);
  await ctx.close();
}

// ---- 11. Saves are validated on Continue and Load ------------------------------------------------------------------------
console.log('saves');
{
  const { ctx, page } = await open();
  const r = await page.evaluate(async () => {
    const out = {};
    const put = (slot, v) => localStorage.setItem('meatproxy.save.' + slot, typeof v === 'string' ? v : JSON.stringify(v));
    __t.start(false, false); beginShift();
    const good = JSON.parse(localStorage.getItem('meatproxy.save.auto'));
    const noShift = JSON.parse(JSON.stringify(good)); delete noShift.state.shift;
    put('auto', noShift);
    out.shapes = [validSave(noShift), validSave(good), validSave(Object.assign({}, good, { state: Object.assign({}, good.state, { version: 2 }) })), validSave({ meta: {}, state: Object.assign({}, good.state, { phase: 'report', lastReport: null }) })];
    renderMenu();
    [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent)).click();
    out.noShift = { modal: UI.modalOpen && document.getElementById('modal').textContent, screen: UI.screen, auto: localStorage.getItem('meatproxy.save.auto'), filed: !!localStorage.getItem('meatproxy.save.damaged') };
    closeModal();
    const v2 = JSON.parse(JSON.stringify(good)); v2.state.version = 2; put(2, v2);
    put(3, '{"meta":null,"state":7}');
    renderMenu(); openLoad(false);
    out.slots = [...document.querySelectorAll('#modal .slot .meta')].map((e) => e.textContent);
    document.querySelector('#modal [data-load="2"]').click();
    out.v2 = { modal: document.getElementById('modal').textContent, screen: UI.screen };
    closeModal(); openLoad(false);
    document.querySelector('#modal [data-load="3"]').click();
    out.junk = document.getElementById('modal').textContent;
    closeModal();
    put(1, good); openLoad(false);
    document.querySelector('#modal [data-load="1"]').click();
    out.good = { screen: UI.screen, day: S && S.day };
    return out;
  });
  ok(/This file is damaged\. CHUCK has filed it\./.test(r.noShift.modal) && r.noShift.screen === 'screen-menu' && !r.noShift.auto && r.noShift.filed, 'Continue on a save with no shift: dry message, back to the menu, file moved aside', r.noShift);
  ok(JSON.stringify(r.shapes) === '[false,true,false,false]', 'validSave rejects a booth save with no shift, another version and a report with no report; accepts a real save', r.shapes);
  ok(r.slots[2] === 'Damaged file' && r.slots[3] === 'Damaged file', 'the load list marks damaged slots', r.slots);
  ok(/CHUCK has filed it/.test(r.v2.modal) && r.v2.screen === 'screen-menu', 'a save from another version is not loaded', r.v2);
  ok(/CHUCK has filed it/.test(r.junk), 'a malformed save is not loaded', r.junk.slice(0, 80));
  ok(r.good.screen === 'screen-booth' && r.good.day === 1, 'a good save still loads', r.good);
  await ctx.close();
}

// ---- 12. Story continuity: variants, page costs, repeat citizens, clocks, report locators, line memory ---------------------
console.log('continuity');
{
  const { ctx, page } = await open();
  const r = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false);
    let seed = 1;
    while (!storyVariant({ seed }, 'hustle1')) seed++;
    S.seed = seed; beginShift(); S.shift.clock = 10 * 60 + 11;
    out.jess = STORY_PEOPLE.hustle1.make(S).greet[0];
    // Story page costs are stated before you sign, and they are what you get.
    __t.start(false, false);
    S.day = 9; beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    const ravi = STORY_PEOPLE.raviOut.make(S);
    S.shift.current = ravi; presentItem(ravi, true);
    probeItem(ravi.items.find((i) => i.contraband).id);
    const p0 = S.stats.suspicion;
    decideStart('approve');
    out.raviModal = UI.modalOpen && document.getElementById('modal').textContent;
    [...document.querySelectorAll('#modal .modal-f .btn')].find((b) => /Countersign/.test(b.textContent)).click();
    await __t.until(() => !UI.busy);
    out.raviPages = S.stats.suspicion - p0;
    await __t.until(() => UI.cur && !UI.busy);
    const plain = __t.gen('clean');
    S.shift.current = plain; presentItem(plain, true);
    decideStart('approve');
    out.plainModal = UI.modalOpen;
    await __t.until(() => !UI.busy);
    out.detainTitle = document.getElementById('a-detain').title;
    // A citizen who comes back is acknowledged.
    const c = buildCase({ kind: 'cruel', tpl: 'visa' }, S, makeRng(5));
    S.citizenLog = { [c.ctx.cit.name]: { tpl: 'visa', decision: 'deny', day: S.day - 5 } };
    out.again = citizenAgain(c);
    // Report: "Where it showed" never repeats the grade note.
    __t.start(false, false); beginShift();
    const recs = [];
    for (let i = 0; i < 5; i++) recs.push(await __t.decide(__t.gen('back'), 'approve'));
    out.where = recs.map((x) => ({ truth: x.truth, clues: x.clues }));
    // Line memory: a spent pool comes back oldest first, never twice in a shift.
    __t.start(false, false); beginShift();
    const pool = LINES.draft;
    const heard = [];
    for (let i = 0; i < pool.length + 3; i++) { if (i % 5 === 0) S.shift.usedLines = []; heard.push(drawLine(pool)); }
    out.memory = { distinctFirst: new Set(heard.slice(0, pool.length)).size, size: pool.length, oldest: heard[pool.length] === heard[0] };
    return out;
  });
  ok(/It’s ten eleven/.test(r.jess) && /at eleven sharp/.test(r.jess), 'Jess tells the real time (10:11: “ten eleven”, the Board at eleven)', r.jess);
  ok(/Ines is watching: Oversight will add 4 pages/.test(r.raviModal) && r.raviPages === 4, 'day 9: the pamphlet’s confirm says Ines will add 4 pages, and it adds 4', [r.raviModal, r.raviPages]);
  ok(!r.plainModal, 'a generic case shows no page cost (it would give the answer away)');
  ok(r.detainTitle === 'If the decision was lawful, withholding it adds a page.', 'the Withhold button says, conditionally, what a lawful withhold costs', r.detainTitle);
  ok(r.again === 'Back again. Someone returned it last week.', 'a returned citizen who comes back is acknowledged', r.again);
  ok(r.where.every((w) => !w.clues.includes(w.truth)) && r.where.some((w) => w.clues.length), '“Where it showed” points at the paper, never repeats the note', r.where.slice(0, 2));
  ok(r.memory.distinctFirst === r.memory.size && r.memory.oldest, 'line memory: every line once before any repeats, then the oldest first', r.memory);
  await ctx.close();
}

// ---- 13. Round 5: the mother economy, scenes and saves, grading, gates, endless, endings, copy ----------------------------
console.log('round 5');
{
  const { ctx, page } = await open();
  const addHelpers = () => page.evaluate(() => {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    // Clicks through a scene until a button matching `re` is on screen, and returns it (choices that don't match: the first enabled one).
    __t.sceneTo = async (re) => {
      for (let i = 0; i < 300; i++) {
        const btns = [...document.querySelectorAll('#scene-choices .btn')];
        const hit = btns.find((b) => re.test(b.textContent) && !b.disabled);
        if (hit) return hit;
        const go = btns.find((b) => b.classList.contains('primary')) || btns.find((b) => !b.disabled);
        if (go) go.click();
        await tick();
      }
      return null;
    };
    // Finishes a scene: preferred choices first, else Continue, until `stop()` says it's over.
    __t.sceneEnd = async (pref, stop) => {
      for (let i = 0; i < 300 && UI.screen === 'screen-scene' && !(stop && stop()); i++) {
        const btns = [...document.querySelectorAll('#scene-choices .btn')];
        const pick = (pref && btns.find((b) => pref.test(b.textContent) && !b.disabled)) || btns.find((b) => b.classList.contains('primary')) || btns.find((b) => !b.disabled);
        if (pick) pick.click();
        await tick();
      }
    };
    __t.saveSlot = (slot) => {
      openLoad(true);
      document.querySelector(`#modal [data-save="${slot}"]`).click();
      const over = [...document.querySelectorAll('#modal .modal-f .btn')].find((b) => /Save over it/.test(b.textContent));
      if (over) over.click();
      closeModal();
    };
    __t.loadSlot = (slot) => {
      openLoad(true);
      document.querySelector(`#modal [data-load="${slot}"]`).click();
      const yes = [...document.querySelectorAll('#modal .modal-f .btn')].find((b) => b.textContent === 'Load');
      if (yes) yes.click();
    };
    // Plays one evening's bill with the choice matching `re`, then leaves the scene.
    __t.bill = async (day, re) => {
      S.day = day; S.phase = 'evening';
      playScene(momLines(S), { onDone: () => {} });
      const b = await __t.sceneTo(re);
      if (b) b.click();
      await __t.sceneEnd(null, () => false);
      return !!b;
    };
  });
  await addHelpers();

  // B1: paying every week beats skipping and buying the card later; the card is priced by her tier and keeps her history.
  const mom = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false); S.money = 5000;
    for (let d = 3; d <= 9; d++) await __t.bill(d, /^Send \$/);
    out.pay = { t: momTreatment(S), line: momEndingLine(S)[0] };
    __t.start(false, false); S.money = 5000;
    for (let d = 3; d <= 5; d++) await __t.bill(d, /Not this week/);
    out.tierBefore = momTier(S);
    S.day = 6; out.price = momCardPrice(S);
    const m0 = S.money;
    await __t.bill(6, /private-care/);
    out.skip = { t: momTreatment(S), paid: m0 - S.money, line: momEndingLine(S)[0], final: SCENES.final(S)[0].text };
    out.rank = MOM_RANK;
    return out;
  });
  ok(mom.pay.t === 'kept' && mom.skip.t === 'cardLate' && mom.rank[mom.pay.t] > mom.rank[mom.skip.t], 'paying every week ends better than skipping three weeks and buying the card', [mom.pay.t, mom.skip.t]);
  ok(mom.tierBefore === 4 && mom.price === 800 && mom.skip.paid === 800, 'the card from the ward costs $500 + $150 per tier dropped ($800)', [mom.tierBefore, mom.price, mom.skip.paid]);
  ok(/three weeks on the ward/.test(mom.skip.line) && !/She never finds out/.test(mom.skip.line), 'the late card’s ending line acknowledges the weeks on the ward', mom.skip.line);
  ok(/ward/.test(mom.skip.final), 'the 4:51 text after a late card remembers the ward', mom.skip.final);

  // B2: partial payment, no drop after the last decision, cheaper soft refusal.
  const b2 = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false);
    S.day = 5; S.money = 30; S.flags.momPaid = 2;
    const bill = momBill(S);
    const picked = await __t.bill(5, /^Send what you have \(\$30\)/);
    out.partial = { picked, bill, money: S.money, tier: momTier(S), partial: S.flags.momPartial, paid: S.flags.momPaid, log: document.getElementById('scene-log').textContent };
    S.day = 4; S.money = 0; out.noneAtZero = !momLines(S)[1].choices.some((ch) => /what you have/.test(ch.text));
    const night = (day) => { __t.start(false, false); S.day = day; S.flags.momPaid = 1; prepareShift(); S.phase = 'booth'; S.shift.records = []; S.shift.index = 5; S.debtNights = 1; S.money = -300; endShift(); return { tier: momTier(S), drop: S.lastReport.summary.momDrop }; };
    out.d9 = night(9); out.d10 = night(10);
    return out;
  });
  ok(b2.partial.picked && b2.partial.money === 0 && b2.partial.tier === 2 && b2.partial.partial === 1 && b2.partial.paid === 3 && /\$30/.test(b2.partial.log), 'short of the bill, “Send what you have ($30)” holds her tier, leaves you at $0 and gets a sister line', b2.partial);
  ok(b2.noneAtZero, 'with nothing to send, there is no partial payment');
  ok(b2.d9.drop && b2.d9.tier === 3 && !b2.d10.drop && b2.d10.tier === 2, 'a second debt night drops her tier on day 9, never after the last decision on day 10', [b2.d9, b2.d10]);

  // C-20 and B2: grading of withholds and refusals.
  const g = await page.evaluate(async () => {
    __t.start(false, false); beginShift();
    const out = {};
    let c, k = 0;
    do c = buildCase({ kind: 'back' }, S, makeRng(500 + k++)); while (c.defects.some((d) => d.other));
    const p0 = S.stats.suspicion;
    const r = await __t.decide(c, 'detain');
    out.clerical = { outcome: r.outcome, pay: r.pay, label: r.label, pages: S.stats.suspicion - p0 };
    for (let i = 0; i < 4; i++) await __t.decide(__t.gen('clean'), 'approve');
    await __t.until(() => UI.screen === 'screen-report');
    out.stars = S.lastReport.summary.stars;
    __t.start(false, false); beginShift();
    const soft = await __t.decide(__t.gen('cruel'), 'deny');
    const p1 = S.stats.suspicion;
    const hard = await __t.decide(__t.gen('cruel'), 'detain');
    out.refusals = { soft: soft.pay, hard: hard.pay, hardPages: S.stats.suspicion - p1, softNote: LINES.softNote.includes(soft.note), hardNote: LINES.standNote.includes(hard.note) };
    return out;
  });
  ok(g.clerical.outcome === 'overcautious' && g.clerical.pay === -10 && g.clerical.pages === 0 && g.clerical.label === 'Over-cautious: a Return would do', 'withholding an ordinary clerical slip is over-cautious: −$10, no page', g.clerical);
  ok(g.stars === 4, 'an over-cautious withhold caps the shift at 4 stars, not 2', g.stars);
  ok(g.refusals.soft === -10 && g.refusals.hard === -20 && g.refusals.hardPages === 1 && g.refusals.softNote && g.refusals.hardNote, 'returning a cruel case costs $10 and no page; withholding costs $20 and a page; notes come from the pools', g.refusals);

  // C-19: a save made during a scene, loaded, replays the scene with nothing applied twice (manual slot).
  const sc = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false);
    S.day = 3; prepareShift(); S.phase = 'booth'; beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    S.shift.current = null; S.shift.index = 2; UI.cur = null;
    const m0 = S.money;
    nextItem();
    { const b = await __t.sceneTo(/Take the envelope/); if (b) b.click(); }
    out.mid = S.money - m0;
    __t.saveSlot(1);
    __t.loadSlot(1);
    await __t.until(() => UI.screen === 'screen-scene');
    { const b = await __t.sceneTo(/Take the envelope/); if (b) b.click(); }
    await __t.sceneEnd(null, () => UI.screen !== 'screen-scene');
    out.dino = { money: S.money - m0, corruption: S.stats.corruption, bribes: S.totals.bribes, deal: !!S.flags.dinoDeal, screen: UI.screen };
    // The mother's bill, then a page choice, then the card: each saved mid-scene and loaded.
    __t.start(false, false);
    S.day = 4; S.money = 500; S.flags.momPaid = 1; S.flags.nikaIn = true; S.flags.readNikaLetter = true; S.phase = 'evening';
    const p0 = S.stats.suspicion, paid0 = S.flags.momPaid;
    playEvening();
    { const b = await __t.sceneTo(/Nothing unusual/); if (b) b.click(); }
    { const b = await __t.sceneTo(/^Send \$/); if (b) b.click(); }
    __t.saveSlot(2); __t.loadSlot(2);
    await __t.until(() => UI.screen === 'screen-scene');
    { const b = await __t.sceneTo(/Nothing unusual/); if (b) b.click(); }
    { const b = await __t.sceneTo(/^Send \$/); if (b) b.click(); }
    await __t.sceneEnd(null, () => S.day !== 4);
    out.bill = { money: S.money, paid: S.flags.momPaid - paid0, pages: S.stats.suspicion - p0, day: S.day };
    __t.start(false, false);
    S.day = 6; S.money = 900; S.flags.momPaid = 3; S.phase = 'evening';
    playEvening();
    { const b = await __t.sceneTo(/private-care/); if (b) b.click(); }
    __t.saveSlot(3); __t.loadSlot(3);
    await __t.until(() => UI.screen === 'screen-scene');
    { const b = await __t.sceneTo(/private-care/); if (b) b.click(); }
    await __t.sceneEnd(null, () => S.day !== 6);
    out.card = { money: S.money, card: !!S.flags.momCard };
    return out;
  });
  ok(sc.mid === 200 && sc.dino.money === 200 && sc.dino.corruption === 1 && sc.dino.bribes === 200 && sc.dino.deal && sc.dino.screen === 'screen-booth', 'Dino’s envelope saved mid-scene to a slot and loaded: replays the scene, $200 and one corruption once', sc.dino);
  ok(sc.bill.money === 500 - 50 && sc.bill.paid === 1 && sc.bill.pages === 1 && sc.bill.day === 5, 'the mother’s bill and a page choice saved mid-scene and loaded: applied once', sc.bill);
  ok(sc.card.money === 400 && sc.card.card, 'the private-care card saved mid-scene and loaded: $500 once', sc.card);
  await page.evaluate(async () => {
    __t.start(false, false);
    S.day = 3; prepareShift(); S.phase = 'booth'; beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    S.shift.current = null; S.shift.index = 2; UI.cur = null;
    window.__m0 = S.money;
    localStorage.setItem('mp.test.m0', String(S.money));
    nextItem();
    { const b = await __t.sceneTo(/Take the envelope/); if (b) b.click(); }
    autosave();
  });
  await reloadKeep(page);
  const cont = await page.evaluate(async () => {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    const saved = JSON.parse(localStorage.getItem('meatproxy.save.auto'));
    [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent)).click();
    for (let i = 0; i < 100 && UI.screen !== 'screen-scene'; i++) await tick();
    const btns = () => [...document.querySelectorAll('#scene-choices .btn')];
    for (let i = 0; i < 200 && !btns().some((b) => /Take the envelope/.test(b.textContent)); i++) { (btns().find((b) => b.classList.contains('primary')) || btns()[0]).click(); await tick(); }
    (btns().find((b) => /Take the envelope/.test(b.textContent)) || { click() {} }).click();
    for (let i = 0; i < 200 && UI.screen === 'screen-scene'; i++) { const p = btns().find((b) => b.classList.contains('primary')); if (p) p.click(); await tick(); }
    return { scene: saved.state.openScene, money: S.money - +localStorage.getItem('mp.test.m0'), corruption: S.stats.corruption };
  });
  await addHelpers();
  ok(cont.scene === 'dino' && cont.money === 200 && cont.corruption === 1, 'an autosave during a scene stores the pre-scene state; Continue replays the scene and applies the envelope once', cont);

  // C-21: overtime caps a perfect shift at 4 stars; the tutorial holds every decision until the draft is opened.
  const gate = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false); beginShift();
    for (let i = 0; i < 5; i++) { if (i === 4) S.shift.clock = shiftEnd() + 20; await __t.decide(__t.gen('clean'), 'approve'); }
    await __t.until(() => UI.screen === 'screen-report');
    out.ot = { stars: S.lastReport.summary.stars, overtime: S.lastReport.summary.overtime, line: (document.querySelector('.ot-line') || {}).textContent || '' };
    __t.start(false, true); beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    const c = UI.cur;
    act('approve'); await __t.tick();
    act('approve'); await __t.tick();
    act('ask'); act('source'); act('approve'); await __t.tick();
    out.held = { records: S.shift.records.length, busy: UI.busy, tip: document.getElementById('tip-text').textContent };
    act('draft'); act('approve');
    await __t.until(() => S.shift.records.length === 1);
    out.after = { records: S.shift.records.length, story: S.shift.records[0] && S.shift.records[0].title };
    return out;
  });
  ok(gate.ot.stars === 4 && gate.ot.overtime > 0 && /Capped at 4 stars/.test(gate.ot.line), 'overtime caps an otherwise perfect shift at 4 stars and says so', gate.ot);
  ok(gate.held.records === 0 && !gate.held.busy, 'the tutorial holds every decision on the first case until its draft is opened', gate.held);
  ok(gate.after.records === 1, 'once the draft is open, the decision goes through', gate.after);

  // C-21: every case-file claim about the bulletin holds against today's bulletin.
  const claims = await page.evaluate(() => {
    const bad = [];
    let checked = 0;
    __t.start(false, false);
    for (let day = 4; day <= 10; day++) {
      S.day = day; prepareShift();
      const fakes = S.bulletin.map((b) => b.fake), poi = poiNames(S);
      const cases = day === 6 ? [STORY_PEOPLE.stewardPhish.make(S)] : [];
      for (let k = 0; k < 120; k++) cases.push(buildCase({ kind: 'q' }, S, makeRng(day * 1013 + k)));
      cases.forEach((c) => {
        const texts = c.items.map((i) => `${i.name}: ${i.tell || ''} ${i.probe || ''} ${i.clear || ''}`).concat([c.escNote || ''], c.clues || []);
        texts.forEach((t) => {
          if (/Not on the bulletin/.test(t)) { checked++; if (c.ctx.cit && poi.includes(c.ctx.cit.name)) bad.push([day, c.tpl || c.story, 'says not on the bulletin', c.ctx.cit.name]); return; }
          if (/No bulletin today/.test(t)) { checked++; if (S.bulletin.length) bad.push([day, c.tpl || c.story, 'says no bulletin']); return; }
          if (!/bulletin|phishing list/i.test(t)) return;
          checked++;
          const to = String((c.docs.find((d) => d.type === 'draft').fields.find((f) => f.k === 'to') || {}).v || '');
          const doms = (t.match(/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:co|com|org|gov)(?:\.co)?\b/g) || []).concat(/Recipient|Addressed to/.test(t) ? [(to.match(/@([\w.-]+)/) || [])[1]] : []).filter((d) => d && d !== 'halcyon.gov');
          const names = poi.filter((n) => t.includes(n));
          const listed = doms.some((d) => fakes.includes(d)) || names.length || (c.ctx.cit && poi.includes(c.ctx.cit.name) && /name is on/.test(t));
          if (!listed) bad.push([day, c.tpl || c.story, t.slice(0, 90)]);
        });
      });
    }
    return { bad, checked };
  });
  ok(!claims.bad.length && claims.checked > 50, 'every case-file claim about the bulletin holds against S.bulletin (days 4–10)', claims.bad.slice(0, 4));

  // Loading during a decision's beats drops the old run's beats (no stray reaction, no extra case).
  const beats = await page.evaluate(async () => {
    __t.start(false, false); beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    __t.saveSlot(1);
    finalize('approve');
    openPause();
    __t.loadSlot(1);
    const loaded = S.shift.current, logLen = loaded.log.length;
    for (let i = 0; i < 400; i++) await __t.tick();
    return { same: S.shift.current === loaded && UI.cur === loaded, logLen, after: loaded.log.length, index: S.shift.index, records: S.shift.records.length };
  });
  ok(beats.same && beats.after === beats.logLen && beats.index === 0 && beats.records === 0, 'a save loaded while a decision’s beats are pending keeps the loaded case, untouched', beats);

  // C-22: saves are validated down to the queue; an unparseable save is shown as damaged.
  const sv = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false); beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    const good = JSON.parse(localStorage.getItem('meatproxy.save.auto'));
    const mut = (fn) => { const d = JSON.parse(JSON.stringify(good)); fn(d.state); return validSave(d); };
    out.shapes = {
      good: validSave(good),
      story: mut((st) => { st.shift.queue[1] = { story: 'nobody' }; }),
      tpl: mut((st) => { st.shift.queue[2] = { kind: 'clean', tpl: 'no-such-template' }; }),
      kind: mut((st) => { st.shift.queue[2] = { kind: 'weird' }; }),
      cur: mut((st) => { st.shift.current.tpl = 'no-such-template'; }),
      curStory: mut((st) => { st.shift.current.story = 'nobody'; }),
      index: mut((st) => { st.shift.index = 9; }),
      ending: mut((st) => { st.phase = 'ending'; st.ending = 'nowhere'; }),
      poi: mut((st) => { st.poi = ['Nobody Real']; }),
      dept: mut((st) => { st.staff[0].dept = 'Nowhere'; })
    };
    const bad = JSON.parse(JSON.stringify(good)); bad.state.shift.queue[1] = { story: 'nobody' };
    localStorage.setItem('meatproxy.save.auto', JSON.stringify(bad));
    renderMenu();
    [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent)).click();
    out.story = { modal: UI.modalOpen && document.getElementById('modal').textContent, screen: UI.screen };
    closeModal();
    localStorage.setItem('meatproxy.save.auto', '{"meta": {"day": 3, not json');
    renderMenu();
    const btn = [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent));
    out.notJson = { shown: !!btn, sub: btn ? btn.textContent : '' };
    if (btn) btn.click();
    out.notJson.modal = UI.modalOpen && document.getElementById('modal').textContent;
    out.notJson.filed = localStorage.getItem('meatproxy.save.damaged');
    closeModal();
    localStorage.setItem('meatproxy.save.2', 'garbage{');
    openLoad(false);
    out.slot2 = [...document.querySelectorAll('#modal .slot .meta')].map((e) => e.textContent)[2];
    closeModal();
    return out;
  });
  const shapes = sv.shapes;
  ok(shapes.good && !shapes.story && !shapes.tpl && !shapes.kind && !shapes.cur && !shapes.curStory && !shapes.index && !shapes.ending && !shapes.poi && !shapes.dept, 'validSave checks queue story ids, templates, slot kinds, the case on the desk, the index, the ending, persons of interest and departments', shapes);
  ok(/CHUCK has filed it/.test(sv.story.modal) && sv.story.screen === 'screen-menu', 'a save naming an unknown story person is filed as damaged, not loaded', sv.story);
  ok(sv.notJson.shown && /Damaged file/.test(sv.notJson.sub) && /CHUCK has filed it/.test(sv.notJson.modal) && /not json/.test(sv.notJson.filed || ''), 'an unparseable save shows on the menu as damaged and gets the damaged-file notice', sv.notJson);
  ok(sv.slot2 === 'Damaged file', 'the load list marks an unparseable slot as damaged', sv.slot2);

  // B6: endless reads the file — an audit at 14 pages, relocation at 16, steeper upkeep after shift 20.
  const en = await page.evaluate(async () => {
    const out = {};
    __t.start(true, false);
    const shift = (pages) => { S.phase = 'booth'; prepareShift(); beginShift(); S.shift.records = []; S.shift.index = 5; S.stats.suspicion = pages; S.money = 2000; endShift(); return S.lastReport.summary; };
    const s1 = shift(14);
    out.first = { wage: s1.wage, due: S.auditDue };
    S.day += 1;
    const s2 = shift(14);
    out.second = { wage: s2.wage, audit: s2.audit, row: [...document.querySelectorAll('.report td')].map((t) => t.textContent).find((t) => /Oversight audit/.test(t)) || '' };
    S.day += 1;
    const s3 = shift(10);
    out.third = { wage: s3.wage };
    S.day += 1;
    const s4 = shift(10);
    out.fourth = { wage: s4.wage };
    S.day += 1;
    shift(16); playEvening();
    out.reloc = { ending: S.ending, title: (document.getElementById('end-title') || {}).textContent, endless: !!document.getElementById('end-endless'), record: JSON.parse(localStorage.getItem('meatproxy.endless.v1')).lastEnd };
    renderMenu();
    out.menu = (document.querySelector('.menu-record') || {}).textContent || '';
    __t.start(true, false);
    const up = (n) => { S.endlessStart = S.day - n + 1; return endlessUpkeep(); };
    out.upkeep = [up(19), up(20), up(21), up(25)];
    return out;
  });
  ok(en.first.wage > 0 && en.first.due && en.second.wage === 0 && en.second.audit && /Oversight audit/.test(en.second.row), 'endless: ending a shift at 14 pages brings an audit that holds the next day rate', en);
  ok(en.fourth.wage > 0, 'below 14 pages the audit stops after the shift it docked', en.fourth);
  ok(en.reloc.ending === 'reloc' && en.reloc.title === 'RELOCATED' && !en.reloc.endless && en.reloc.record === 'reloc' && /relocated/.test(en.menu), 'endless: 16 pages end the run RELOCATED, recorded on the menu', [en.reloc, en.menu]);
  ok(en.upkeep[1] - en.upkeep[0] === 4 && en.upkeep[2] - en.upkeep[1] === 12 && en.upkeep[3] - en.upkeep[2] === 48, 'endless upkeep steepens after shift 20 ($4 a shift, then $12)', en.upkeep);

  // B9, W2, B7: ending gates, captions keyed to play, and copy seams.
  const end = await page.evaluate(() => {
    const out = {};
    const prof = (totals, extra) => { __t.start(false, false); S.day = 10; Object.assign(S.totals, totals); Object.assign(S, extra || {}); return S; };
    prof({ inspected: 50, readFile: 5 }); Object.assign(S.stats, { party: 8, conscience: 0 });
    out.disengaged = resolveEnding(S, 'stay');
    S.totals.readFile = 30; out.engaged = resolveEnding(S, 'stay');
    localStorage.removeItem('meatproxy.endings.v1');
    const run = (totals, key) => { prof(totals); finishEnding(key); return { cap: document.querySelector('#ending .badge-cap').textContent, doors: [...document.querySelectorAll('.end-doors li')].map((l) => l.textContent) }; };
    out.readers = run({ inspected: 50, readFile: 48, refused: 3, softRefused: 1 }, 'readers');
    out.comply = run({ inspected: 50, readFile: 0, refused: 0, softRefused: 0 }, 'autosigned');
    out.bribe = run({ inspected: 50, readFile: 2, bribes: 450 }, 'dry_aged');
    out.zero = (() => { prof({ refused: 4 }); S.affected = 0; return ['slow_hand', 'readers', 'front_page', 'relocated', 'parachute', 'dismissed', 'read_only'].map((k) => endingText(k, S).join(' ')); })();
    out.returned = (() => { prof({ refused: 0, softRefused: 7 }); Object.assign(S.stats, { party: 8 }); return endingText('head_of_ai', S).join(' '); })();
    __t.start(false, false); S.day = 2; beginShift();
    UI.cur = STORY_PEOPLE.render1.make(S); S.shift.current = UI.cur; presentItem(UI.cur, true);
    decideStart('detain'); out.renderModal = document.getElementById('modal').textContent; closeModal();
    const plain = __t.gen('clean'); UI.cur = plain; S.shift.current = plain; presentItem(plain, true);
    decideStart('detain'); out.plainModal = document.getElementById('modal').textContent; closeModal();
    const al = buildCase({ kind: 'clean', tpl: 'allergy' }, S, makeRng(3));
    out.allergy = al.docs[0].fields[1].v + ' | ' + al.ctx.p.name;
    return out;
  });
  ok(end.disengaged === 'autosigned' && end.engaged === 'head_of_ai', 'AUTOSIGNED takes a loyal proxy who opened the case file in under a quarter of decisions; the Steward’s desk needs reading', [end.disengaged, end.engaged]);
  ok(!/Didn’t look|Shades on/.test(end.readers.cap) && /read/i.test(end.readers.cap), 'a run that read everything and refused is never told it didn’t look', end.readers.cap);
  ok(!/read|opened|peek/i.test(end.comply.cap), 'a run that never opened a case file is never told it read', end.comply.cap);
  ok(/envelope/.test(end.bribe.cap), 'a run that took bribes is captioned for it', end.bribe.cap);
  ok(end.readers.doors.length === 11 && end.comply.doors.length === 10 && end.readers.doors.every((d) => !/\d/.test(d)) && !end.comply.doors.some((d) => /^READ BEFORE YOU SIGN/.test(d)), '“Other doors” lists every ending not yet found, one hint each, no numbers', [end.readers.doors.length, end.comply.doors.length, end.comply.doors[0]]);
  ok(end.zero.every((t) => !/reached 0 people|keeps climbing|every one you can remember|You read them all again|lists them under/.test(t)), 'with nobody affected, no ending says “0 people” or carries on as if there were some', end.zero.map((t) => t.slice(0, 60)));
  ok(/returned 7 lawful decisions/.test(end.returned) && !/withheld 0/.test(end.returned), 'a returned-only run reads “returned 7”, not “withheld 0 … 7 more”', end.returned.slice(0, 260));
  ok(/Oversight will add 2 pages/.test(end.renderModal) && !/\+1 page|adds a page/.test(end.renderModal), 'a story withhold states one page total, not two', end.renderModal);
  ok(/If the decision was lawful, withholding it adds a page/.test(end.plainModal), 'the generic withhold warning is conditional', end.plainModal);
  ok(/^Answer .*: (is|are) our /.test(end.allergy) && (/s \|/.test(end.allergy + ' |') ? true : true) && !/is our [^|]*cutlets/.test(end.allergy), 'the allergy order agrees with the product (“are our … cutlets”)', end.allergy);

  // W3: conscience notes never repeat within four nights; the day-9 hearing has its own reactions; sister texts vary.
  const w3 = await page.evaluate(() => {
    const out = {};
    __t.start(false, false);
    const picks = [];
    for (let day = 1; day <= 12; day++) { S.day = day; picks.push(nightlyPick(S, 'standNote', LINES.standNote)); if (day % 3 === 0) picks.push(nightlyPick(S, 'standNote', LINES.standNote)); }
    out.near = picks.filter((l, i) => picks.slice(Math.max(0, i - 4), i).includes(l)).length;
    out.pools = { stand: LINES.standNote.length, soft: LINES.softNote.length, low3: MOM_LOWER[3].length, low4: MOM_LOWER[4].length, paid: MOM_PAID.length, skipped: MOM_SKIPPED.length, partial: MOM_PARTIAL.length };
    const flagSets = [{ frankSent: true, sawRender: true }, { frankSent: true, blockedRender1: true }, { bayviewBlocked: true, blockedRender1: true }, { bayviewDelayed: true, sawRender: true }, {}];
    out.types = Math.max(...flagSets.map((f) => SCENES.brief9(Object.assign({}, S, { flags: f })).filter((l) => l.choices).flatMap((l) => l.choices.map((ch) => ch.then[0].text)).filter((t) => /She types something/.test(t)).length));
    out.distinct = flagSets.every((f) => SCENES.brief9(Object.assign({}, S, { flags: f })).filter((l) => l.choices).every((l) => new Set(l.choices.map((ch) => ch.then[0].text)).size === l.choices.length || l.choices.length === 1));
    S.day = 7; S.flags.momTier = 4; S.money = 999;
    out.ward = [0, 1, 2, 3].map((n) => { S.flags.momLow4 = n; return momLines(S)[0].text.replace(/\$\d+/, '$'); });
    return out;
  });
  ok(w3.near === 0, 'a conscience note never comes back within four nights', w3.near);
  ok(w3.pools.stand >= 6 && w3.pools.soft >= 6 && Math.min(w3.pools.low3, w3.pools.low4, w3.pools.paid, w3.pools.skipped, w3.pools.partial) >= 4, 'six or more conscience notes; four or more sister texts for every state', w3.pools);
  ok(w3.types <= 1 && w3.distinct, 'the day-9 hearing: a reaction per answer, “She types something” at most once', [w3.types, w3.distinct]);
  ok(new Set(w3.ward).size === 4, 'four evenings on the ward bring four different texts', w3.ward);
  await ctx.close();
}

// ---- 14. Audio: a fresh load logs no console warnings (the AudioContext waits for a gesture) ----------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1200);
  ok(warnings.length === 0, 'a fresh page load logs 0 console warnings', warnings.slice(0, 3));
  await page.click('#menu-buttons .btn:has-text("Settings")');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => typeof Sound === 'object') && warnings.length === 0, 'the first click starts audio without warnings', warnings.slice(0, 3));
  await ctx.close();
}

// ---- 15. Round 6: time, partial payment, endings, storage fuzz, tutorial holds, surnames, CHUCK's answers ----------------
console.log('round 6');
{
  const { ctx, page } = await open();
  // The clock from day 6: three scripted players on a day-6 and a day-8 shift.
  const clock = await page.evaluate(async () => {
    const out = {};
    const profiles = { papers: [0, 0], moderate: [1, 1], careful: [2, 2] };
    for (const day of [6, 8]) for (const [name, [checks, qs]] of Object.entries(profiles)) {
      __t.start(false, false);
      S.day = day; S.shift = null; prepareShift(); beginShift();
      for (let i = 0; i < 5; i++) {
        await __t.until(() => UI.cur && !UI.busy);
        const c = UI.cur;
        ['ask', 'source', 'draft', 'env'].forEach(act);
        for (let k = 0; k < checks; k++) { const it = c.items.find((x) => !x.examined); if (it) examineItem(it.id); }
        for (let k = 0; k < qs; k++) ask(QUESTIONS[k]);
        await __t.tick();
        const before = S.shift.index;
        finalize(c.expected);
        await __t.until(() => S.shift.index > before && !UI.busy && (UI.screen === 'screen-report' || UI.cur));
      }
      await __t.until(() => UI.screen === 'screen-report');
      out[name + day] = { spare: shiftEnd() - S.shift.clock, ot: S.lastReport.summary.overtime };
    }
    return out;
  });
  ok(clock.papers6.spare >= 25 && clock.papers8.spare >= 25, 'papers only (four papers a case) finishes 25+ minutes early on days 6 and 8', clock);
  ok([clock.moderate6, clock.moderate8].every((d) => d.spare >= 0 && d.spare <= 15), 'four papers, a check and a question a case finishes within 15 minutes of close', [clock.moderate6, clock.moderate8]);
  ok(clock.careful6.ot === 0 && clock.careful8.ot > 0, 'two checks and two questions a case makes close on day 6 and runs over on day 8', [clock.careful6, clock.careful8]);

  // Overtime from day 6: $25 for every 15 minutes started, three stars at most, and the report says both.
  const ot = await page.evaluate(async () => {
    __t.start(false, false); S.day = 6; S.shift = null; prepareShift(); beginShift();
    for (let i = 0; i < 5; i++) { if (i === 4) S.shift.clock = shiftEnd() + 20; await __t.decide(__t.gen('clean'), 'approve'); }
    await __t.until(() => UI.screen === 'screen-report');
    const s = S.lastReport.summary;
    openRulebook('today');
    const notes = document.getElementById('modal').textContent; closeModal();
    return { stars: s.stars, otPay: s.otPay, over: s.overtime, line: (document.querySelector('.ot-line') || {}).textContent || '', notes };
  });
  ok(ot.stars === 3 && ot.otPay === 50 && /Capped at 3 stars/.test(ot.line) && /\$50/.test(ot.line), 'day-6 overtime: 23 minutes late costs $50 and caps a perfect shift at 3 stars, and the report says so', ot);
  ok(/\$25 for every 15 minutes/.test(ot.notes) && /3 stars/.test(ot.notes) && /calendar page/.test(ot.notes), 'the desk notes state the overtime price, the cap and the calendar', ot.notes.slice(ot.notes.indexOf('TIME'), ot.notes.indexOf('TIME') + 260));

  // Partial payment: half the bill holds her tier; less moves her down provisionally; the sister covers once.
  const mom = await page.evaluate(() => {
    __t.start(false, false);
    const out = {};
    const opts = (money, flags, day) => { S.day = day || 5; S.money = money; S.flags = Object.assign({}, flags || {}); return momLines(S).find((it) => it.choices).choices; };
    const amt = (() => { S.day = 5; S.flags = {}; return momBill(S); })();
    const over = opts(Math.ceil(amt * 0.6)).find((c) => /Send what you have/.test(c.text));
    out.over = { text: over && over.text, tier: over && over.set.momTier };
    const under = opts(Math.floor(amt * 0.3)).find((c) => /Send what you have/.test(c.text));
    out.under = { text: under && under.text, tier: under && under.set.momTier, soft: under && under.set.momSoft };
    out.sisterUnder = !!opts(Math.floor(amt * 0.3)).find((c) => /sister/.test(c.text) && !c.disabled);
    const broke = opts(0);
    out.broke = broke.map((c) => (c.disabled ? '[x] ' : '') + c.text);
    const sis = broke.find((c) => /sister/.test(c.text) && !c.disabled);
    out.sisterSet = sis && sis.set;
    out.after = opts(0, { sisterCovered: 5 }, 6).map((c) => (c.disabled ? '[x] ' : '') + c.text);
    const restore = opts(900, { momTier: 3, momSoft: 5 }, 6).find((c) => /^Send \$/.test(c.text));
    out.restore = restore && restore.set;
    const stick = opts(900, { momTier: 3, momSoft: 5 }, 6).find((c) => c.text === 'Not this week.');
    out.stick = stick && stick.set;
    S.flags = { momPaid: 3, sisterCovered: 5 }; S.day = 10; out.ending = momEndingLine(S).join(' ');
    S.flags = { momPaid: 3, sisterCovered: 5 }; S.day = 7; S.money = 500; out.later = momLines(S)[0].text;
    return out;
  });
  ok(/over half/.test(mom.over.text) && mom.over.tier === undefined, '“Send what you have” at half the bill or more holds her tier and says so', mom.over);
  ok(/Under half/.test(mom.under.text) && mom.under.tier === 3 && mom.under.soft === 5 && mom.sisterUnder, 'under half moves her down provisionally and says so; the sister is offered', mom.under);
  ok(mom.broke.some((t) => /^Ask your sister/.test(t)) && mom.broke.some((t) => /nothing to send: she moves down, provisionally/.test(t)) && mom.sisterSet && mom.sisterSet.sisterCovered === 5 && mom.sisterSet.momTier === undefined, 'at $0: the sister can cover the week (holding her tier), or the move down is provisional', mom.broke);
  ok(mom.after.some((t) => /^\[x\] Ask your sister .*can’t again/.test(t)), 'the sister covers once a campaign, and the option says why it’s gone', mom.after);
  ok(mom.restore && mom.restore.momTier === 2 && mom.restore.momSoft === null && mom.stick && mom.stick.momSoft === null && mom.stick.momLowSince === 5 && mom.stick.momTier === 4, 'a full week moves her back up; skipping makes the provisional move stick', [mom.restore, mom.stick]);
  ok(/sister covered one week/i.test(mom.ending) && /week she covered|since the week she covered|love you, both/.test(mom.later), 'the sister’s week shows up in later texts and the ending', [mom.later, mom.ending]);

  // Endings: AUTOSIGNED only for low reading with no refusals; harmful catches are not refusals; the TIER ONE hint.
  const end = await page.evaluate(() => {
    const out = {};
    const prof = (totals, stats) => { __t.start(false, false); S.day = 10; Object.assign(S.totals, { inspected: 50, readFile: 0, refused: 0, softRefused: 0, caught: 0 }, totals); Object.assign(S.stats, { party: 0, conscience: 0, suspicion: 0, corruption: 0, truth: 0 }, stats || {}); return resolveEnding(S, 'stay'); };
    out.lowNoRefuse = prof({});
    out.reader = prof({ readFile: 20 });
    out.oneRefusal = prof({ softRefused: 1 });
    out.loyalLow = prof({}, { party: 9 });
    out.loyalReader = prof({ readFile: 30 }, { party: 9 });
    prof({ readFile: 40, caught: 16 });
    out.catcher = ['autosigned', 'read_only', 'head_of_ai'].map((k) => endingText(k, S).join(' '));
    out.hint = ENDING_DOORS.dry_aged;
    __t.start(false, false); S.day = 10; S.money = 1500; S.stats.corruption = 1; out.oneEnvelope = resolveEnding(S, 'stay');
    S.stats.corruption = 2; out.twoEnvelopes = resolveEnding(S, 'stay');
    return out;
  });
  ok(end.lowNoRefuse === 'autosigned' && end.loyalLow === 'autosigned', 'AUTOSIGNED: opened the case file in under a quarter of decisions and never refused', [end.lowNoRefuse, end.loyalLow]);
  ok(end.reader === 'read_only' && end.oneRefusal === 'read_only' && end.loyalReader === 'head_of_ai', 'a run that reads, or refuses once, never lands on AUTOSIGNED (READ-ONLY, or the Steward’s desk if loyal)', [end.reader, end.oneRefusal, end.loyalReader]);
  ok(end.catcher.every((t) => !/You never refused anything/.test(t)) && end.catcher.every((t) => /16 harmful drafts/.test(t)), 'withholding 16 harmful drafts is told apart from refusing on conscience', end.catcher.map((t) => t.slice(0, 80)));
  ok(/^Take what is offered, every time it is offered/.test(end.hint) && end.oneEnvelope !== 'dry_aged' && end.twoEnvelopes === 'dry_aged', 'the TIER ONE hint says “every time it is offered”, and one envelope is not enough', [end.hint, end.oneEnvelope, end.twoEnvelopes]);

  // Seams: share text, the report's missed bonus, Marta's "docked", the attachment row, fraud evidence, story exits.
  const seam = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false); S.affected = 1; S.totals.softRefused = 2; finishEnding('read_only');
    let shared = '';
    navigator.share = undefined;
    const realClip = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { shared = t; return Promise.resolve(); } } });
    document.getElementById('end-share').click(); await __t.until(() => shared);
    out.share = shared;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: realClip });
    __t.start(false, false); S.day = 6; S.shift = null; prepareShift(); beginShift();
    const q = __t.gen('q');
    out.none = (await __t.decide(q, 'detain')).bonusMiss;
    const q2 = __t.gen('q'); q2.flags = [{ doc: 'draft', field: 'subj' }, { doc: 'draft', field: 'b0' }];
    q2.flawFields = (q2.flawFields || []).filter((k) => k !== 'subj' && k !== 'b0'); q2.evidenceFound = false;
    out.wrong = (await __t.decide(q2, 'detain')).bonusMiss;
    for (let i = 0; i < 3; i++) await __t.decide(__t.gen('clean'), 'approve');
    await __t.until(() => UI.screen === 'screen-report');
    out.report = document.getElementById('report-wrap').textContent;
    const docked = (pay) => { S.flags.blockedRender1 = true; S.lastReport = { records: [{ story: true, title: 'Batch cover sheet (Project RENDER)', pay }] }; return SCENES.eve2(S).map((l) => l.text || '').join(' '); };
    out.docked20 = docked(-20); out.docked0 = docked(0);
    let na = null;
    for (let k = 0; k < 400 && !na; k++) { const c = buildCase({ kind: 'back', tpl: 'tasting' }, S, makeRng(k)); if (c.flaw && c.flaw.kind === 'noattach') na = c; }
    out.noattach = na && { att: na.docs.find((d) => d.type === 'draft').fields.find((f) => f.k === 'att'), ff: na.flawFields };
    __t.start(false, false); S.day = 4; S.shift = null; prepareShift(); beginShift();
    const fr = buildCase({ kind: 'q', tpl: 'fake-reviews' }, S, makeRng(5));
    fr.flags = [{ doc: 'draft', field: 'b0' }];
    out.fraud = (await __t.decide(fr, 'detain')).pay;
    const m = STORY_PEOPLE.marta1.make(S);
    await __t.decide(m, 'approve');
    out.exit = m.log.filter((l) => l.who === 'them').map((l) => l.text).join(' | ');
    out.genericExit = EXIT_LINES.approve.some((l) => /it was your signature/.test(l));
    return out;
  });
  ok(/affecting 1 person\./.test(seam.share) && /Returned on conscience: 2/.test(seam.share), 'share text: “1 person”, and “Returned on conscience”', seam.share);
  ok(seam.none === 'none' && seam.wrong === 'wrong' && /no line flagged: no evidence bonus/.test(seam.report) && /wrong line flagged/.test(seam.report), 'the report says why an evidence bonus was missed', [seam.none, seam.wrong]);
  ok(/docked \$20/.test(seam.docked20) && !/docked/.test(seam.docked0), 'Marta says “docked” only when there was a deduction', [seam.docked20.slice(0, 160), seam.docked0.slice(0, 160)]);
  ok(seam.noattach && seam.noattach.att && seam.noattach.att.v === 'none' && seam.noattach.att.label === 'Attachment' && seam.noattach.ff.includes('att'), 'a missing attachment shows as “Attachment: none” on the draft, and can be flagged', seam.noattach);
  ok(seam.fraud === 35, 'flagging a fraudulent line earns the evidence bonus (+$20 +$15)', seam.fraud);
  ok(/If anyone asks, it was your signature/.test(seam.exit) && !seam.genericExit, 'Marta’s signature line is hers alone', seam.exit.slice(-160));
  await ctx.close();
}

// Old ending keys load: a save and an endings list from before the rename.
{
  const { ctx, page } = await open();
  const old = await page.evaluate(() => {
    __t.start(false, false);
    S.phase = 'ending'; S.ending = 'walked_out'; S.day = 10;
    const data = { meta: { officer: S.officer, day: 10, endless: false, money: S.money, rep: S.rep, when: new Date().toISOString() }, state: JSON.parse(JSON.stringify(S)) };
    localStorage.setItem('meatproxy.save.1', JSON.stringify(data));
    localStorage.removeItem('meatproxy.save.auto');
    localStorage.setItem('meatproxy.endings.v1', JSON.stringify({ walked_out: true, replaced: true, bogus: true }));
    return true;
  });
  await reloadKeep(page, false);
  const r = await page.evaluate(async () => {
    loadGame(1, false);
    await __t.until(() => UI.screen === 'screen-ending', 500);
    if (!S || UI.screen !== 'screen-ending') return { key: null, title: '', eyebrow: '', found: readEndings() };
    return { key: S.ending, title: document.getElementById('end-title').textContent, eyebrow: document.querySelector('#ending .eyebrow').textContent, found: readEndings() };
  });
  ok(old && r.key === 'relocated' && r.title === 'RELOCATED' && /ENDING 2 OF 12 FOUND/.test(r.eyebrow) && r.found.relocated && r.found.autosigned && !r.found.walked_out && !r.found.bogus, 'a save and an endings list from before the key rename load under the new keys', r);
  await ctx.close();
}

// Storage fuzz: every key, set to null, a number, a string, [], {} and truncated JSON, one at a time; then load, continue
// (or start) and decide. No page error, no desk stuck busy.
{
  const { ctx, page } = await open();
  const base = await page.evaluate(() => { __t.start(false, false); beginShift(); return localStorage.getItem('meatproxy.save.auto'); });
  const keys = ['meatproxy.save.auto', 'meatproxy.save.1', 'meatproxy.settings.v1', 'meatproxy.registry.v1', 'meatproxy.endings.v1', 'meatproxy.endless.v1'];
  const vals = ['null', '5', '"loud"', '[]', '{}', base.slice(0, Math.floor(base.length / 2))];
  const structural = [['memory', { cruel: 5 }], ['memory', { cruel: [] }], ['tplCount', 'x'], ['recentTpl', { 3: 'x' }], ['heard', { t: 1, m: [] }], ['metStaff', 'E001'], ['citizenLog', { a: 5 }], ['beats', { x: 'y' }]];
  const results = [];
  const before = errors.length;
  const run = async (label, key, raw) => {
    await page.evaluate(([k, v, good]) => { localStorage.setItem('meatproxy.save.auto', good); localStorage.setItem(k, v); }, [key, raw, base]);
    await page.reload();
    await page.waitForSelector('#menu-buttons .btn');
    const r = await page.evaluate(async () => {
      const cont = [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent) && !/Damaged/.test(b.textContent));
      if (cont) cont.click(); else { if (UI.modalOpen) closeModal(); __t.start(false, false); }
      if (UI.modalOpen) { closeModal(); __t.start(false, false); }
      for (let i = 0; i < 300 && UI.screen === 'screen-scene'; i++) { const b = document.querySelector('#scene-choices .btn:not([disabled])'); if (b) b.click(); await __t.tick(); }
      if (UI.screen !== 'screen-booth') { __t.start(false, false); beginShift(); }
      await __t.until(() => UI.cur && !UI.busy);
      const at = S.shift.index;
      finalize('approve');
      await __t.until(() => S.shift.index > at && !UI.busy && (UI.cur || UI.screen === 'screen-report'));
      openRulebook('stamps'); closeModal(); openRegistry(); closeModal(); renderMenu();
      return { busy: UI.busy, decided: S.shift.index > at, screen: UI.screen };
    });
    results.push([label, r.decided && !r.busy]);
  };
  for (const k of keys) for (const v of vals) await run(`${k.replace('meatproxy.', '')}=${v.slice(0, 12)}`, k, v);
  for (const [field, value] of structural) {
    const data = JSON.parse(base); data.state[field] = value;
    await run(`save.${field}=${JSON.stringify(value)}`, 'meatproxy.save.auto', JSON.stringify(data));
  }
  const fuzzErrors = errors.slice(before);
  ok(results.every(([, good]) => good) && !fuzzErrors.length, `storage fuzz: ${results.length} damaged values, each loaded, continued and decided without an error or a stuck desk`, [results.filter(([, g]) => !g).slice(0, 4), fuzzErrors.slice(0, 3)]);
  errors.splice(before);
  await page.evaluate(() => localStorage.setItem('meatproxy.settings.v1', JSON.stringify({ master: 'loud', music: null, sfx: 7, textSpeed: 'warp', tips: true })));
  await page.reload();
  await page.waitForSelector('#menu-buttons .btn');
  const live = await page.evaluate(() => ({ master: settings.master, music: settings.music, sfx: settings.sfx, speed: settings.textSpeed }));
  ok(live.master === 0.8 && live.music === 0.4 && live.sfx === 1 && live.speed === 'fast', 'damaged settings in storage load as finite, in-range volumes and a known text speed', live);
  const clamp = await page.evaluate(() => [cleanSettings({ master: 'loud', music: Infinity, sfx: -3, ambience: '0.5', textSpeed: 'warp', crt: 'yes', large: 1 }), cleanSettings(null), cleanSettings([])]);
  ok(clamp[0].master === 0.8 && clamp[0].music === 0.4 && clamp[0].sfx === 0 && clamp[0].ambience === 0.5 && clamp[0].textSpeed === 'fast' && clamp[0].crt === false && clamp[0].large === false && clamp[1].master === 0.8 && clamp[2].tips === true, 'settings are clamped to finite volumes and known options', clamp[0]);
  await ctx.close();
}

// Tutorial: on the first case Return, Withhold and Oversight wait for the draft too; a tip counts as seen when done.
{
  const { ctx, page } = await open();
  const hold = await page.evaluate(async () => {
    __t.start(false, true); beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    const sec = S.shift.security;
    for (const k of ['d', 'x', 's', 'a']) { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); await __t.tick(); if (UI.modalOpen) closeModal(); }
    return { records: S.shift.records.length, sec: S.shift.security - sec, busy: UI.busy, searched: !!UI.cur.searched, tip: document.getElementById('tip-text').textContent };
  });
  ok(hold.records === 0 && hold.sec === 0 && !hold.searched && !hold.busy && /draft/i.test(hold.tip), 'tutorial case 1: D, X, S and A all wait until the draft is open', hold);
  const seen = await page.evaluate(async () => {
    __t.start(false, true); beginShift();
    await __t.until(() => UI.cur && !UI.busy && !document.getElementById('tip').hidden);
    tutNext();
    const orderTip = UI.tut;
    act('draft'); await __t.tick();
    tutNext(); await __t.tick();
    const back = UI.tut;
    const before = S.shift.index;
    finalize('approve');
    await __t.until(() => S.shift.index > before && UI.cur && !UI.busy);
    await __t.until(() => !document.getElementById('tip').hidden, 200);
    return { orderTip, back, seenAfter: (S.tutSeen || []).slice(), case2: UI.tut, text: document.getElementById('tip-text').textContent };
  });
  await reloadKeep(page);
  const reload = await page.evaluate(async () => {
    [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent)).click();
    await __t.until(() => UI.cur && !document.getElementById('tip').hidden, 500);
    return { tut: UI.tut, text: document.getElementById('tip-text').textContent };
  });
  ok(seen.orderTip === 1 && seen.back === 1 && !seen.seenAfter.includes(1) && seen.seenAfter.includes(0) && seen.case2 === 1, 'a tip shown but not acted on is not seen: deciding early brings the order tip back on case 2', seen);
  ok(reload.tut === 1 && /order/i.test(reload.text), 'and a reload on case 2 still resumes at the order tip', reload);
  await ctx.close();
}

// Nobody generated shares the player's surname: officers, persons of interest, citizens, contacts, decoys, approvers.
{
  const { ctx, page } = await open();
  const sur = await page.evaluate(() => {
    const names = ['Vasquez', 'Chen', 'Okafor', 'Kovacs', 'Hartigan', 'Webb', 'Bell', 'Brooks', 'Pike', 'Mendoza', 'Szabo', 'Alvarez'];
    const bad = [];
    names.forEach((n, i) => {
      document.getElementById('officer-name').value = n;
      const rn = Date.now; Date.now = () => 9000 + i; newOpts.endless = false; newOpts.tutorial = false; newGame(); Date.now = rn;
      if (S.staff.some((p) => p.last === n)) bad.push([n, 'officer']);
      if (poiNames(S).some((p) => p.endsWith(' ' + n))) bad.push([n, 'poi']);
      for (let day = 1; day <= 10; day++) {
        S.day = day;
        Object.keys(STORY_PEOPLE).forEach((id) => { const c = STORY_PEOPLE[id].make(S); if (c.last === n) bad.push([n, 'story', id]); });
        for (const kind of ['clean', 'back', 'q', 'cruel']) for (let k = 0; k < 3; k++) {
          const c = buildCase(Object.assign({ kind }, campaignAvoid(S)), S, makeRng(day * 100 + k + kind.length + i));
          const st = c.docs.find((d) => d.type === 'stamp');
          const people = [c.last, JSON.stringify(c.ctx.cit || ''), JSON.stringify(c.ctx.oth || ''), JSON.stringify((c.ctx.c || {}).contact || ''), JSON.stringify((c.ctx.s || {}).contact || ''), String(c.ctx.n || ''), String(c.ctx.kid || ''), (c.flaw && c.flaw.wrong) || '', st ? st.fields.find((f) => f.k === 'by').v : ''].join('|');
          if (new RegExp(`\\b${n}\\b`).test(people)) bad.push([n, day, kind, c.tpl, people.slice(0, 80)]);
          recordCase(S, c);
        }
      }
    });
    // A save from before officers were dealt around the player's surname: such an officer never brings a case.
    __t.start(false, false);
    S.staff.filter((p) => p.dept === 'Finance' && !p.fraud).slice(0, 1).forEach((p) => { p.last = S.officer; });
    S.day = 5;
    for (let k = 0; k < 40; k++) { const c = buildCase({ kind: 'clean', tpl: 'late-invoice' }, S, makeRng(k)); if (c.last === S.officer) { bad.push(['old save', c.first, c.last]); break; } }
    return bad;
  });
  ok(!sur.length, 'the player’s surname is never anyone else’s: 12 surnames from every pool, 10 days each, and old saves too', sur.slice(0, 4));
  await ctx.close();
}

// Each flaw kind turns up at most once a shift, in the game's own queue.
{
  const { ctx, page } = await open();
  // 120 seeded campaigns through the game's own queue (prepareShift + nextItem): flaw kinds per shift, written
  // punchlines and CHUCK's greetings per campaign, the answer key per day, the desk calendar and the dated stamp.
  const rep = await page.evaluate(async () => {
    const dups = [], punch = [], greets = [], cal = [], dated = { early: 0, late: 0, days: new Set() };
    const seqs = {};
    let shifts = 0;
    const V = { clean: 'S', back: 'R', q: 'W', cruel: 'C' }, D = { approve: 'S', deny: 'R', detain: 'W' };
    const realPresent = window.presentItem, realSave = window.autosave;
    window.presentItem = (c) => { UI.cur = c; };
    window.autosave = () => {};
    for (let run = 0; run < 120; run++) {
      const rn = Date.now; Date.now = () => 7100 + run * 977; newOpts.endless = false; newOpts.tutorial = false; newGame(); Date.now = rn;
      const told = {}, heard = {};
      for (let day = 1; day <= 10; day++) {
        S.day = day; S.shift = null; prepareShift(); S.phase = 'booth'; S.shift.midDone = true;
        const keys = [];
        let seq = '';
        for (let i = 0; i < 5; i++) {
          const sh = S.shift;
          const slot = sh.queue[sh.index];
          if (slot.story) { seq += D[STORY_PEOPLE[slot.story].make(S).expected]; sh.index += 1; continue; }
          seq += V[slot.kind || 'clean'];
          UI.cur = null; nextItem();
          const c = UI.cur;
          if (c.flawKey) { if (keys.includes(c.flawKey)) dups.push([run, day, c.flawKey]); keys.push(c.flawKey); }
          (c.punch || []).forEach((k) => { if (told[k]) punch.push([run, day, k]); told[k] = 1; });
          if (heard[c.chuckGreet]) greets.push([run, day, c.chuckGreet]); heard[c.chuckGreet] = 1;
          const shown = calendarMonths(S).map((m) => `${m.year}-${String(m.month).padStart(2, '0')}`);
          (c.calMonths || []).forEach((k) => { if (!shown.includes(k)) cal.push([run, day, c.tpl, k, shown]); });
          if (c.flaw && c.flaw.kind === 'stampDate') { if (day < 8) dated.early++; else { dated.late++; dated.days.add(run + ':' + day); } }
          sh.current = null; sh.index += 1; UI.busy = false;
        }
        if (run < 50) (seqs[day] = seqs[day] || []).push(seq);
        shifts++;
      }
    }
    window.presentItem = realPresent; window.autosave = realSave;
    const share = Object.entries(seqs).map(([d, list]) => { const n = {}; list.forEach((x) => { n[x] = (n[x] || 0) + 1; }); return [+d, Math.max(...Object.values(n)) / list.length, Object.keys(n).length]; });
    return { dups, shifts, punch, greets, cal, dated: { early: dated.early, late: dated.late, shifts: dated.days.size }, share };
  });
  ok(!rep.dups.length, `no flaw kind twice in a shift (${rep.shifts} shifts through the real queue)`, rep.dups.slice(0, 3));
  ok(!rep.punch.length, 'no written punchline (a template’s own flaw, an overreach line, an odd find) twice in a campaign (120 campaigns)', rep.punch.slice(0, 3));
  ok(!rep.greets.length, 'CHUCK never greets with the same line twice in a campaign (120 campaigns)', rep.greets.slice(0, 3));
  console.log('        verdict sequences, 50 campaigns: ' + rep.share.map(([d, x, n]) => `d${d} ${Math.round(x * 100)}% (${n})`).join(' · '));
  ok(rep.share.length === 10 && rep.share.every(([, x]) => x <= 0.25), 'the answer key moves: no day has the same verdict sequence in more than a quarter of 50 campaigns', rep.share);
  ok(!rep.cal.length, 'every month a weekday-less source needs is on that shift’s desk calendar', rep.cal.slice(0, 3));
  ok(rep.dated.early === 0 && rep.dated.shifts > 60, `the dated-stamp forgery starts on day 8 and turns up often after (in ${rep.dated.shifts} of 360 shifts on days 8–10)`, rep.dated);
  await ctx.close();
}

// CHUCK answers to the flaw it has: a flawed case's tag pool for the tag's questions; never a tag pool on a clean case.
{
  const { ctx, page } = await open();
  const tag = await page.evaluate(() => {
    __t.start(false, false); S.day = 7; S.shift = null; prepareShift();
    const bad = [];
    let checked = 0;
    const tagLines = new Set();
    for (let k = 0; k < 300; k++) {
      const kind = k % 3 === 0 ? 'clean' : k % 3 === 1 ? 'back' : 'q';
      const c = buildCase({ kind }, S, makeRng(k * 17 + 3));
      const pools = c.flaw && CHUCK_BY_TAG[c.flaw.tag];
      [1, 2, 3, 4, 5, 6, 7, 8, 10].forEach((qid) => {
        const a = answerQuestion(c, qid, S).text;
        const all = new Set(Object.values(CHUCK_BY_TAG).flatMap((p) => Object.values(p).flat()).map((l) => tpl(l, c.ctx)));
        if (pools && pools[qid]) { checked++; if (!pools[qid].map((l) => tpl(l, c.ctx)).includes(a)) bad.push([c.tpl, c.flaw.tag, qid, a]); }
        else if (!c.flaw && all.has(a)) bad.push([c.tpl, 'clean', qid, a]);
      });
    }
    return { bad, checked };
  });
  ok(!tag.bad.length && tag.checked > 100, `CHUCK’s answers match the case’s flaw tag (${tag.checked} tagged answers), and clean cases never get a flaw answer`, tag.bad.slice(0, 3));
  await ctx.close();
}

// ---- 16. Round 7: the mother's bill, copy seams, the clock, the calendar, the dated stamp, structural save fuzz ----------
console.log('round 7');
{
  const { ctx, page } = await open();
  // Every transition of the mother's bill, on the choices momLines offers (bill: $60 on day 5, $70 on day 6, $80 on day 7).
  const mom = await page.evaluate(async () => {
    __t.start(false, false);
    const out = {};
    const opts = (money, flags, day) => { S.day = day; S.money = money; S.flags = Object.assign({}, flags || {}); return momLines(S).find((it) => it.choices).choices; };
    const pick = (list, re) => list.find((c) => re.test(c.text));
    const thenText = (c) => ((c && c.then) || []).map((l) => l.text).join(' ');
    const all = (list) => list.map((c) => c.text + ' ' + thenText(c)).join(' | ');
    const sister = (list) => pick(list, /^Ask your sister/);
    let o = opts(30, {}, 5);
    out.half = { text: pick(o, /Send what you have/).text, tier: pick(o, /Send what you have/).set.momTier, sister: !!sister(o) };
    o = opts(40, {}, 5);
    out.over = { text: pick(o, /Send what you have/).text, sister: !!sister(o) };
    out.fullNoSister = !sister(opts(500, {}, 5));
    o = opts(20, {}, 5);
    out.under = { set: pick(o, /Send what you have/).set, sister: !!(sister(o) && !sister(o).disabled) };
    out.payBack = pick(opts(500, { momTier: 3, momSoft: 5 }, 6), /^Send \$/).set;
    o = opts(0, { momTier: 3, momSoft: 5 }, 6);
    out.sisterBack = { text: sister(o).text, set: sister(o).set, then: thenText(sister(o)) };
    out.sisterHold = sister(opts(0, {}, 6)).set;
    out.sisterGone = sister(opts(0, { sisterCovered: 5 }, 6)).disabled;
    out.skipDrop = pick(opts(500, {}, 5), /^Not this week/).set;
    out.skipSoft = pick(opts(500, { momTier: 3, momSoft: 5 }, 6), /^Not this week/).set;
    o = opts(40, { momTier: 3, momSoft: 5 }, 6);
    out.partialSoft = { text: pick(o, /Send what you have/).text, set: pick(o, /Send what you have/).set };
    out.cardSoft = pick(opts(2000, { momTier: 3, momSoft: 5 }, 6), /private-care/).set;
    out.oneANight = momSoftDrop(Object.assign({}, S, { day: 6, flags: { momTier: 3, momSoft: 6 } }));
    out.ward = [all(opts(10, { momTier: 4 }, 7)), all(opts(0, { momTier: 4 }, 7)), all(opts(500, { momTier: 4 }, 7))];
    out.wardUnder = pick(opts(10, { momTier: 4 }, 7), /Send what you have/).text;
    // Three broke evenings in a row from Tier 2: the sister's texts never repeat back to back.
    S.flags = {}; const said = [];
    for (const day of [5, 6, 7]) { S.day = day; S.money = 0; const c = pick(momLines(S).find((it) => it.choices).choices, /^Not this week/); said.push(thenText(c)); Object.assign(S.flags, c.set); }
    out.broke = said;
    // A debt drop at night (the real report), then the evening: it moves her once, and a full week or the sister puts it right.
    __t.start(false, false); S.day = 6; S.money = -400; S.debtNights = 1; S.shift = null; prepareShift(); beginShift();
    for (let i = 0; i < 5; i++) await __t.decide(__t.gen('clean'), 'approve');
    await __t.until(() => UI.screen === 'screen-report');
    out.debt = { drop: S.lastReport.summary.momDrop, tier: S.flags.momTier, soft: S.flags.momSoft };
    const ev = momLines(S).find((it) => it.choices).choices;
    const skip = pick(ev, /^Not this week/);
    out.debtSkip = { text: skip.text, tier: skip.set.momTier, then: thenText(skip) };
    out.debtSister = sister(ev) && sister(ev).set;
    const flags = Object.assign({}, S.flags);
    out.debtPay = pick(opts(500, flags, 7), /^Send \$/).set;
    return out;
  });
  ok(/It’s half; it holds her room/.test(mom.half.text) && !/over half/.test(mom.half.text) && mom.half.tier === undefined && /It’s over half/.test(mom.over.text), '“over half” only when it is; exactly half says “half” and holds her tier', [mom.half.text, mom.over.text]);
  ok(!mom.half.sister && !mom.over.sister && mom.fullNoSister && mom.under.sister, 'the sister is offered only under half (or at $0), never when you can send half or more', [mom.half.sister, mom.over.sister, mom.fullNoSister, mom.under.sister]);
  ok(mom.under.set.momTier === 3 && mom.under.set.momSoft === 5, 'under half: down a tier, provisionally', mom.under.set);
  ok(mom.payBack.momTier === 2 && mom.payBack.momSoft === null, 'a full week puts a provisional move right', mom.payBack);
  ok(mom.sisterBack.set.momTier === 2 && mom.sisterBack.set.momSoft === null && mom.sisterBack.set.sisterCovered === 6 && /counts as a full week/.test(mom.sisterBack.text) && /moved her back up/.test(mom.sisterBack.then), 'the sister’s week counts as a full payment: it reverses a provisional move, and says so', mom.sisterBack);
  ok(mom.sisterHold.momTier === undefined && mom.sisterHold.sisterCovered === 6 && mom.sisterGone === true, 'otherwise her week holds the tier, and she covers once', [mom.sisterHold, mom.sisterGone]);
  ok(mom.skipDrop.momTier === 3 && mom.skipDrop.momLowSince === 5 && mom.skipSoft.momTier === 4 && mom.skipSoft.momSoft === null && mom.skipSoft.momLowSince === 5, 'skipping drops her for good, and makes an earlier provisional move stick', [mom.skipDrop, mom.skipSoft]);
  ok(/stops being provisional/.test(mom.partialSoft.text) && mom.partialSoft.set.momSoft === null && mom.partialSoft.set.momLowSince === 5 && mom.partialSoft.set.momTier === undefined, 'half or more after a provisional move holds her where she is, and the option says the move sticks', mom.partialSoft);
  ok(mom.cardSoft.momTier === 1 && mom.cardSoft.momSoft === null, 'the private-care card clears a provisional move', mom.cardSoft);
  ok(JSON.stringify(mom.oneANight) === '{}', 'one provisional move a night: the home moving her tonight means nothing to send doesn’t move her again', mom.oneANight);
  ok(mom.ward.every((t) => !/down a tier|moves down/.test(t)) && /no lower tier/.test(mom.wardUnder), 'on the ward no option or text threatens a further drop', mom.ward.map((t) => t.slice(0, 120)));
  ok(new Set(mom.broke).size === 3 && mom.broke.every((t) => t.length > 20), 'three broke evenings in a row: the sister never sends the same text twice running', mom.broke);
  ok(mom.debt.drop && mom.debt.tier === 3 && mom.debt.soft === 6, 'two nights in debt: one provisional move, at night', mom.debt);
  ok(mom.debtSkip.tier === undefined && /stays where the home moved her tonight/.test(mom.debtSkip.text) && !/down a tier/.test(mom.debtSkip.then), 'the same evening, nothing to send moves her no further, and nobody says it will', mom.debtSkip);
  ok(mom.debtSister && mom.debtSister.momTier === 2 && mom.debtPay.momTier === 2 && mom.debtPay.momSoft === null, 'a debt drop is put right by a full week, the sister’s included', [mom.debtSister, mom.debtPay]);

  // Copy seams.
  const copy = await page.evaluate(async () => {
    const out = {};
    __t.start(false, false);
    S.day = 10; S.totals.refused = 1; S.totals.inspected = 50; S.totals.readFile = 40;
    S.affected = 1; out.one = endingText('readers', S).join(' ');
    S.affected = 2; out.two = endingText('readers', S).join(' ');
    out.readOnly = endingText('read_only', S).join(' ');
    out.door = ENDING_DOORS.scapegoat;
    S.day = 6; S.shift = null; prepareShift();
    const q7 = [];
    ['eviction', 'relocation', 'school-placement', 'ration-cut', 'benefit-denial'].forEach((id) => {
      for (let k = 0; k < 40; k++) { const c = buildCase({ kind: 'clean', tpl: id }, S, makeRng(k * 31 + id.length)); q7.push([id, answerQuestion(c, 7, S).text, c.ctx.cit ? c.ctx.cit.addr : '', c.ctx.to]); }
    });
    out.q7addr = q7.filter(([, t, addr, to]) => (addr && t.includes(addr)) || t.includes(to)).slice(0, 3);
    out.q7parents = q7.filter(([id, t]) => id === 'school-placement' && /\{|undefined/.test(t)).length;
    const c = buildCase({ kind: 'clean', tpl: 'eviction' }, S, makeRng(7));
    answerQuestion(c, 3, S);
    out.again = answerQuestion(c, 3, S).text;
    out.saidName = asISaid('{to}. One recipient. Very clean.', { to: 'Eunice Faraday, 12 Oak St' });
    out.saidWord = asISaid('Just {to}. Nobody else.', { to: 'Eunice Faraday' });
    out.saidChuck = asISaid('CHUCK checked it.', {});
    const swaps = [], digits = [];
    S.day = 7;
    for (let k = 0; k < 800 && (swaps.length < 3 || digits.length < 3); k++) { const b = buildCase({ kind: 'back' }, S, makeRng(k * 7 + 1)); if (b.flaw && b.flaw.kind === 'offByOneId') (b.flaw.how === 'swap' ? swaps : digits).push(b.flaw.note); }
    out.swaps = swaps; out.digits = digits;
    out.softSchool = softNotes({ tpl: 'school-placement' }).some((l) => /sleeps at home/.test(l));
    out.softEvict = softNotes({ tpl: 'eviction' }).some((l) => /sleeps at home/.test(l));
    out.quick = PERSONALITIES.hurried.open.some((x) => /—/.test(x));
    out.sales = QUIRKS.Sales.some((q) => /before they finish being said/.test(q));
    out.sweep = GREETS.some((g) => /ten o.clock/i.test(g));
    out.ceo = TEMPLATES.find((T) => T.id === 'reschedule').flaws.map((f) => f.note).join(' ');
    // A harmless finding fits the paper: the truck only on paperwork from people with trucks.
    const odd = [];
    S.day = 4;
    for (let k = 0; k < 900; k++) { const x = buildCase({ kind: 'clean' }, S, makeRng(k * 13 + 5)); if (x.odd) odd.push([x.dept, x.odd]); }
    out.oddTruck = odd.filter(([d, t]) => /truck/.test(t) && !['Logistics', 'Warehouse', 'Quality'].includes(d));
    out.oddMacro = odd.filter(([d, t]) => /macro/i.test(t) && !['Finance', 'Sales'].includes(d));
    out.oddCount = odd.length;
    // The case builder itself passes over a punchline the campaign has heard (Gita's colonoscopy, the retry in nextItem
    // aside), while another flaw is there to take.
    S.day = 6;
    const told = 'tpl:reschedule#1';
    out.punchFresh = 0; out.punchTold = 0;
    for (let k = 0; k < 60; k++) {
      if ((buildCase({ kind: 'q', tpl: 'reschedule' }, S, makeRng(k)).punch || []).includes(told)) out.punchFresh++;
      if ((buildCase({ kind: 'q', tpl: 'reschedule', avoidPunch: [told] }, S, makeRng(k)).punch || []).includes(told)) out.punchTold++;
    }
    return out;
  });
  ok(/reached 1 person\./.test(copy.one) && /reached 2 people\./.test(copy.two), 'endings: “reached 1 person”, “reached 2 people”', [copy.one.match(/reached [^.]*\./), copy.two.match(/reached [^.]*\./)]);
  ok(/not often enough for CHUCK to need you/.test(copy.readOnly) && copy.door === 'Fill your file to Ines’s line, then stay at your desk anyway.', 'READ-ONLY says “not often enough for CHUCK to need you”; the HUMAN IN THE LOOP hint names Ines’s line', [copy.readOnly.match(/on conscience[^.]*\./), copy.door]);
  ok(!copy.q7addr.length && !copy.q7parents, 'CHUCK’s “what happens next” on a letter names the citizen, never the To line or a street address', copy.q7addr);
  ok(/^As I said: /.test(copy.again) && copy.saidName === 'As I said: Eunice Faraday, 12 Oak St. One recipient. Very clean.' && copy.saidWord === 'As I said: just Eunice Faraday. Nobody else.' && copy.saidChuck === 'As I said: CHUCK checked it.', '“As I said:” on a repeat, keeping names and CHUCK in capitals', [copy.again, copy.saidName, copy.saidWord, copy.saidChuck]);
  ok(copy.swaps.length && copy.swaps.every((n) => /two digits swapped/.test(n)) && copy.digits.length && copy.digits.every((n) => /one digit off/.test(n)), 'a swapped-digit flaw is labelled “two digits swapped”, a changed digit “one digit off”', [copy.swaps[0], copy.digits[0]]);
  ok(!copy.softSchool && copy.softEvict, 'soft-refusal notes fit the case: “sleeps at home” only for an eviction or relocation', [copy.softSchool, copy.softEvict]);
  ok(!copy.quick && !copy.sales && !copy.sweep && /Steward’s medical appointment/.test(copy.ceo), 'no “Quick—”, no second laugh-before-the-joke quirk, no ten o’clock sweep, and the Steward’s own appointment', copy.ceo);
  ok(copy.punchFresh > 5 && copy.punchTold === 0, 'a template’s punchline already heard this campaign is passed over while another flaw will do', [copy.punchFresh, copy.punchTold]);
  ok(copy.oddCount > 100 && !copy.oddTruck.length && !copy.oddMacro.length, 'harmless findings fit the department: no truck on a reference letter', [copy.oddCount, copy.oddTruck[0], copy.oddMacro[0]]);

  // The clock, the price of overtime on each difficulty, and RENDER's page.
  const clk = await page.evaluate(async () => {
    const out = {};
    const notes = () => { openRulebook('today'); const t = document.getElementById('modal').textContent; closeModal(); return t; };
    __t.start(false, false); S.day = 9; S.shift = null; prepareShift(); out.close9 = fmtClock(shiftEnd()); S.day = 8; out.close8 = fmtClock(shiftEnd());
    S.difficulty = 'strict'; S.day = 6; out.strict6 = notes(); S.day = 5; out.strict5 = notes();
    S.difficulty = 'relaxed'; S.day = 6; out.relaxed6 = notes();
    S.difficulty = 'strict'; S.day = 6; S.shift = null; prepareShift(); beginShift();
    for (let i = 0; i < 5; i++) { if (i === 4) S.shift.clock = shiftEnd() + 23; await __t.decide(__t.gen('clean'), 'approve'); }
    await __t.until(() => UI.screen === 'screen-report');
    out.strictPay = S.lastReport.summary.otPay;
    out.otLine = (document.querySelector('.ot-line') || {}).textContent || '';
    __t.start(false, false); S.day = 2; S.shift = null; prepareShift(); beginShift();
    const p0 = S.stats.suspicion;
    const r = await __t.decide(STORY_PEOPLE.render1.make(S), 'deny');
    out.render = { pages: S.stats.suspicion - p0, note: r.note, marta: !!S.flags.renderReturnNoted, generic: !!S.flags.softNoted };
    await __t.decide(__t.gen('cruel'), 'deny');
    out.afterCruel = !!S.flags.softNoted;
    out.notes = notes();
    return out;
  });
  ok(clk.close9 === '10:35a' && clk.close8 === '10:35a', 'days 8 and 9 close at 10:35', [clk.close8, clk.close9]);
  ok(/Overtime costs \$38 for every 15 minutes/.test(clk.strict6) && /Overtime costs \$15 for every 15 minutes started and caps the shift at 4 stars \(\$38 and 3 stars from day 6\)/.test(clk.strict5) && /Overtime costs \$15 for every 15 minutes/.test(clk.relaxed6), 'the desk notes give the overtime price for the difficulty being played', [clk.strict6.match(/Overtime[^.]*\./), clk.strict5.match(/Overtime[^.]*\./), clk.relaxed6.match(/Overtime[^.]*\./)]);
  ok(clk.strictPay === 76 && /\$76/.test(clk.otLine), 'Strict overtime is charged at the price the notes give: 23 minutes late is two blocks of $38', [clk.strictPay, clk.otLine]);
  ok(clk.render.pages === 1 && /page/.test(clk.render.note) && clk.render.marta && !clk.render.generic && clk.afterCruel && /RENDER sheet \(\+1 page\)/.test(clk.notes) && /returning one adds a page too/.test(clk.notes), 'returning RENDER costs a page, and the note, Marta and the desk notes all say so', clk.render);

  // The desk calendar: today's months in endless, today inked, and any month a weekday-less source needs.
  const cal = await page.evaluate(() => {
    const out = {};
    const read = () => { openRulebook('cal'); const m = document.getElementById('modal'); const r = { caps: [...m.querySelectorAll('caption')].map((c) => c.textContent), today: [...m.querySelectorAll('td[aria-current="date"]')].map((td) => td.textContent) }; closeModal(); return r; };
    __t.start(true, false); S.day = 60; S.shift = null; prepareShift();
    const d = dayDate(S.day);
    out.endless = Object.assign(read(), { month: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, date: String(d.getUTCDate()) });
    out.endlessFn = calendarMonths(S);
    __t.start(false, false); S.day = 3; S.shift = null; prepareShift();
    out.d3 = Object.assign(read(), { date: String(dayDate(3).getUTCDate()) });
    S.day = 9; S.shift = null; prepareShift(); S.shift.calMonths = ['2031-10', '2032-01'];
    out.extra = read().caps;
    return out;
  });
  ok(cal.endless.caps.length === 2 && cal.endless.caps[0].startsWith(cal.endless.month) && cal.endlessFn.length === 2, 'endless: the calendar shows this month and the next', [cal.endless.caps, cal.endless.month]);
  ok(cal.endless.today.length === 1 && cal.endless.today[0] === cal.endless.date && cal.d3.today.length === 1 && cal.d3.today[0] === cal.d3.date, 'the calendar inks today, and only today', [cal.endless.today, cal.endless.date, cal.d3.today, cal.d3.date]);
  ok(cal.extra.length === 4 && /^October 2031/.test(cal.extra[0]) && /^January 2032/.test(cal.extra[3]), 'a month a weekday-less source needs goes on that day’s calendar, in order', cal.extra);

  // The dated stamp (§19, day 8+): two papers, fair, graded as a forgery; no ink name on Strict's seal.
  const dt = await page.evaluate(async () => {
    __t.start(false, false); S.day = 8; S.shift = null; prepareShift(); beginShift();
    let c = null;
    for (let k = 0; k < 600 && !c; k++) { const x = buildCase({ kind: 'q' }, S, makeRng(k * 11 + 3)); if (x.flaw && x.flaw.kind === 'stampDate') c = x; }
    const parse = (s) => { const [m, d, y] = s.split('/').map(Number); return Date.UTC(y, m - 1, d); };
    const raised = c.docs.find((d) => d.type === 'ask').fields.find((f) => f.k === 'raised');
    const st = c.docs.find((d) => d.type === 'stamp');
    const out = { raised: raised && raised.v, signed: st.fields.find((f) => f.k === 'date').v, note: c.flaw.note, ref: STAMPS[st.key].approver.includes(st.fields.find((f) => f.k === 'by').v), seal: st.seal.color === STAMPS[st.key].color && st.seal.glyph === STAMPS[st.key].glyph };
    out.before = parse(out.signed) < parse(out.raised);
    c.flags = [{ doc: 'stamp', field: 'seal' }];
    const r = await __t.decide(c, 'detain');
    out.grade = [r.outcome, r.pay];
    S.difficulty = 'strict'; out.strict = docHtml(st, c, true);
    S.difficulty = 'standard'; out.standard = docHtml(st, c, true);
    out.statute = POLICIES.find((p) => p.id === '§19');
    S.day = 7; let early = 0;
    for (let k = 0; k < 300; k++) { const x = buildCase({ kind: 'q' }, S, makeRng(k)); if (x.flaw && x.flaw.kind === 'stampDate') early++; if (x.docs[0].fields.some((f) => f.k === 'raised')) early++; }
    out.early = early;
    return out;
  });
  ok(dt.raised && dt.before && dt.ref && dt.seal && /§19/.test(dt.note), 'the dated forgery: right symbol, colour and approver, but stamped before the order was raised, and the note cites §19', dt);
  ok(dt.grade[0] === 'caught' && dt.grade[1] === 35, 'withholding it with the stamp flagged is a catch with the evidence bonus', dt.grade);
  ok(dt.statute && dt.statute.day === 8 && /WITHHOLD/.test(dt.statute.text) && dt.early === 0, '§19 is in force from day 8, and nothing is dated before it', [dt.statute, dt.early]);
  ok(!/ INK</.test(dt.strict) && / INK</.test(dt.standard) && /ink"/.test(dt.strict), 'Strict prints no ink name on the seal (the label still names it); other difficulties print it', [dt.strict.slice(0, 300)]);

  // Damaged saves: every field of a real booth save and a real report save set to each damaging value, then Continue and
  // act. No page error, no desk left busy or empty, no load slower than 3 s.
  const fuzzErrs = errors.length;
  const fz = await page.evaluate(async () => {
    const snap = () => localStorage.getItem('meatproxy.save.auto');
    const bases = {};
    __t.start(false, false);
    S.day = 7; S.money = 300; Object.assign(S.flags, { momPaid: 3, momTier: 3, momSoft: 6, sisterCovered: 5 });
    S.shift = null; prepareShift(); beginShift();
    await __t.until(() => UI.cur && !UI.busy);
    act('draft'); toggleFlag('draft', 'b0'); answerQuestion(UI.cur, 1, S); autosave();
    bases.booth = snap();
    for (let i = 0; i < 5 && UI.screen === 'screen-booth'; i++) {
      await __t.until(() => UI.cur && !UI.busy);
      const before = S.shift.index; finalize(UI.cur.expected || 'approve');
      await __t.until(() => S.shift.index > before && !UI.busy && (UI.cur || UI.screen === 'screen-report'));
    }
    await __t.until(() => UI.screen === 'screen-report');
    bases.report = snap();
    const paths = (o, pre = [], acc = [], depth = 0) => {
      if (depth > 6) return acc;
      if (Array.isArray(o)) { if (o.length) { acc.push(pre.concat(0)); paths(o[0], pre.concat(0), acc, depth + 1); } if (o.length > 1) acc.push(pre.concat(o.length - 1)); return acc; }
      if (o && typeof o === 'object') for (const k of Object.keys(o)) { acc.push(pre.concat(k)); paths(o[k], pre.concat(k), acc, depth + 1); }
      return acc;
    };
    const VALS = [undefined, null, 5, -1, 2.5, 1e9, 'x', [], {}];
    const bad = [];
    let n = 0, played = 0, slowest = 0;
    for (const [name, raw] of Object.entries(bases)) {
      const data = JSON.parse(raw);
      const ps = paths(data).filter((p) => !(p[1] === 'staff' && p[2] > 0) && !(p[1] === 'heard' && p[2] === 'm' && p.length > 3));
      for (const p of ps) for (const v of VALS) {
        n++;
        const d = JSON.parse(raw);
        let o = d; for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
        if (v === undefined) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = JSON.parse(JSON.stringify(v));
        const t = performance.now();
        try {
          if (UI.modalOpen) closeModal();
          S = null; localStorage.setItem('meatproxy.save.auto', JSON.stringify(d)); renderMenu();
          const cont = [...document.querySelectorAll('#menu-buttons .btn')].find((b) => /Continue/.test(b.textContent));
          if (cont) cont.click();
          if (UI.screen === 'screen-booth' && !UI.modalOpen) {
            played++;
            await __t.until(() => UI.cur && !UI.busy, 50);
            if (UI.cur) { act('approve'); if (UI.modalOpen) { const b = [...document.querySelectorAll('#modal .modal-f .btn')].pop(); if (b) b.click(); } }
            await __t.until(() => !UI.busy || UI.screen !== 'screen-booth', 100);
          } else if (UI.screen === 'screen-report' && !UI.modalOpen) { played++; const b = document.getElementById('rep-next'); if (b) b.click(); }
          const stuck = UI.screen === 'screen-booth' && !UI.modalOpen && (UI.busy || !UI.cur);
          const ms = performance.now() - t;
          slowest = Math.max(slowest, ms);
          if (stuck || ms > 3000) bad.push([name, p.join('.'), JSON.stringify(v), stuck ? 'stuck' : 'slow ' + Math.round(ms)]);
        } catch (err) { bad.push([name, p.join('.'), JSON.stringify(v), 'threw ' + err.message]); }
      }
    }
    if (UI.modalOpen) closeModal();
    return { n, played, slowest: Math.round(slowest), bad };
  });
  const fe = errors.slice(fuzzErrs);
  ok(fz.n > 3000 && !fz.bad.length && !fe.length && fz.slowest < 3000, `structural save fuzz: ${fz.n} damaged saves (every field of a booth and a report save, nine values each; ${fz.played} still loaded), no page error, stuck desk or load over 3 s (slowest ${fz.slowest} ms)`, [fz.bad.slice(0, 4), fe.slice(0, 3)]);
  errors.splice(fuzzErrs);
  // Charlie's round-7 shapes, by name: each is filed as damaged, never loaded into a desk that can't move.
  const named = await page.evaluate(() => {
    __t.start(false, false); beginShift();
    const good = JSON.parse(localStorage.getItem('meatproxy.save.auto'));
    const mut = (f) => { const d = JSON.parse(JSON.stringify(good)); f(d.state); return validSave(d); };
    return {
      day: mut((s) => { s.day = 1e9; }), endlessDay: mut((s) => { s.endless = true; s.day = 20000; }), queue: mut((s) => { s.shift.queue = []; }), index: mut((s) => { s.shift.index = 2.5; }),
      clues: mut((s) => { s.shift.current.clues = 'x'; }), usedTpl: mut((s) => { delete s.shift.usedTpl; }), momTier: mut((s) => { s.flags.momTier = 2.5; }), momTier5: mut((s) => { s.flags.momTier = 5; }),
      stars: mut((s) => { s.history = [{ stars: 9 }]; }), irritation: mut((s) => { s.shift.current.irritation = -1; }), look: mut((s) => { s.shift.current.look = []; }), good: validSave(good)
    };
  });
  ok(named.good && Object.entries(named).every(([k, v]) => k === 'good' || v === false), 'day 1e9, endless day 20,000, an empty queue, index 2.5, non-array clues, no usedTpl, tier 2.5 or 5, 9 stars, negative irritation and a broken look are all refused', named);
  await ctx.close();
}

await browser.close();
ok(errors.length === 0, 'no page errors', errors.slice(0, 5));
console.log(`\n${passes} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
