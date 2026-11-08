import { createRequire } from 'module';
const require = createRequire(process.env.PW_HOME || '/tmp/shades-harness/package.json');
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'file:///Users/andreitoev/code/meat-proxies/meat-proxy/index.html';
const errors = [];
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
async function run(viewport, label, days, shotsAt) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 600, isMobile: viewport.width < 600 });
  await ctx.addInitScript(() => { try { localStorage.setItem('meatproxy.settings.v1', JSON.stringify({ textSpeed: 'instant', tips: true, music: 0, sfx: 0, ambience: 0, master: 0 })); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${label}] console: ${m.text()}`); });
  await page.goto(url);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/lc-test/mp-shots/${label}-menu.png` });
  await page.click('#menu-buttons .btn:has-text("New contract")');
  await page.click('#btn-begin');
  await page.click('#btn-intro-go');
  const screen = () => page.evaluate(() => UI.screen);
  let shot = 0, items = 0, guard = 0, endingSeen = null;
  const outcomes = {};
  while (guard++ < 2500) {
    const sc = await screen();
    if (sc === 'screen-scene') {
      const choice = await page.$('#scene-choices .btn:not(.primary):not([disabled])');
      if (choice) await choice.click(); else await page.click('#scene-choices .btn.primary');
      await page.waitForTimeout(20);
      if (shotsAt.includes('scene') && !shot++) await page.screenshot({ path: `/tmp/lc-test/mp-shots/${label}-scene.png` });
      continue;
    }
    if (sc === 'screen-booth') {
      const st = await page.evaluate(() => ({ cur: !!UI.cur, busy: UI.busy, modal: UI.modalOpen, exp: UI.cur && UI.cur.expected, tip: !document.getElementById('tip').hidden, day: S.day }));
      if (st.tip) { await page.click('#tip-next').catch(() => {}); continue; }
      if (st.modal) {
        const refuse = await page.$('#modal .modal-f .btn:has-text("Refuse")');
        const q = await page.$('#modal .modal-f .btn:has-text("Withhold")');
        if (refuse) await refuse.click(); else if (q) await q.click(); else await page.click('#modal-x');
        continue;
      }
      if (!st.cur || st.busy) { await page.waitForTimeout(150); continue; }
      for (const id of ['#a-passport', '#a-id', '#a-travel', '#a-luggage']) await page.click(id);
      await page.evaluate(() => { const b = document.querySelector('#desk-body [data-ex]'); if (b) b.click(); });
      await page.click('#a-ask');
      await page.evaluate(() => { const b = document.querySelector('#qpanel .btn'); if (b) b.click(); });
      if (items === 1 && shotsAt.includes('booth')) { await page.waitForTimeout(300); await page.screenshot({ path: `/tmp/lc-test/mp-shots/${label}-booth-d${st.day}.png` }); }
      if (items === 2 && shotsAt.includes('desk')) { await page.click('#a-travel'); await page.waitForTimeout(200); await page.screenshot({ path: `/tmp/lc-test/mp-shots/${label}-desk.png` }); }
      const btn = { approve: '#a-approve', deny: '#a-deny', detain: '#a-detain' }[st.exp] || '#a-approve';
      await page.click(btn);
      items++;
      outcomes[st.exp] = (outcomes[st.exp] || 0) + 1;
      await page.waitForTimeout(80);
      continue;
    }
    if (sc === 'screen-report') {
      const d = await page.evaluate(() => S.day);
      if (shotsAt.includes('report') && d === 1) await page.screenshot({ path: `/tmp/lc-test/mp-shots/${label}-report.png`, fullPage: false });
      const stars = await page.evaluate(() => S.lastReport.summary.stars);
      outcomes['stars_d' + d] = stars;
      if (d >= days && days < 10) break;
      await page.click('#rep-next');
      continue;
    }
    if (sc === 'screen-ending') { endingSeen = await page.evaluate(() => S.ending); await page.screenshot({ path: `/tmp/lc-test/mp-shots/${label}-ending.png` }); break; }
    await page.waitForTimeout(100);
  }
  const fin = await page.evaluate(() => ({ day: S.day, money: S.money, rep: S.rep, affected: S.affected, stats: S.stats, acc: S.totals }));
  console.log(label, 'items', items, 'ending', endingSeen, JSON.stringify(outcomes), JSON.stringify(fin));
  await ctx.close();
}
await run({ width: 1280, height: 800 }, 'desk', 10, ['booth', 'desk', 'report', 'scene']);
await run({ width: 390, height: 844 }, 'phone', 1, ['booth', 'desk', 'scene', 'report']);
await run({ width: 360, height: 640 }, 'small', 1, ['booth', 'desk']);
await run({ width: 844, height: 390 }, 'land', 1, ['booth', 'desk']);
// Day 5+ puts the Oversight button in the top bar: no phone width may scroll sideways, in a normal shift or a heavy one
// (overtime clock, a big balance, a thick file).
for (const [w, h] of [[320, 568], [360, 640], [375, 667], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('meatproxy.settings.v1', JSON.stringify({ textSpeed: 'instant', tips: false, music: 0, sfx: 0, ambience: 0, master: 0 })); } catch (e) {} });
  const page = await ctx.newPage();
  const label = `overflow${w}`;
  page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
  await page.goto(url);
  await page.waitForSelector('#menu-buttons .btn');
  await page.evaluate(() => { newOpts.endless = false; newOpts.tutorial = false; newGame(); S.day = 5; S.shift = null; S.phase = 'brief'; startDay(); });
  for (let i = 0; i < 60 && (await page.evaluate(() => UI.screen)) === 'screen-scene'; i++) {
    const bt = await page.waitForSelector('#scene-choices .btn:not([disabled])', { timeout: 2000 }).catch(() => null);
    if (bt) await bt.click().catch(() => {});
    await page.waitForTimeout(40);
  }
  await page.waitForFunction(() => UI.screen === 'screen-booth' && UI.cur && !UI.busy, null, { timeout: 8000 });
  const measure = () => page.evaluate(() => {
    const bar = document.querySelector('#screen-booth .topbar');
    const right = Math.max(...[...bar.children].filter((e) => !e.hidden && e.getBoundingClientRect().width).map((e) => e.getBoundingClientRect().right));
    return { watch: !document.getElementById('btn-bulletin').hidden, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bar: bar.scrollWidth - bar.clientWidth, right: Math.round(right) };
  });
  const normal = await measure();
  await page.evaluate(() => { S.shift.clock = shiftEnd() + 37; S.money = 1250; S.stats.suspicion = 11; renderTop(); });
  const heavy = await measure();
  for (const [k, m] of [['normal', normal], ['heavy', heavy]]) {
    if (!m.watch || m.sw > m.cw || m.bar > 0 || m.right > m.cw) errors.push(`[${label}] day-5 top bar overflows (${k}): ${JSON.stringify(m)}`);
  }
  console.log(label, 'day 5', JSON.stringify({ normal, heavy }));
  await ctx.close();
}
await browser.close();
console.log('ERRORS', errors.length); errors.slice(0, 20).forEach((e) => console.log(e));
