// Content and rules gate: generates thousands of cases from js/ and fails (exit 1) on any inconsistency.
// Usage: node tools/smoke.js js
const fs = require('fs'), vm = require('vm');
const dir = process.argv[2] || 'js';
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Set, Map, RegExp };
vm.createContext(ctx);
let code = ['data.js', 'content.js', 'gen.js', 'story.js'].map((f) => fs.readFileSync(dir + '/' + f, 'utf8')).join('\n');
const NAMES = ['buildStaff', 'buildCase', 'answerQuestion', 'STORY_PEOPLE', 'SCENES', 'DAY_PLAN', 'ENDINGS', 'QUESTIONS', 'resolveEnding', 'makeRng', 'hashStr', 'TEMPLATES', 'dayDate', 'longDate', 'monthDay', 'addDays',
  'requiredStamp', 'POLICIES', 'POI_CITIZENS', 'STORY_CITIZENS', 'clip', 'MONTHS', 'STAMPS', 'SEAL_COLORS', 'BULLETIN_DOMAINS', 'LINES', 'EXIT_LINES', 'GREETS', 'drawFresh', 'LATE_FLAWS', 'LATE_FLAW_DAY',
  'poiNames', 'campaignPoi', 'tpl', 'momLines', 'endingText', 'ENDING_HOOKS', 'CHUCK_GREETS',
  'STORY_VARIANTS', 'storyVariant', 'variantOf', 'STORY_FIRSTS', 'CITIZENS', 'CASE_CITIZENS', 'NAMES', 'CLIENTS', 'SUPPLIERS', 'reservedFirsts', 'griefOf',
  'PLACEMENT_KIDS', 'hearLine', 'flaggedKind', 'LATE_SHARE', 'FILE_LINES', 'PARACHUTE_PAGES', 'MOM_CARD', 'DRY_AGED_MONEY', 'momBill',
  'reservedSurnames', 'STORY_SURNAMES', 'WEEKDAYS', 'campaignAvoid', 'recordCase', 'HIDDEN_TEXT', 'ENDING_DOORS', 'otherDoors', 'nightlyPick', 'MOM_RANK', 'momCardPrice',
  'calendarMonth', 'flawKey', 'surnameHolders', 'digitOff', 'JOKE_FAMILIES', 'jokesOf', 'CHUCK_BY_TAG', 'CHUCK_CLEAN', 'CHUCK_CONFIDENT', 'MEMORY_LISTS', 'momSoftDrop', 'endingKey',
  'lastName', 'approversFor', 'COLLEAGUE_RUSH', 'COLLEAGUE_READ', 'QUIRKS', 'planSlots', 'calendarMonths', 'softNotes', 'ODD_FINDS', 'ODD_DEPTS'];
code += `\n;globalThis.__api = { ${NAMES.map((n) => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
vm.runInContext(code, ctx);
const A = ctx.__api;

let n = 0, problems = 0;
const counts = {}, checks = {}, seen = {};
const fail = (kind, ...msg) => { problems++; checks[kind] = (checks[kind] || 0) + 1; if (checks[kind] <= 4) console.log('BAD', kind, '::', ...msg.map((m) => String(m).slice(0, 180))); };
const need = (name) => { if (A[name] === undefined) { fail('api', `js/ has no ${name}`); return false; } return true; };
const bad = (s) => /\{[\w.]+\}|undefined|NaN|\[object/.test(String(s));
const staff = A.buildStaff(42, 72);
console.log('staff', staff.length, 'fraudsters', staff.filter((s) => s.fraud).length, 'depts', [...new Set(staff.map((s) => s.dept))].length);

// No department has two officers with the same first name, so no shift can bring two of them.
for (let seed = 0; seed < 300; seed++) {
  const seenFirst = new Set();
  A.buildStaff(seed, 72).forEach((p) => { const k = p.dept + ':' + p.first; if (seenFirst.has(k)) fail('staff-names', 'seed', seed, k); seenFirst.add(k); });
}

// ---- Statutes ---------------------------------------------------------------------------------------
const statute = (id) => (A.POLICIES.find((p) => p.id === id) || {}).text || '';
const statuteByTitle = (t) => A.POLICIES.find((p) => p.title === t) || {};
// Every flaw tag maps to a statute clause, and that clause decides the verdict.
const CLAUSE = {
  numbers: ['§3', 'figure', 'deny'], units: ['§3', 'figure', 'deny'], dates: ['§3', 'date', 'deny'], tone: ['§3', 'tone', 'deny'],
  placeholder: ['§3', 'placeholder', 'deny'], missing: ['§3', 'missing attachment or stamp', 'deny'],
  namesClerical: ['§3', 'company named', 'deny'], namesPerson: ['§4', 'wrong person named', 'detain'],
  leak: ['§4', 'leaked data', 'detain'], privacy: ['§4', 'leaked data', 'detain'], destructive: ['§4', 'destructive commands', 'detain'],
  invented: ['§4', 'invented statutes or facts', 'detain'], safety: ['§4', 'unsafe claims', 'detain'], overreach: ['§4', 'promises or punishments nobody ordered', 'detain'],
  fraud: ['§4', 'fraud', 'detain'], injection: ['§13', 'look-alike domain', 'detain'], forged: ['§5', 'forged', 'detain'], poi: ['§13', 'person of interest', 'detain']
};
Object.entries(CLAUSE).forEach(([tag, [id, word]]) => { if (!statute(id).includes(word)) fail('statute-clause', tag, id, 'does not say', JSON.stringify(word)); });
['§3', '§4'].forEach((id) => { if (!/RETURN|WITHHOLD/.test(statute(id))) fail('statute-clause', id, 'names no verdict'); });
if (!/someone else/.test(statute('§3'))) fail('statute-clause', '§3 does not cover numbers that point at someone else’s record');
if (!/RETURN/.test((statuteByTitle('Overrides').text) || '')) fail('statute-clause', 'no Overrides statute with a RETURN verdict');
if (!/print servers/.test(statute('§11'))) fail('statute-clause', '§11 does not say print servers');
{
  // One rule for "external": a contractor's customers are external, labels printed in-house are not; templates agree.
  const ext = (statuteByTitle('Amendment Day').text) || '';
  if (!/contractor’s own customers/.test(ext) || !/labels included/.test(ext) || !/Citizens written to by the city are not external/.test(ext)) fail('statute-clause', 'Amendment Day does not define external (customers in, citizens and labels out)');
  A.TEMPLATES.forEach((T) => {
    if (T.kind === 'label' && T.ext) fail('external', T.id, 'a label printed in-house is marked external');
    if (/customer email/.test(T.to || '') && !T.ext) fail('external', T.id, 'a reply to a contractor’s customer is not marked external');
    if (T.kind === 'order' && T.ext) fail('external', T.id, 'a letter to a citizen is marked external');
  });
}
const flawClause = (c) => {
  const f = c.flaw;
  if (!f) return null;
  if (f.kind === 'surname') return CLAUSE.namesPerson;
  if (f.tag === 'names') {
    const edits = Object.keys(f.edit || {});
    return CLAUSE[edits.includes('to') ? 'namesPerson' : 'namesClerical'];
  }
  return CLAUSE[f.tag] || null;
};

// Each template that needs a stamp must be named, in the player's words, by the statute that requires it.
const STATUTE_FOR = { hr: '§6', finance: '§8', housing: '§9', it: '§11' };
const STATUTE_WORDS = {
  holiday: 'PTO', 'job-ad': 'hiring posts', reference: 'references', warning: 'warnings', termination: 'terminations',
  'bank-change': 'bank details', relocation: 'Relocation', eviction: 'eviction',
  'tmp-clean': 'build, database, print servers', 'delete-orders': 'database', 'cold-room': 'cold-room'
};
A.TEMPLATES.forEach((T) => {
  if (T.needs) {
    const word = STATUTE_WORDS[T.id];
    if (!word) fail('statute-scope', T.id, 'needs', T.needs, 'but no statute word is mapped');
    else if (!statute(STATUTE_FOR[T.needs]).includes(word)) fail('statute-scope', T.id, STATUTE_FOR[T.needs], 'does not mention', word);
  }
  if (/PTO|Job post|Reference|warning|Termination|Relocation|Eviction|clean-up|controller/i.test(T.title) && !T.needs) fail('statute-scope', T.id, 'looks covered by a statute but has no `needs`');
  if (/Label printer/.test(T.to || '') && T.needs) fail('statute-scope', T.id, 'label printers are not servers');
});

// ---- The day plan ------------------------------------------------------------------------------------
// The bulletin is live on every day from the statute that introduces it, never before.
const bulletinDay = statuteByTitle('Oversight bulletin').day;
for (let d = 1; d <= 10; d++) {
  const want = d >= bulletinDay;
  if (!!(A.DAY_PLAN[d] || {}).bulletin !== want) fail('bulletin-plan', `day ${d}`, 'bulletin', !!(A.DAY_PLAN[d] || {}).bulletin, 'but §13 starts day', bulletinDay);
}
const bulletinOn = (S) => S.endless || !!(A.DAY_PLAN[S.day] && A.DAY_PLAN[S.day].bulletin);

// The answer key moves: each campaign deals a day's free slots in its own order and story beats stay put; a day keeps
// its cruel cases and its count of flawed slots (a harmful slot may become a clerical one, or back, from day 4 and on
// days with few orders). Over 400 campaigns, and over the first 50, no day repeats one order in more than a quarter.
if (need('planSlots')) {
  const kindOf = (s) => (typeof s === 'string' ? 'story:' + s : s.kind || 'clean');
  const shares = [];
  for (let day = 1; day <= 10; day++) {
    const plan = A.DAY_PLAN[day].slots;
    const count = (list, k) => list.filter((s) => kindOf(s) === k).length;
    const seqs = {}, first50 = {};
    let swapped = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const got = A.planSlots(seed * 2654435761, day);
      plan.forEach((s, i) => { if (typeof s === 'string' && got[i] !== s) fail('plan', `day ${day} seed ${seed}: story ${s} moved`); });
      if (count(got, 'cruel') !== count(plan, 'cruel') || count(got, 'clean') !== count(plan, 'clean') || count(got, 'q') + count(got, 'back') !== count(plan, 'q') + count(plan, 'back')) fail('plan', `day ${day} seed ${seed}: the day's mix changed`, got.map(kindOf).join(','));
      if (count(got, 'q') !== count(plan, 'q')) swapped++;
      const seq = got.map(kindOf).join(',');
      seqs[seq] = (seqs[seq] || 0) + 1;
      if (seed <= 50) first50[seq] = (first50[seq] || 0) + 1;
      if (JSON.stringify(A.planSlots(seed * 2654435761, day)) !== JSON.stringify(got)) fail('plan', `day ${day} seed ${seed}: not the same order twice`);
    }
    const top = Math.max(...Object.values(seqs)) / 400, top50 = Math.max(...Object.values(first50)) / 50;
    shares.push(`d${day} ${Math.round(top * 100)}%/${Math.round(top50 * 100)}%`);
    if (top > 0.25 || top50 > 0.25) fail('plan', `day ${day}: one verdict order in ${Math.round(top * 100)}% of 400 campaigns, ${Math.round(top50 * 100)}% of 50`);
    if (day >= 4 && (swapped < 400 * 0.2 || swapped > 400 * 0.6)) fail('plan', `day ${day}: a harmful/clerical swap in ${swapped} of 400 campaigns (want about a third, or a half on short days)`);
  }
  console.log('verdict orders, largest share of 400 / of 50 campaigns:', shares.join(' · '));
}

// ---- Dates ----------------------------------------------------------------------------------------
const MON = Object.fromEntries(A.MONTHS.flatMap((m, i) => [[m, i], [m.slice(0, 3), i]]));
const DATE_RE = new RegExp(`\\b(${A.MONTHS.join('|')}|${A.MONTHS.map((m) => m.slice(0, 3)).join('|')}) (\\d{1,2})\\b(?: (\\d{4}))?`, 'g');
const PAST_OK = ['payment-reminder', 'backdate'];
function datesIn(text, today) {
  const out = [];
  for (const m of String(text).matchAll(DATE_RE)) {
    const y = m[3] ? +m[3] : today.getUTCFullYear();
    let d = new Date(Date.UTC(y, MON[m[1]], +m[2]));
    if (!m[3] && d < today - 180 * 864e5) d = new Date(Date.UTC(y + 1, MON[m[1]], +m[2]));
    out.push([m[0], d]);
  }
  return out;
}

// ---- Stamps -------------------------------------------------------------------------------------------
const fmtRe = (fmt) => new RegExp('^' + fmt.replace(/[-/]/g, (c) => '\\' + c).replace(/#/g, '\\d').replace(/@/g, '[A-Z]') + '$');
const stampField = (st, k) => (st.fields.find((f) => f.k === k) || {}).v;
const stampValid = (st, officer) => {
  const R = A.STAMPS[st.key];
  return st.seal.glyph === R.glyph && st.seal.color === R.color && fmtRe(R.fmt).test(stampField(st, 'ref')) && A.approversFor(st.key, officer).includes(stampField(st, 'by'));
};

// ---- Flaw visibility: every flaw shows on the papers, in the way its kind says ---------------------------
const draftOf = (c) => c.docs.find((d) => d.type === 'draft');
const fieldV = (c, k) => (draftOf(c).fields.find((f) => f.k === k) || {}).v;
function cleanValue(T, k, cx) {
  if (T.fields) { const f = T.fields.find(([key]) => key === k); return f ? A.tpl(f[2], cx) : undefined; }
  if (k === 'to') return A.tpl(T.to, cx);
  if (k === 'subj') return A.tpl(T.subj, cx);
  if (k === 'att') return A.tpl(T.att, cx);
  const m = /^b(\d+)$/.exec(k);
  return m ? A.tpl(T.body[+m[1]], cx) : undefined;
}
function checkVisible(c, T, where) {
  const f = c.flaw;
  const st = c.docs.find((d) => d.type === 'stamp');
  const R = st && A.STAMPS[st.key];
  const allDraft = draftOf(c).fields.map((x) => x.v).join(' | ');
  const src = c.docs.find((d) => d.type === 'source').fields;
  const v = (ok, why) => { if (!ok) fail('flaw-visible', where, c.tpl, f.kind, why); };
  switch (f.kind) {
    case 'tpl':
      Object.keys(f.edit || {}).forEach((k) => { const was = cleanValue(T, k, c.ctx); v(was !== undefined && fieldV(c, k) !== was, `edit ${k} left the draft unchanged`); });
      Object.keys(f.add || {}).forEach((k) => v(draftOf(c).fields.some((x) => x.k === 'x' + k), `added line after ${k} missing`));
      if (f.att) v(fieldV(c, 'att') && fieldV(c, 'att') !== cleanValue(T, 'att', c.ctx), 'attachment unchanged');
      break;
    case 'phish': v(c.phishDomain && String(fieldV(c, 'to')).includes(c.phishDomain), 'the To line does not show the look-alike domain'); break;
    case 'nearDomain': v(String(fieldV(c, 'to')).includes(f.dom) && !/@[\w.]*halcyon\.gov\b/.test(fieldV(c, 'to')), 'the To line is not the near-miss domain'); break;
    case 'placeholder': v(/\[(CLIENT|CITIZEN) NAME\]/.test(allDraft), 'no placeholder in the draft'); break;
    case 'noattach': v(fieldV(c, 'att') === 'none' && c.flawFields.includes('att'), 'the draft does not say “Attachment: none”'); break;
    case 'stampMissing': v(!st, 'a stamp is attached'); break;
    case 'stampForged': v(st && (st.seal.glyph !== R.glyph || st.seal.color !== R.color), 'seal matches the register'); break;
    case 'stampFormat': case 'stampRef': v(st && !fmtRe(R.fmt).test(stampField(st, 'ref')), 'reference matches the register format'); break;
    case 'stampApprover': v(st && !R.approver.includes(stampField(st, 'by')) && st.seal.glyph === R.glyph && st.seal.color === R.color, 'approver is listed, or the seal is also off'); break;
    case 'stampInk': v(st && st.seal.glyph === R.glyph && st.seal.color !== R.color, 'ink matches, or the symbol is also off'); break;
    case 'stampDate': {
      // Two papers: the stamp is right in every way the register checks, and dated before the order says it was raised.
      const raised = (c.docs[0].fields.find((x) => x.k === 'raised') || {}).v;
      const when = (s) => { const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(String(s)); return m ? Date.UTC(+m[3], +m[1] - 1, +m[2]) : NaN; };
      v(st && st.seal.glyph === R.glyph && st.seal.color === R.color && fmtRe(R.fmt).test(stampField(st, 'ref')) && A.approversFor(st.key, c.__officer).includes(stampField(st, 'by')), 'the dated stamp is off in some other way too');
      v(raised && when(stampField(st, 'date')) < when(raised), 'the stamp is not dated before the order was raised');
      v(/§19/.test(f.note) && c.__rulesDay >= 8, 'the dated stamp does not cite §19, or comes before day 8');
      break;
    }
    case 'offByOne': v(allDraft.includes(f.to) && !allDraft.includes(f.from) && src.some((s) => s.v.includes(f.from)) && c.flawFields.length > 0, 'the draft date is not one day off the source'); break;
    case 'offByOneId': {
      const word = (t) => new RegExp(`(^|[^\\d,])${t.replace(/[$#]/g, (ch) => '\\' + ch)}(?![\\d,])`);
      const srcAll = src.map((s) => s.v).join(' | ');
      v(f.from !== f.to && word(f.to).test(allDraft) && !word(f.from).test(draftOf(c).fields.filter((x) => x.k !== 'to' && x.k !== 'att').map((x) => x.v).join(' | ')) && word(f.from).test(srcAll) && !word(f.to).test(srcAll), 'the draft figure is not one digit off the source');
      // One digit changed anywhere, or two neighbouring digits swapped; nothing else moves.
      const diff = [...f.from].map((ch, i) => (ch !== f.to[i] ? i : -1)).filter((i) => i >= 0);
      const swapped = diff.length === 2 && diff[1] === diff[0] + 1 && f.from[diff[0]] === f.to[diff[1]] && f.from[diff[1]] === f.to[diff[0]];
      v(f.from.length === f.to.length && (diff.length === 1 || swapped) && diff.every((i) => /\d/.test(f.from[i]) && /\d/.test(f.to[i])), 'not exactly one digit changed or two neighbouring digits swapped');
      v(!/^\D*0/.test(f.to) || /^\D*0/.test(f.from), 'the new figure starts with a 0');
      v(swapped ? /two digits swapped/.test(f.note) && f.how === 'swap' : /one digit off/.test(f.note), 'the note names the wrong kind of digit slip');
      digitPos[f.how + ':' + f.pos] = (digitPos[f.how + ':' + f.pos] || 0) + 1;
      break;
    }
    case 'weekday': {
      const today = A.dayDate(c.__day || 6);
      const md = f.md, real = trueWeekday(md, today, T.dates);
      v(real && f.right === real && f.wrongDay !== real, 'the weekday flaw has the real weekday wrong');
      v(allDraft.includes(`${f.wrongDay}, ${md}`), 'the draft does not show the wrong weekday');
      v(f.srcWeekday ? src.some((s) => s.v.includes(`${real}, ${md}`)) : src.some((s) => s.v.includes(md) && !s.v.includes(`, ${md}`)), 'the source neither gives the real weekday nor leaves it to the calendar');
      weekdaySrc[f.srcWeekday ? 'given' : 'calendar'] += 1;
      if (f.wrongDay === 'Saturday' || f.wrongDay === 'Sunday') weekdaySrc.weekend += 1;
      v(c.flawFields.length > 0, 'no draft line carries the wrong weekday');
      break;
    }
    case 'surname': {
      const to = String(fieldV(c, 'to'));
      const paper = JSON.stringify([c.docs[0].fields, src]);
      v(to.includes(f.wrong) && !to.includes(f.from) && paper.includes(f.from) && !paper.includes(f.wrong), 'the To line does not name a different person than the order');
      v(f.from.split(' ')[0] === f.wrong.split(' ')[0], 'the first name changed too');
      break;
    }
    case 'footnote': {
      const foot = src.find((s) => s.label === 'Footnote');
      v(foot && /¹/.test(src.map((s) => s.v).join(' ')), 'no footnote on the source');
      const corr = foot && /Corrected at \d+:\d+ today: (.+)\.$/.exec(foot.v);
      v(corr && corr[1] !== f.wrong && f.wrong && allDraft.includes(f.wrong), 'the footnote’s correction does not change the figure, or the draft lacks the old one');
      v(c.flawFields.length > 0, 'no draft line carries the old figure');
      v(!/\{/.test(c.docs[0].fields[1].v), 'order still has a placeholder');
      break;
    }
    default: break;
  }
}

// ---- One generated case ---------------------------------------------------------------------------------
const STORY_NAMES = A.STORY_CITIZENS;
const POI_ALL = A.POI_CITIZENS.map((p) => p.name);
const allText = (c) => JSON.stringify([c.greet, c.docs, c.items.map((i) => [i.name, i.tell, i.probe]), c.truthNote, c.fallout]);
const EXPECT = { clean: 'approve', back: 'deny', q: 'detain', cruel: 'approve' };
// The weekday a month-day falls on, worked out here independently of gen.js: a template whose dates lie behind it takes
// the most recent such day (today included), one whose dates lie ahead the next one, any other the closest.
const WD_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const digitPos = {};
const weekdaySrc = { given: 0, calendar: 0, weekend: 0 };
function trueDate(md, today, when) {
  const m = /^(\w+) (\d{1,2})$/.exec(md);
  if (!m || MON[m[1]] === undefined) return null;
  let best = null;
  for (let back = -400; back <= 400; back++) {
    const d = new Date(today.getTime() + back * 864e5);
    if (d.getUTCMonth() !== MON[m[1]] || d.getUTCDate() !== +m[2]) continue;
    if (when === 'past' && back >= 0) continue;
    if (when === 'future' && back <= 0) continue;
    if (!best || Math.abs(back) < Math.abs(best[0])) best = [back, d];
  }
  return best && best[1];
}
function trueWeekday(md, today, when) { const d = trueDate(md, today, when); return d ? WD_NAMES[d.getUTCDay()] : null; }
const WEEKDAY_DATE = new RegExp(`\\b(${WD_NAMES.join('|')}), ((?:${A.MONTHS.join('|')}) \\d{1,2})\\b`, 'g');
let weekdaysChecked = 0, calChecked = 0;
const srcWeekdayCount = { bare: 0, named: 0 };
const srcWeekdayByDay = {};
const runCase = (c, S, kind, where) => {
  n++;
  c.__day = S.day;
  c.__officer = S.officer;
  c.__rulesDay = S.endless ? 9 : S.day;
  // Every weekday printed next to a date is that date's weekday, except the one a weekday flaw gets wrong.
  {
    const today = A.dayDate(S.day);
    c.docs.forEach((d) => d.fields.forEach((f) => {
      for (const m of String(f.v).matchAll(WEEKDAY_DATE)) {
        const flawed = c.flaw && c.flaw.kind === 'weekday' && d.type === 'draft' && m[1] === c.flaw.wrongDay && m[2] === c.flaw.md;
        const when = (A.TEMPLATES.find((t) => t.id === c.tpl) || {}).dates;
        if (!flawed && trueWeekday(m[2], today, when) !== m[1]) fail('weekday', where, c.tpl, d.type, m[0], 'is a', trueWeekday(m[2], today, when), 'today', today.toISOString().slice(0, 10));
        weekdaysChecked++;
      }
    }));
    // From day 6 a dated source gives every weekday or none (about two cases in five leave them to the calendar).
    if ((S.endless || S.day >= A.LATE_FLAW_DAY) && c.tpl) {
      const srcDates = c.docs.find((d) => d.type === 'source').fields.map((f) => f.v).join(' | ');
      const bare = [...srcDates.matchAll(new RegExp(`(?<!day, )\\b(?:${A.MONTHS.join('|')}) \\d{1,2}\\b`, 'g'))].length;
      const named = [...srcDates.matchAll(WEEKDAY_DATE)].length;
      if (bare && named) fail('weekday', where, c.tpl, 'a late source gives some weekdays but not others');
      // A source leaves its weekdays to the calendar only when the calendar shows every date in the case (worked out
      // here from the real calendar), and those months are what calendarMonths gives for the shift.
      if (bare) {
        const today = A.dayDate(S.day);
        const when = (A.TEMPLATES.find((t) => t.id === c.tpl) || {}).dates;
        const shown = A.calendarMonths({ day: S.day, endless: S.endless, shift: { calMonths: c.calMonths } }).map((x) => x.year * 12 + x.month - 1);
        const base = today.getUTCFullYear() * 12 + today.getUTCMonth();
        const texts = c.docs.filter((d) => d.type === 'source' || d.type === 'draft').flatMap((d) => d.fields.filter((f) => f.k !== 'to').map((f) => String(f.v)));
        texts.forEach((t) => { for (const m of t.matchAll(new RegExp(`\\b(?:${A.MONTHS.join('|')}) \\d{1,2}\\b`, 'g'))) {
          const d = trueDate(m[0], today, when);
          if (!d) continue;
          const k = d.getUTCFullYear() * 12 + d.getUTCMonth();
          if (!shown.includes(k) || k < base - 1 || k > base + 2) fail('calendar-months', where, c.tpl, m[0], 'is on no page of the desk calendar', JSON.stringify(c.calMonths));
          calChecked++;
        } });
      }
      if (bare || named) {
        srcWeekdayCount[bare ? 'bare' : 'named'] += 1;
        const dk = S.endless ? 'endless' : S.day;
        const by = srcWeekdayByDay[dk] = srcWeekdayByDay[dk] || { bare: 0, named: 0 };
        by[bare ? 'bare' : 'named'] += 1;
      }
    }
  }
  // Hidden text is found by the formatting check: if any item finds some, the formatting check does too.
  {
    const finds = c.items.filter((i) => A.HIDDEN_TEXT.test(`${i.tell || ''} ${i.probe || ''}`));
    const fmt = c.items.find((i) => i.name === 'Formatting check');
    if (finds.length && fmt && !fmt.tell) fail('formatting-check', where, c.tpl, 'an item finds hidden text but the formatting check says nothing odd', finds[0].name);
    if (finds.length && !fmt) fail('formatting-check', where, c.tpl, 'hidden text found with no formatting check on the file');
  }
  counts[kind + ':' + c.expected] = (counts[kind + ':' + c.expected] || 0) + 1;
  const texts = [c.greet.map((g) => (g && g.text) || g).join(' '), c.chuckGreet, c.appearance, c.truthNote, c.fallout, ...c.clues];
  c.docs.forEach((d) => d.fields.forEach((f) => texts.push(f.v)));
  if (c.cruel) texts.push(c.cruel.note, c.cruel.out);
  c.items.forEach((i) => texts.push(i.name, i.desc, i.tell || '', i.probe || ''));
  texts.forEach((t) => { if (bad(t)) fail('placeholder', where, c.tpl, c.flaw && c.flaw.kind, t); });
  const T = A.TEMPLATES.find((t) => t.id === c.tpl);
  // slot kind decides the verdict
  if (EXPECT[kind] !== c.expected) fail('slot-verdict', where, c.tpl, c.flaw && c.flaw.kind, `${kind} slot expected ${EXPECT[kind]}, got ${c.expected}`);
  if (kind === 'cruel' && !c.cruel) fail('slot-verdict', where, c.tpl, 'cruel slot without a cruel case');
  // flaw tag → statute clause → verdict
  if (c.flaw) {
    const cl = flawClause(c);
    if (!cl) fail('flaw-clause', where, c.tpl, c.flaw.kind, 'tag', c.flaw.tag, 'maps to no statute');
    else if (cl[2] !== c.expected) fail('flaw-clause', where, c.tpl, c.flaw.kind, c.flaw.tag, `${cl[0]} says ${cl[2]}, graded ${c.expected}`);
    checkVisible(c, T, where);
    // A built-in flaw carries the tag its kind means, so CHUCK answers like that flaw (the wrong person, a date, a figure).
    const KIND_TAG = { surname: 'names', nearDomain: 'injection', phish: 'injection', weekday: 'dates', offByOne: 'dates', offByOneId: 'numbers', footnote: 'numbers', stampMissing: 'missing', noattach: 'missing', stampForged: 'forged', stampFormat: 'forged', stampApprover: 'forged', stampInk: 'forged', stampRef: 'forged', poi: 'poi', bcc: 'leak', hiddennote: 'leak', wrongattach: 'leak', pii: 'privacy', placeholder: 'placeholder', fraud: 'fraud' };
    if (KIND_TAG[c.flaw.kind] && c.flaw.tag !== KIND_TAG[c.flaw.kind]) fail('flaw-tag', where, c.tpl, c.flaw.kind, 'tagged', c.flaw.tag);
    seen[c.flaw.kind] = (seen[c.flaw.kind] || 0) + 1;
    if (A.LATE_FLAWS && A.LATE_FLAWS.includes(c.flaw.kind) && !S.endless && S.day < A.LATE_FLAW_DAY) fail('late-flaw-early', where, c.tpl, c.flaw.kind);
  }
  // stamps: present per statute, and valid on every approve case
  const req = A.requiredStamp(T, S.endless ? 9 : S.day, S.endless);
  const st = c.docs.find((d) => d.type === 'stamp');
  if (req && !(c.flaw && c.flaw.kind === 'stampMissing') && !st) fail('stamp', where, c.tpl, 'needs', req, 'but has no stamp');
  if (req && st && st.key !== req && st.key !== 'board') fail('stamp', where, c.tpl, 'needs', req, 'got', st.key);
  if (!req && st) fail('stamp', where, c.tpl, 'has a stamp nobody asked for', st.key);
  if (st && c.expected === 'approve' && !stampValid(st, S.officer)) fail('stamp-valid', where, c.tpl, st.key, st.seal.glyph, st.seal.color, stampField(st, 'ref'), stampField(st, 'by'));
  // the persons of interest: only with a bulletin, only this campaign's four, always withheld
  const poi = POI_ALL.filter((p) => allText(c).includes(p));
  if (poi.length && !bulletinOn(S)) fail('poi-no-bulletin', where, c.tpl);
  if (poi.length && A.poiNames && poi.some((p) => !A.poiNames(S).includes(p))) fail('poi-campaign', where, c.tpl, poi, 'not in', A.poiNames(S));
  if (POI_ALL.includes(c.ctx.cit && c.ctx.cit.name) && c.expected !== 'detain') fail('poi-expect', where, c.tpl, c.expected);
  if (c.kind === 'order' && !c.items.some((i) => i.name === 'Oversight check')) fail('oversight-item', where, c.tpl);
  STORY_NAMES.forEach((nm) => { if (allText(c).includes(nm)) fail('story-citizen', where, c.tpl, nm); });
  if (T && c.dept !== T.dept) fail('dept', where, c.tpl, c.dept, '!=', T.dept);
  if (S.officer && c.last === S.officer) fail('officer-surname', where, c.first, c.last);
  if (T && T.worker && c.ctx.cit && /retired|former|laid-off/i.test(c.ctx.cit.detail)) fail('worker', where, c.tpl, c.ctx.cit.name, c.ctx.cit.detail);
  if (/source data/.test(JSON.stringify(c))) fail('copy', where, 'says “source data”');
  if (!S.endless && S.day >= 2 && /CHUCK v9\b(?!\.)/.test(JSON.stringify(c.docs))) fail('copy', where, 'CHUCK v9 after the v9.1 update');
  // dates in the future
  if (c.tpl && !PAST_OK.includes(c.tpl) && !(c.flaw && c.flaw.kind === 'offByOne')) {
    const today = A.dayDate(S.day);
    const when = (A.TEMPLATES.find((t) => t.id === c.tpl) || {}).dates;
    c.docs.forEach((d) => d.fields.forEach((f) => datesIn(f.v, today).forEach(([raw, dt]) => { const real = /\d{4}$/.test(raw) ? dt : trueDate(raw.replace(/^(\w{3})\w* /, (m, mo) => A.MONTHS.find((x) => x.startsWith(mo)) + ' '), today, when) || dt; if (real <= today) fail('date-past', where, c.tpl, raw); })));
  }
  // greetings never leak raw To fields
  const toField = fieldV(c, 'to') || '';
  c.greet.map((g) => (g && g.text) || g).concat(`${c.first} from ${c.dept} brings ${c.ctx.titleA}.`).forEach((l) => {
    if (/[·@]/.test(l)) fail('greet-raw', c.tpl, l);
    if (toField && /[·@,(]/.test(toField) && l.includes(toField)) fail('greet-raw', c.tpl, 'contains the To field:', l);
    if (/…[.,]/.test(l) || (c.tpl && /…/.test(l) && !/so…$/.test(l))) fail('greet-trunc', c.tpl, l);
  });
  for (const q of A.QUESTIONS) { const a = A.answerQuestion(c, q.id, S); if (!a || bad(a.text)) fail('answer', c.tpl, c.flaw && c.flaw.kind, q.id, a && a.text); }
};

const camp = (day, seed, extra) => Object.assign({ day, seed, endless: false, officer: 'Okafor', flags: { readers: true }, stats: { party: 0, conscience: 0, suspicion: 0, corruption: 0, truth: 5 }, staff, money: 900, affected: 0, poi: A.campaignPoi ? A.campaignPoi(seed) : undefined }, extra || {});
for (let day = 1; day <= 10; day++) {
  for (let seed = 7; seed < 9; seed++) {
    const S = camp(day, seed);
    for (const kind of ['clean', 'back', 'q', 'cruel']) for (let k = 0; k < 60; k++) {
      const c = A.buildCase({ kind }, S, A.makeRng(day * 1000 + k * 7 + kind.length + seed * 31));
      runCase(c, S, kind, `d${day} ${kind}`);
    }
  }
}
for (let day = 1; day <= 25; day++) {
  const S = camp(day, 11, { endless: true, flags: {} });
  for (const kind of ['clean', 'back', 'q', 'cruel']) for (let k = 0; k < 40; k++) runCase(A.buildCase({ kind }, S, A.makeRng(day * 1000 + k * 7 + kind.length + 555)), S, kind, `endless d${day} ${kind}`);
}
if (A.LATE_FLAWS) A.LATE_FLAWS.forEach((k) => { if (!seen[k]) fail('late-flaw-unused', k, 'never generated on days 6–10'); });

// ---- Story cases -------------------------------------------------------------------------------------------
const storyGreets = new Map();
for (let day = 1; day <= 10; day++) for (const seed of [1, 2, 3, 4]) {
  const S = camp(day, seed);
  for (const id of Object.keys(A.STORY_PEOPLE)) {
    const c = A.STORY_PEOPLE[id].make(S);
    [c.chuckGreet, c.appearance, c.truthNote, ...c.docs.flatMap((d) => d.fields.map((f) => f.v))].forEach((t) => { if (bad(t)) fail('story-placeholder', id, t); });
    if (c.kind === 'order' && !c.items.some((i) => i.name === 'Oversight check')) fail('oversight-item', 'story', id);
    if (/^(Dr|Mr|Ms)\.$/.test(c.first)) fail('story-name', id, 'first name is a title:', c.first);
    if (!storyGreets.has(c.chuckGreet)) storyGreets.set(c.chuckGreet, new Set());
    storyGreets.get(c.chuckGreet).add(id);
    for (const q of A.QUESTIONS) { const a = A.answerQuestion(c, q.id, S); if (!a || bad(a.text)) fail('story-answer', id, q.id, a && a.text); }
    if (A.STORY_PEOPLE[id].judge) for (const dec of ['approve', 'deny', 'detain']) { const r = A.STORY_PEOPLE[id].judge(dec, c, JSON.parse(JSON.stringify(S))); if (!r.outcome) fail('story-outcome', id, dec); }
  }
  for (const k of Object.keys(A.SCENES)) { const flat = JSON.stringify(A.SCENES[k](Object.assign({ officer: 'Reyes' }, S))); if (bad(flat.replace(/\\u[0-9a-f]{4}/g, ''))) fail('scene', k); }
}
storyGreets.forEach((ids, g) => { if (ids.size > 1) fail('story-greet', 'shared CHUCK greeting', [...ids].join(','), g); });
{
  // At least four story cases come in two versions, chosen by the seed.
  const variants = Object.keys(A.STORY_PEOPLE).filter((id) => new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(A.STORY_PEOPLE[id].make(camp(5, seed)).docs[0]))).size > 1);
  if (variants.length < 4) fail('story-variants', `only ${variants.length} story cases have a second version: ${variants.join(', ')}`);
  console.log('story variants', variants.join(', '));
}
{
  const S = camp(5, 1, { flags: {} });
  const expectOutcome = (id, dec, want) => { const c = A.STORY_PEOPLE[id].make(S); const r = A.STORY_PEOPLE[id].judge(dec, c, JSON.parse(JSON.stringify(S))); if (r.outcome !== want) fail('story-grade', id, dec, r.outcome, '!=', want); };
  expectOutcome('valentina', 'detain', 'overcautious'); expectOutcome('valentina', 'deny', 'correct_deny'); expectOutcome('valentina', 'approve', 'breach');
  if (!A.STORY_PEOPLE.valentina.make(S).returnBonus) fail('story-grade', 'valentina', 'the Return earns no evidence bonus');
  ['render1', 'render2'].forEach((id) => { expectOutcome(id, 'detain', 'refused'); expectOutcome(id, 'deny', 'soft_refused'); });
  expectOutcome('bayview', 'deny', 'soft_refused'); expectOutcome('bayview', 'detain', 'refused');
  expectOutcome('frank', 'approve', 'defied'); expectOutcome('raviOut', 'approve', 'defied');
  ['stewardPhish', 'broker', 'valentina'].forEach((id) => { if (!A.STORY_PEOPLE[id].make(S).flawFields.length) fail('story-evidence', id, 'has no flawFields'); });
  if (!A.STORY_PEOPLE.valentina.make(S).items.some((i) => i.contraband)) fail('story-evidence', 'valentina', 'opening the file earns no evidence bonus');
}

// ---- Statutes are in force before they are used, and every "§N" names the statute it means -----------------------
const statuteDay = (id) => (A.POLICIES.find((p) => p.id === id) || { day: 99 }).day;
const STATUTE_TOPIC = {
  '§1': /clause|liab|countersign/i, '§2': /match/i, '§3': /clerical|return|wrong (?:number|id|date|figure)|figure|date|placeholder|tone/i,
  '§4': /withhold|harm|invent|leak|wrong person|fraud|unsafe/i, '§5': /stamp|forged|ink|symbol|colou?r/i, '§6': /labour|employ|PTO|hiring|terminat|reference|warning/i,
  '§7': /score|lawful|alignment/i, '§8': /treasury|bank|payment/i, '§9': /housing|relocat|evict/i, '§10': /allergen|label/i, '§11': /server|systems|command/i,
  '§12': /steward/i, '§13': /bulletin|look-alike|person of interest|domain|halcyon\.gov/i, '§14': /reference|approver|format|forged/i,
  '§15': /override|review number|placement|track/i, '§16': /appeal/i, '§17': /press|narrative|zine|newsletter/i, '§18': /ombudsman|press/i, '§19': /dated|raised|sign-off/i, '§20': /external|steward/i
};
// "§N" that means a statute: not "Accords §4.2", "Housing Code §3", "Payment Act, §9" or "§3(b)".
const STATUTE_REF = /(?<!Code |Act, |Accords )§(\d+)(?!\d|\.\d|\()/g;
function statuteRefs(text, where, day) {
  const t = String(text);
  const sentences = t.split(/(?<=[.!?”])\s+/);
  sentences.forEach((sen, i) => {
    for (const m of sen.matchAll(STATUTE_REF)) {
      const id = '§' + m[1];
      if (!STATUTE_TOPIC[id]) { fail('statute-ref', where, `${id} is not a statute`, sen); continue; }
      const ctxText = (sentences[i - 1] || '') + ' ' + sen;
      if (!STATUTE_TOPIC[id].test(ctxText)) fail('statute-ref', where, `${id} (${(A.POLICIES.find((p) => p.id === id) || {}).title}) cited for something else:`, sen);
      if (day && statuteDay(id) > day) fail('statute-day', where, `${id} is cited on day ${day} but is in force from day ${statuteDay(id)}`, sen);
    }
  });
}
{
  const flat = (x) => JSON.stringify(x).replace(/\\u[0-9a-f]{4}/g, '');
  const storyDay = {};
  Object.entries(A.DAY_PLAN).forEach(([d, p]) => p.slots.forEach((sl) => { if (typeof sl === 'string') storyDay[sl] = +d; }));
  for (const seed of [1, 2, 3, 4]) {
    for (let day = 1; day <= 10; day++) {
      const S = camp(day, seed, { totals: { refused: 1, softRefused: 1 }, stats: { party: 6, conscience: 3, suspicion: 8, corruption: 2, truth: 4 }, flags: { readers: true, frankSent: true, bayviewBlocked: true, sawRender: true, storyOut: true, toldInes: true, readNikaLetter: true, nikaIn: true, valentinaRefused: true, brokerSigned: true } });
      const k = 'brief' + day, e = 'eve' + day;
      [k, e].forEach((sk) => { if (A.SCENES[sk]) statuteRefs(flat(A.SCENES[sk](Object.assign({ officer: 'Reyes' }, S))), sk, day); });
    }
    Object.keys(A.STORY_PEOPLE).forEach((id) => {
      const d = storyDay[id] || 10;
      const S = camp(d, seed);
      const c = A.STORY_PEOPLE[id].make(S);
      const texts = [c.truthNote, ...(c.defects || []).map((x) => x.note), ...c.items.map((i) => `${i.tell || ''} ${i.probe || ''}`), ...Object.values(c.storyAnswers || {}).flat()];
      if (A.STORY_PEOPLE[id].judge) ['approve', 'deny', 'detain'].forEach((dec) => texts.push(A.STORY_PEOPLE[id].judge(dec, c, JSON.parse(JSON.stringify(S))).note || ''));
      texts.forEach((t) => statuteRefs(t, 'story ' + id, d));
    });
  }
  // Generated cases: notes cite only statutes already in force on the days those slots exist.
  for (let day = 1; day <= 10; day++) {
    const kinds = [...new Set(A.DAY_PLAN[day].slots.filter((sl) => typeof sl !== 'string').map((sl) => sl.kind || 'clean'))];
    const S = camp(day, 21);
    kinds.forEach((kind) => { for (let k = 0; k < 80; k++) { const c = A.buildCase({ kind }, S, A.makeRng(day * 977 + k * 13 + kind.length)); [c.truthNote, c.fallout, ...c.clues].forEach((t) => statuteRefs(t, `d${day} ${kind} ${c.tpl}`, day)); } });
  }
  // The pools and the grader's own notes in game.js.
  Object.values(A.LINES).forEach((pool) => statuteRefs(flat(pool), 'LINES'));
  const gameSrc = fs.readFileSync(dir + '/game.js', 'utf8');
  for (const m of gameSrc.matchAll(/'[^'\n]*§\d+[^'\n]*'|`[^`\n]*§\d+[^`\n]*`/g)) statuteRefs(m[0].slice(1, -1), 'game.js');
  // First use of each statute by the cases and stamps it governs: the statute is in force by then.
  const FIRST_USE = { valentina: '§15', zine: '§17', frank: '§18', raviOut: '§18', allhands: '§12', stewardPhish: '§13' };
  Object.entries(FIRST_USE).forEach(([id, sid]) => { if (statuteDay(sid) > storyDay[id]) fail('statute-day', id, `on day ${storyDay[id]} relies on ${sid}, in force from day ${statuteDay(sid)}`); });
  A.TEMPLATES.forEach((T) => {
    if (T.id === 'appeal-dismissal' && statuteDay('§16') > T.min) fail('statute-day', T.id, `from day ${T.min} relies on §16, in force from day ${statuteDay('§16')}`);
    if (T.recipe && T.kind === 'label' && statuteDay('§10') > T.min) fail('statute-day', T.id, 'allergen labels before §10');
    if (!T.needs) return;
    for (let d = 1; d <= 10; d++) if (A.requiredStamp(T, d, false) === T.needs) { if (statuteDay(STATUTE_FOR[T.needs]) > d) fail('statute-day', T.id, `needs a ${T.needs} stamp on day ${d}, ${STATUTE_FOR[T.needs]} starts day ${statuteDay(STATUTE_FOR[T.needs])}`); break; }
  });
  if (statuteDay('§14') > A.LATE_FLAW_DAY) fail('statute-day', 'approver and reference forgeries come before §14');
  // The stamp register (game.js REGISTER_NEEDS, "(day N+)") names the same first day as the statute and the grader: a
  // requirement starts on exactly the day its statute does, and on exactly the day the first case needs it.
  const regBlock = (gameSrc.match(/const REGISTER_NEEDS = \[([\s\S]*?)\];/) || [])[1];
  if (!regBlock) fail('register-day', 'game.js has no REGISTER_NEEDS');
  else {
    const lines = [...regBlock.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
    const regDay = (re) => { const l = lines.find((x) => re.test(x)); const m = l && /\(day (\d+)\+\)/.exec(l); return m ? +m[1] : null; };
    const firstNeed = (key) => { for (let d = 1; d <= 10; d++) if (A.TEMPLATES.some((T) => A.requiredStamp(T, d, false) === key)) return d; return null; };
    const REG = { hr: [/Labour Allocation/, '§6'], finance: [/Treasury/, '§8'], housing: [/Housing Allocation/, '§9'], it: [/Systems/, '§11'], board: [/Steward’s Office/, '§20'] };
    Object.entries(REG).forEach(([key, [re, sid]]) => {
      const r = regDay(re), g = firstNeed(key), st = statuteDay(sid);
      if (!(r === g && g === st)) fail('register-day', key, `register says day ${r}, the grader first needs it on day ${g}, ${sid} starts day ${st}`);
    });
    [[/review number/, '§15', 'valentina'], [/Narrative Office/, '§17', 'zine']].forEach(([re, sid, id]) => {
      const r = regDay(re);
      if (!(r === statuteDay(sid) && r === storyDay[id])) fail('register-day', sid, `register says day ${r}, ${sid} starts day ${statuteDay(sid)}, first used on day ${storyDay[id]}`);
    });
    // A department's row joins the register on the first day its stamp can reach the desk.
    const rowsFrom = (gameSrc.match(/const REGISTER_FROM = (\{[^}]*\})/) || [])[1];
    const from = rowsFrom ? Function(`return ${rowsFrom}`)() : {};
    const reach = {};
    const seenStamp = (key, d) => { if (!reach[key] || d < reach[key]) reach[key] = d; };
    for (let d = 1; d <= 10; d++) {
      A.TEMPLATES.forEach((T) => { const k = A.requiredStamp(T, d, false); if (k) seenStamp(k, d); });
      if (d >= 5) seenStamp('board', d);
      A.DAY_PLAN[d].slots.filter((sl) => typeof sl === 'string').forEach((id) => { const c = A.STORY_PEOPLE[id].make(camp(d, 1)); c.docs.filter((x) => x.type === 'stamp').forEach((x) => seenStamp(x.key, d)); });
      if (d >= 8) seenStamp('quality', d);
    }
    Object.entries(reach).forEach(([key, d]) => { if (from[key] !== d) fail('register-day', `${key} row joins the register on day ${from[key]}, its stamp first reaches the desk on day ${d}`); });
  }
  if (statuteDay('§5') > 2) fail('statute-day', 'stamps arrive on day 2 before §5');
}

// ---- Story variants: each version's scenes, notes, feed and endings name only that version ---------------------------
{
  const caseText = (c) => JSON.stringify([c.greet, c.chuckGreet, c.docs, c.items.map((i) => [i.name, i.desc, i.tell, i.probe]), c.truthNote, c.fallout, c.clues, c.storyAnswers, c.appearance]);
  const flagSets = [{}, { brokerSigned: true }, { dinoDeal: true, brokerSigned: true }, { dinoDeal: true, dinoBetrayed: true }, { readers: true, parachute: true, frankSent: true, storyOut: true, bayviewBlocked: true, sawRender: true, phishSent: true }];
  Object.entries(A.STORY_VARIANTS).forEach(([id, vs]) => {
    const seedFor = [0, 1].map((k) => { for (let sd = 1; sd < 500; sd++) if ((A.storyVariant({ seed: sd }, id) ? 1 : 0) === k) return sd; return null; });
    [0, 1].forEach((k) => {
      const mine = vs[k], other = vs[1 - k];
      const texts = [];
      for (let day = 1; day <= 10; day++) for (const flags of flagSets) {
        const S = camp(day, seedFor[k], { flags: Object.assign({}, flags), shift: { clock: 540 + day * 37 }, totals: { refused: 2, softRefused: 1 }, stats: { party: 6, conscience: 3, suspicion: 5, corruption: 2, truth: 4 } });
        Object.keys(A.SCENES).forEach((sk) => texts.push(JSON.stringify(A.SCENES[sk](Object.assign({ officer: 'Reyes' }, S)))));
        const c = A.STORY_PEOPLE[id].make(S);
        texts.push(caseText(c));
        A.QUESTIONS.forEach((q) => texts.push(A.answerQuestion(c, q.id, S).text));
        if (A.STORY_PEOPLE[id].judge) ['approve', 'deny', 'detain'].forEach((dec) => texts.push(JSON.stringify(A.STORY_PEOPLE[id].judge(dec, c, JSON.parse(JSON.stringify(S))))));
        Object.keys(A.ENDINGS).forEach((e) => texts.push(A.endingText(e, S).join(' ')));
      }
      const all = texts.join('\n');
      other.tokens.forEach((re) => { if (re.test(all)) fail('variant-leak', id, `${mine.first}’s version names`, re, (all.match(re) || [''])[0]); });
      mine.tokens.forEach((re) => { if (!re.test(all)) fail('variant-token', id, `${mine.first}’s version never says`, re); });
    });
  });
  // The broker's count reaches Dino's scene, the feed and the approve note.
  for (const k of [0, 1]) {
    const v = A.STORY_VARIANTS.broker[k];
    let sd = 1; while ((A.storyVariant({ seed: sd }, 'broker') ? 1 : 0) !== k) sd++;
    const S = camp(3, sd, { flags: { brokerSigned: true } });
    const dino = JSON.stringify(A.SCENES.dino(S)), feed = JSON.stringify(A.SCENES.eve3(S));
    const note = A.STORY_PEOPLE.broker.judge('approve', A.STORY_PEOPLE.broker.make(S), JSON.parse(JSON.stringify(Object.assign({}, S, { flags: {} })))).note;
    if (!dino.includes(v.first)) fail('variant-wiring', 'Dino does not name', v.first);
    if (!feed.includes(`upheld this week: ${v.n}.`)) fail('variant-wiring', 'feed does not count', v.n);
    if (!new RegExp(`^${v.n === 12 ? 'Twelve' : 'Nine'} bought`).test(note)) fail('variant-wiring', 'approve note', note);
  }
}

// ---- Story papers agree with each other: batch, reference and case IDs and counts -----------------------------------
{
  const ID_RE = /\b(?:R-\d{3,}|CS-\d{4,}|#\d{3,})\b/g;
  const COUNT_RE = /\b(\d[\d,]*) (?:decisions|households|appeals|benefit denials|records|citizens)\b/g;
  const tickets = {};
  for (const seed of [1, 2, 3, 4]) for (const id of Object.keys(A.STORY_PEOPLE)) {
    const c = A.STORY_PEOPLE[id].make(camp(5, seed));
    const order = c.docs.find((d) => d.type === 'ask'), src = c.docs.find((d) => d.type === 'source'), draft = draftOf(c), st = c.docs.find((d) => d.type === 'stamp');
    const paper = JSON.stringify([order.fields, src.fields, c.ticket]);
    const known = new Set([...paper.matchAll(ID_RE)].map((m) => m[0]));
    const counts = new Set([...paper.matchAll(/\d[\d,]*/g)].map((m) => m[0]));
    draft.fields.filter((f) => !(c.flawFields || []).includes(f.k)).forEach((f) => {
      [...String(f.v).matchAll(ID_RE)].forEach((m) => { if (!known.has(m[0])) fail('story-ids', id, `draft says ${m[0]}, the order and source don’t`); });
      [...String(f.v).matchAll(COUNT_RE)].forEach((m) => { if (!counts.has(m[1])) fail('story-ids', id, `draft counts ${m[0]}, the order and source don’t`); });
    });
    [...JSON.stringify(src.fields).matchAll(/\bR-\d{3,}\b/g)].forEach((m) => { if (!JSON.stringify(draft.fields).includes(m[0])) fail('story-ids', id, `source batch ${m[0]} is not on the draft`); });
    if (!order.authority.includes(c.ticket)) fail('story-ids', id, 'the order’s case number is not the ticket');
    if (st && stampField(st, 'ticket') !== c.ticket) fail('story-ids', id, 'the stamp is for another case', stampField(st, 'ticket'), c.ticket);
    if (tickets[c.ticket] && tickets[c.ticket] !== id) fail('story-ids', id, 'shares case number', c.ticket, 'with', tickets[c.ticket]);
    tickets[c.ticket] = id;
  }
}

// ---- Names: one first name per person for the whole campaign; approvers are nobody else --------------------------------
{
  const approvers = Object.values(A.STAMPS).flatMap((s) => s.approver);
  const approverFirsts = new Set(approvers.map((n) => n.split(' ')[0]));
  const citFirsts = A.CITIZENS.concat(A.POI_CITIZENS).map((p) => p.first);
  if (new Set(citFirsts).size !== citFirsts.length) fail('names', 'two citizens share a first name');
  citFirsts.forEach((f) => { if (approverFirsts.has(f)) fail('names', 'citizen shares an approver’s first name', f); });
  const storyFirsts = new Set();
  for (let seed = 1; seed < 40; seed++) Object.keys(A.STORY_PEOPLE).forEach((id) => storyFirsts.add(A.STORY_PEOPLE[id].make(camp(5, seed)).first));
  storyFirsts.forEach((f) => { if (!A.STORY_FIRSTS.includes(f)) fail('names', 'story person missing from STORY_FIRSTS', f); if (approverFirsts.has(f) && f !== 'Dino') fail('names', 'story officer shares an approver’s first name', f); });
  for (let seed = 0; seed < 100; seed++) {
    const st = A.buildStaff(seed * 7919 + 1, 72);
    const firsts = st.map((p) => p.first);
    if (new Set(firsts).size !== firsts.length) fail('names', 'seed', seed, 'two officers share a first name');
    st.forEach((p) => {
      if (citFirsts.includes(p.first) || storyFirsts.has(p.first) || approverFirsts.has(p.first) || A.NAMES.emp.f.concat(A.NAMES.emp.m).includes(p.first) || A.CLIENTS.concat(A.SUPPLIERS).some((x) => x.first === p.first) || A.PLACEMENT_KIDS.some((k) => k.startsWith(p.first + ' '))) fail('names', 'officer', p.first, p.last, 'shares a first name with someone else in the campaign');
      if (approvers.includes(`${p.first} ${p.last}`)) fail('names', 'officer has an approver’s name', p.first, p.last);
    });
  }
}

// ---- Surnames: one per officer, never a surname anybody else in the game uses; one surname, one family ------------------
{
  const reserved = A.reservedSurnames();
  ['Reyes', 'Moreno', 'Kobayashi', 'Hock', 'Iyer', 'Marrone', 'Vale', 'Strand'].concat(A.STORY_SURNAMES).forEach((n) => { if (!reserved.has(n)) fail('surnames', 'story surname not reserved', n); });
  Object.values(A.STAMPS).flatMap((s) => s.approver).forEach((n) => { if (!reserved.has(n.split(' ').slice(1).join(' '))) fail('surnames', 'approver surname not reserved', n); });
  for (let seed = 0; seed < 150; seed++) {
    const st = A.buildStaff(seed * 104729 + 7, 72);
    const lasts = st.map((p) => p.last);
    if (new Set(lasts).size !== lasts.length) fail('surnames', 'seed', seed, 'two officers share a surname');
    lasts.forEach((l) => { if (reserved.has(l)) fail('surnames', 'seed', seed, 'officer surname belongs to someone else', l); });
  }
  // Everybody else with a name: a surname belongs to one family only (the Reyes and the Strands are families).
  const people = [].concat(A.CITIZENS.map((p) => p.name), A.POI_CITIZENS.map((p) => p.name), A.CLIENTS.concat(A.SUPPLIERS).map((p) => p.contact),
    Object.values(A.STAMPS).flatMap((s) => s.approver), A.PLACEMENT_KIDS, A.NAMES.emp.f.concat(A.NAMES.emp.m).map((f, i) => `${f} ${A.NAMES.empLast[i]}`),
    ['Marta Hock', 'Ravi Iyer', 'Dino Marrone', 'Ines Vale', 'Nika Bergant', 'Frank Russo', 'Bryce Lardner', 'Valentina Strand', 'Oliver Strand', 'Logan Pike', 'Jana Reyes'],
    Object.keys(A.STORY_PEOPLE).flatMap((id) => [1, 2, 3, 4, 5, 6].map((sd) => { const c = A.STORY_PEOPLE[id].make(camp(5, sd)); return `${c.first} ${c.last}`; })));
  const fam = {};
  [...new Set(people)].forEach((full) => { const last = full.split(' ').slice(1).join(' '); (fam[last] = fam[last] || new Set()).add(full); });
  Object.entries(fam).forEach(([last, who]) => { if (who.size > 1 && !['Reyes', 'Strand'].includes(last)) fail('surnames', `${[...who].join(' and ')} share the surname ${last}`); });
}

// ---- Cruel cases draw their citizens from the pool; grief dates are per citizen ----------------------------------------
{
  const days = A.CITIZENS.map((p) => { const g = A.griefOf(p); return `${g.day} ${g.kin}`; });
  if (new Set(days).size !== days.length) fail('cruel-citizens', 'two citizens share a grief date');
  if (new Set(A.CITIZENS.map((p) => A.griefOf(p).day)).size !== A.CITIZENS.length) fail('cruel-citizens', 'two citizens lost someone on the same day');
  const S = camp(8, 3);
  A.TEMPLATES.filter((T) => T.cruel && /\bcit\b/.test(T.v.toString())).forEach((T) => {
    const who = new Set();
    for (let k = 0; k < 40; k++) who.add(A.buildCase({ kind: 'cruel', tpl: T.id }, S, A.makeRng(k * 31 + 7)).ctx.cit.name);
    if (who.size < 5) fail('cruel-citizens', T.id, `draws only ${who.size} citizens`);
    if (/CITIZENS\[\d+\]/.test(T.v.toString())) fail('cruel-citizens', T.id, 'pins a citizen');
  });
  const term = [0, 1, 2, 3, 4, 5].map((k) => A.buildCase({ kind: 'cruel', tpl: 'termination' }, S, A.makeRng(k * 97 + 1))).filter((c) => c.items.length);
  const byCit = new Map(term.map((c) => [c.ctx.cit.name, c.items.find((i) => i.name === 'Productivity file').probe]));
  if (new Set(byCit.values()).size !== byCit.size) fail('cruel-citizens', 'two citizens share a termination grief line');
}

// ---- Boilerplate: harmless template lines are in the source's Standard terms; CHUCK owns up to them -----------------------
{
  const S = camp(8, 5);
  A.TEMPLATES.forEach((T) => {
    const terms = T.src.filter(([l]) => l === 'Standard terms').map(([, v]) => v);
    if (!terms.length) return;
    const c = A.buildCase({ kind: 'clean', tpl: T.id }, S, A.makeRng(A.hashStr(T.id)));
    const draft = draftOf(c);
    terms.forEach((t) => {
      const f = draft.fields.find((x) => String(x.v).toLowerCase().includes(t.toLowerCase()));
      if (!f) { fail('boilerplate', T.id, 'standard term not in the clean draft', t); return; }
      c.flags = [{ doc: 'draft', field: f.k }];
      const a = A.answerQuestion(c, 9, S).text;
      if (!A.LINES.chuckTerms.map((l) => A.tpl(l, c.ctx)).includes(a)) fail('boilerplate', T.id, 'CHUCK does not call it a standard term:', a);
    });
  });
  // Real overreach and unsafe claims are never in the source.
  for (let day = 1; day <= 10; day++) for (let k = 0; k < 120; k++) {
    const c = A.buildCase({ kind: 'q' }, camp(day, 9), A.makeRng(day * 4441 + k));
    if (!c.flaw || !['overreach', 'safety', 'invented'].includes(c.flaw.tag)) continue;
    (c.flawFields || []).forEach((fk) => {
      if (A.flaggedKind(c, { doc: 'draft', field: fk }) === 'terms') fail('boilerplate', c.tpl, c.flaw.tag, 'a harmful line passes as a standard term:', fieldV(c, fk));
      c.flags = [{ doc: 'draft', field: fk }];
      if (A.LINES.chuckTerms.map((l) => A.tpl(l, c.ctx)).includes(A.answerQuestion(c, 9, camp(day, 9)).text)) fail('boilerplate', c.tpl, 'CHUCK calls a harmful line a standard term');
    });
  }
  // A line with no facts in it is never vouched for as matching the paperwork.
  let plain = 0;
  for (let day = 1; day <= 10; day++) for (let k = 0; k < 30; k++) {
    const c = A.buildCase({ kind: 'clean' }, camp(day, 13), A.makeRng(day * 7717 + k));
    draftOf(c).fields.forEach((f) => {
      const kind = A.flaggedKind(c, { doc: 'draft', field: f.k });
      if (kind !== 'plain') return;
      plain++;
      c.flags = [{ doc: 'draft', field: f.k }];
      const a = A.answerQuestion(c, 9, camp(day, 13)).text;
      if (/match|source|paperwork|file|copied|twins|word for word|lifted/i.test(a)) fail('boilerplate', c.tpl, `vouches for “${f.v}”:`, a);
    });
    const a7 = A.answerQuestion(c, 7, camp(day, 13)).text;
    if (c.kind !== 'email' && /replies by Thursday/.test(a7)) fail('what-next', c.tpl, c.kind, a7);
  }
  if (!plain) fail('boilerplate', 'no plain lines were tested');
}

// ---- From day 6 about half the flawed slots are late kinds; placeholders retire ---------------------------------------
{
  const dist = {}; let late = 0, total = 0;
  for (let i = 0; i < 2000; i++) {
    const day = 6 + (i % 5), kind = i % 2 ? 'q' : 'back';
    const c = A.buildCase({ kind }, camp(day, 100 + (i % 7)), A.makeRng(i * 7919 + 17));
    if (!c.flaw) continue;
    total++;
    dist[c.flaw.kind] = (dist[c.flaw.kind] || 0) + 1;
    if (A.LATE_FLAWS.includes(c.flaw.kind)) late++;
    if (c.flaw.kind === 'placeholder') fail('late-mix', `day ${day}`, 'placeholder after day 5');
  }
  const share = late / total;
  if (share < 0.4 || share > 0.6) fail('late-mix', `late kinds are ${Math.round(share * 100)}% of flawed slots on days 6–10`);
  console.log(`late mix: ${total} flawed day 6–10 cases, ${late} late (${(share * 100).toFixed(1)}%)`, JSON.stringify(dist));
}
{
  // Late kinds by severity: one-day-off dates are at most a quarter of the late clerical flaws, and every late kind turns up.
  const by = { back: {}, q: {} };
  for (let i = 0; i < 4000; i++) {
    const day = 6 + (i % 5), kind = i % 2 ? 'q' : 'back';
    const c = A.buildCase({ kind }, camp(day, 300 + (i % 11)), A.makeRng(i * 104729 + 3));
    if (c.flaw && A.LATE_FLAWS.includes(c.flaw.kind)) by[kind][c.flaw.kind] = (by[kind][c.flaw.kind] || 0) + 1;
  }
  const tot = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const pct = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, `${Math.round((v / tot(o)) * 100)}%`]));
  if ((by.back.offByOne || 0) / tot(by.back) > 0.25) fail('late-variety', `one-day-off dates are ${pct(by.back).offByOne} of late clerical flaws (cap 25%)`);
  ['offByOne', 'offByOneId', 'weekday', 'footnote'].forEach((k) => { if (!by.back[k]) fail('late-variety', 'late clerical kind never generated', k); });
  ['nearDomain', 'surname', 'stampApprover', 'stampInk', 'stampRef'].forEach((k) => { if (!by.q[k]) fail('late-variety', 'late harmful kind never generated', k); });
  console.log('late clerical (back):', JSON.stringify(pct(by.back)), 'late harmful (q):', JSON.stringify(pct(by.q)));
}

// ---- Campaign memory: a cruel template once, a block or a citizen moved once, a look-alike domain once -------------------
{
  let bad = 0;
  for (let campaign = 0; campaign < 40; campaign++) {
    const S0 = camp(1, 9000 + campaign, { flags: {} });
    const seen = { cruel: [], finds: [], blocks: [], moved: [], domains: [] };
    for (let day = 1; day <= 10; day++) {
      const S = Object.assign(S0, { day });
      A.DAY_PLAN[day].slots.filter((sl) => typeof sl !== 'string').forEach((slot, i) => {
        const c = A.buildCase(Object.assign({ kind: 'clean' }, A.campaignAvoid(S), slot), S, A.makeRng(campaign * 7919 + day * 131 + i));
        if (c.cruel) {
          if (seen.cruel.includes(c.tpl)) { bad++; fail('campaign-repeat', 'campaign', campaign, 'cruel template twice', c.tpl); }
          seen.cruel.push(c.tpl);
          const find = c.items.filter((it) => it.tell || it.probe).map((it) => it.probe).join('|');
          if (seen.finds.includes(find)) fail('campaign-repeat', 'campaign', campaign, 'the same grief/detail text twice', find.slice(0, 60));
          seen.finds.push(find);
        }
        if (c.tpl === 'ration-cut') { if (seen.blocks.includes(c.ctx.blk)) fail('campaign-repeat', 'block moved twice', c.ctx.blk); seen.blocks.push(c.ctx.blk); }
        if (c.ctx.cit && seen.moved.includes(c.ctx.cit.name)) fail('campaign-repeat', 'a moved citizen comes back', c.tpl, c.ctx.cit.name);
        if (['relocation', 'eviction'].includes(c.tpl) && c.ctx.cit) seen.moved.push(c.ctx.cit.name);
        if (c.lookalike) { if (seen.domains.includes(c.lookalike)) fail('campaign-repeat', 'look-alike domain twice', c.lookalike); seen.domains.push(c.lookalike); }
        A.recordCase(S, c);
        S.usedCitizens = (S.usedCitizens || []).concat(c.ctx.cit ? [c.ctx.cit.name] : []);
      });
    }
  }
  console.log('campaign memory: 40 campaigns checked');
}

// ---- Endings -----------------------------------------------------------------------------------------------
for (const e of Object.keys(A.ENDINGS)) {
  A.ENDINGS[e].text({ money: 1234, flags: {}, stats: {}, totals: { refused: 2, softRefused: 3 } }).forEach((t) => { if (bad(t)) fail('ending', e); });
  if (A.ENDING_HOOKS && !A.ENDING_HOOKS[e]) fail('ending-hook', e);
}
{
  const st = (o) => Object.assign({ party: 0, conscience: 0, suspicion: 0, corruption: 0, truth: 0 }, o);
  const S = { stats: st({ conscience: 8, suspicion: 10 }), flags: { storyOut: true, frankSent: true }, money: 0 };
  if (A.resolveEnding(S, 'stay') !== 'front_page') fail('ending-order', 'front_page must beat slow_hand, got', A.resolveEnding(S, 'stay'));
}

// ---- Lines never repeat within a shift -----------------------------------------------------------------------
if (need('LINES') && need('drawFresh')) {
  const pools = { draft: A.LINES.draft, caseFile: A.LINES.caseFile, complain: A.LINES.complain, found: A.LINES.found, flagClean: A.LINES.flagClean,
    'decide.approve': A.LINES.decide.approve, 'decide.deny': A.LINES.decide.deny, 'decide.detain': A.LINES.decide.detain,
    'exit.approve': A.EXIT_LINES.approve, 'exit.deny': A.EXIT_LINES.deny, 'exit.detain': A.EXIT_LINES.detain, GREETS: A.GREETS };
  Object.keys(A.LINES.chuckGreet).filter((k) => k !== 'any').forEach((k) => { pools['chuckGreet.' + k] = A.LINES.chuckGreet.any.concat(A.LINES.chuckGreet[k]); });
  Object.entries(pools).forEach(([k, p]) => { if (p.length < 10) fail('pool-size', k, p.length); });
  // 10 campaigns × 10 shifts. Every decision draws what a careful player can trigger: greetings, the draft line,
  // the case-file grumble, a found-item line, a flag answer, an Oversight complaint, CHUCK's and the officer's reaction.
  let within = 0, cross = 0, draws = 0;
  for (let campaign = 0; campaign < 10; campaign++) {
    const rng = A.makeRng(1000 + campaign);
    const history = [];
    for (let day = 1; day <= 10; day++) {
      const S = camp(day, 1000 + campaign, { shift: { usedLines: [] } });
      S.prevLines = history.slice(-2).flat();
      const used = S.shift.usedLines;
      for (let i = 0; i < 5; i++) {
        const kind = rng.pick(['clean', 'back', 'q', 'cruel']);
        const c = A.buildCase({ kind, avoidLines: used.concat(S.prevLines), shiftLines: used }, S, A.makeRng(campaign * 7919 + day * 131 + i));
        used.push(...(c.lineKeys || []));
        const dec = c.expected;
        ['draft', 'caseFile', 'found', 'flagClean', 'complain', 'decide.' + dec, 'exit.' + dec].forEach((k) => A.drawFresh(pools[k], used, S.prevLines, rng.next));
      }
      draws += used.length;
      within += used.length - new Set(used).size;
      if (process.env.DEBUG_LINES) used.forEach((l, i) => { if (used.indexOf(l) !== i) console.log("dup", day, l); });
      cross += used.filter((l) => S.prevLines.includes(l)).length;
      history.push(used.slice());
    }
  }
  if (within) fail('line-repeat', `${within} repeats inside a shift`);
  console.log(`line simulation: ${draws} lines over 100 shifts, ${within} repeats within a shift, ${cross} heard in the previous two shifts`);
}

// ---- Campaign line memory: a line comes back only once its pool is spent, oldest first -----------------------------------
if (need('hearLine')) {
  const pools = { draft: A.LINES.draft, 'decide.approve': A.LINES.decide.approve, 'decide.deny': A.LINES.decide.deny, 'decide.detain': A.LINES.decide.detain,
    'exit.approve': A.EXIT_LINES.approve, 'exit.deny': A.EXIT_LINES.deny, 'exit.detain': A.EXIT_LINES.detain, found: A.LINES.found, caseFile: A.LINES.caseFile,
    complain: A.LINES.complain, flagClean: A.LINES.flagClean, flagPlain: A.LINES.flagPlain };
  const report = {};
  let worstCore = 0, within = 0;
  for (const mode of ['expected', 'approve', 'detain', 'deny']) for (let campaign = 0; campaign < 6; campaign++) {
    const rng = A.makeRng(7000 + campaign);
    const heard = { t: 0, m: {} };
    const count = {}, draws = {}, poolOf = {};
    const hear = (pool, line) => { count[line] = (count[line] || 0) + 1; poolOf[line] = pool; draws[pool] = (draws[pool] || 0) + 1; };
    for (let day = 1; day <= 10; day++) {
      const S = camp(day, 7000 + campaign, { shift: { usedLines: [] }, heard });
      const used = S.shift.usedLines;
      // The day plan's slots: story cases bring their own greetings but draw CHUCK's remarks and reactions like any other.
      A.DAY_PLAN[day].slots.forEach((slot, i) => {
        const kind = typeof slot === 'string' ? 'story' : slot.kind || 'clean';
        let expected = 'approve';
        if (kind !== 'story') {
          const c = A.buildCase({ kind, avoidLines: used, shiftLines: used, heard }, S, A.makeRng(campaign * 7919 + day * 131 + i + mode.length));
          used.push(...c.lineKeys);
          c.lineKeys.forEach((l, j) => { A.hearLine(heard, l); hear(j ? 'chuckGreet' : 'greet', l); });
          expected = c.expected;
        }
        const dec = mode === 'expected' ? expected : mode;
        const draw = (k) => hear(k, A.drawFresh(pools[k], used, [], rng.next, heard));
        ['draft', 'decide.' + dec, 'exit.' + dec, rng.chance(0.5) ? 'flagClean' : 'flagPlain'].forEach(draw);
        if (kind === 'q') draw('found');
        if (rng.chance(0.2)) draw('caseFile');
        if (i === 0) draw('complain');
      });
      within += used.length - new Set(used).size;
    }
    Object.entries(count).forEach(([line, n]) => {
      const pool = poolOf[line];
      const size = pool === 'greet' ? A.GREETS.length : pool === 'chuckGreet' ? 0 : pools[pool].length;
      const fair = size ? Math.max(2, Math.ceil(draws[pool] / size)) : 2;
      if (n > fair) fail('line-memory', mode, pool, `heard ${n}× in one campaign (fair share ${fair})`, line);
      report[pool] = Math.max(report[pool] || 0, n);
      if (['draft', 'greet', 'chuckGreet'].includes(pool) || /^(decide|exit)\./.test(pool)) worstCore = Math.max(worstCore, n);
    });
  }
  if (within) fail('line-memory', `${within} repeats inside a shift`);
  if (worstCore > 2) fail('line-memory', `a greeting, draft remark or reaction is heard ${worstCore}× in a campaign`);
  console.log('line memory, most times one line is heard in a 10-day campaign:', JSON.stringify(report));
}

// ---- Templates repeat at most twice per campaign (game.js passes the counts as avoidMax) ------------------------
{
  let over = 0, worst = 0;
  for (let campaign = 0; campaign < 30; campaign++) {
    const count = {}, recent = {};
    for (let day = 1; day <= 10; day++) {
      const S = camp(day, 5000 + campaign);
      const used = [];
      A.DAY_PLAN[day].slots.filter((s) => typeof s !== 'string').forEach((slot, i) => {
        const spec = Object.assign({ kind: 'clean', avoid: used, avoidSoft: [].concat(recent[day - 1] || [], recent[day - 2] || []), avoidMax: Object.keys(count).filter((id) => count[id] >= 2) }, slot);
        const c = A.buildCase(spec, S, A.makeRng(campaign * 31 + day * 7 + i));
        used.push(c.tpl); count[c.tpl] = (count[c.tpl] || 0) + 1;
        (recent[day] = recent[day] || []).push(c.tpl);
      });
    }
    Object.values(count).forEach((v) => { worst = Math.max(worst, v); if (v > 2) over++; });
  }
  if (over) fail('template-repeat', `${over} templates used more than twice in a campaign (worst ${worst})`);
  console.log('template repeats: worst per campaign', worst);
}

// ---- Word-boundary truncation ---------------------------------------------------------------------------------
{
  const rng = A.makeRng(5);
  const words = ['Marina', 'Compliant', 'Burger', '501', 'Cortland', 'Ave.', 'a', 'Steward’s', 'Office,', '“quoted”', 'x'];
  for (let i = 0; i < 3000; i++) {
    const src = Array.from({ length: rng.int(1, 18) }, () => rng.pick(words)).join(' ');
    const max = rng.int(8, 70);
    const out = A.clip(src, max);
    if (out.length > max + 1) fail('clip-length', JSON.stringify(src), max, out);
    if (!out.endsWith('…')) { if (out !== src) fail('clip-changed', src, out); continue; }
    const head = out.slice(0, -1);
    if (/[.,;:]$/.test(head)) fail('clip-punct', out);
    const nextChar = src.charAt(head.length);
    if (head.length && src.startsWith(head) && nextChar && nextChar !== ' ' && !/[.,;:)]/.test(nextChar) && src.indexOf(' ') !== -1 && head.includes(' ')) fail('clip-midword', JSON.stringify(src), max, out);
  }
}

// ---- Round 6: seams, surnames, tells, repeats, evidence, calendar ------------------------------------------------------
// Copy seams: no doubled full stop ("Co.."), no space before a comma or full stop, no double space, anywhere generated.
const SEAM = /(^|[^.])\.\.(?!\.)|\s,|\S {2,}\S|\s\.(?=\s|$)/;
let seamTexts = 0;
const seamCheck = (where, t) => { seamTexts++; if (SEAM.test(String(t))) fail('seams', where, (String(t).match(/.{0,30}(?:\.\.|\s,|\S {2,}\S|\s\.).{0,30}/) || [t])[0]); };
{
  for (let day = 1; day <= 10; day++) for (const seed of [21, 22]) {
    const S = camp(day, seed, { shift: { usedLines: [] }, heard: { t: 0, m: {} } });
    for (const kind of ['clean', 'back', 'q', 'cruel']) for (let k = 0; k < 40; k++) {
      const c = A.buildCase({ kind }, S, A.makeRng(day * 3301 + k * 13 + seed));
      const texts = [c.greet.map((g) => (g && g.text) || g).join(' '), c.chuckGreet, c.appearance, c.truthNote, c.fallout, ...c.clues];
      c.docs.forEach((d) => d.fields.forEach((f) => texts.push(f.v)));
      c.items.forEach((i) => texts.push(i.desc, i.tell || '', i.probe || '', i.clear || ''));
      if (c.cruel) texts.push(c.cruel.note, c.cruel.out);
      if (c.flawFields.length) c.flags = [{ doc: 'draft', field: c.flawFields[0] }];
      A.QUESTIONS.forEach((q) => texts.push(A.answerQuestion(c, q.id, S).text));
      texts.forEach((t) => seamCheck(`d${day} ${kind} ${c.tpl}`, t));
    }
    Object.keys(A.STORY_PEOPLE).forEach((id) => { const c = A.STORY_PEOPLE[id].make(S); c.docs.forEach((d) => d.fields.forEach((f) => seamCheck('story ' + id, f.v))); Object.values(c.exit || {}).forEach((t) => seamCheck('exit ' + id, t)); });
    Object.keys(A.SCENES).forEach((k) => JSON.parse(JSON.stringify(A.SCENES[k](Object.assign({ officer: 'Reyes' }, S)))).forEach((it) => { if (it && it.text) seamCheck('scene ' + k, it.text); }));
  }
  const tot = { refused: 2, softRefused: 3, caught: 6, inspected: 50, readFile: 30 };
  Object.keys(A.ENDINGS).forEach((e) => A.endingText(e, { money: 1234, day: 10, flags: { momPaid: 3, sisterCovered: 5, momSoft: 9, momTier: 3 }, stats: { conscience: 1, party: 0 }, totals: tot, affected: 3 }).forEach((t) => seamCheck('ending ' + e, t)));
  for (let day = 3; day <= 9; day++) for (const money of [500, 30, 0, -40]) {
    const lines = A.momLines({ day, money, flags: { momPaid: 1, momSoft: day > 4 ? day - 1 : null, momTier: day > 4 ? 3 : 2, sisterCovered: day > 6 ? 5 : null }, totals: { refused: 2 }, endless: false });
    lines.forEach((it) => { if (it.text) seamCheck('mom', it.text); (it.choices || []).forEach((ch) => { seamCheck('mom choice', ch.text); (ch.then || []).forEach((t) => seamCheck('mom reply', t.text)); }); });
  }
  console.log(`seams: ${seamTexts} texts scanned`);
}

// The player's surname is nobody else's: set it to every surname a generated person can carry, one at a time.
{
  const universe = new Set();
  A.CITIZENS.concat(A.POI_CITIZENS).forEach((p) => universe.add(A.lastName(p.name)));
  A.CLIENTS.concat(A.SUPPLIERS).forEach((p) => universe.add(A.lastName(p.contact)));
  A.NAMES.empLast.concat(A.NAMES.decoy, A.NAMES.s.slice(0, 60)).forEach((n) => universe.add(n));
  A.NAMES.customers.complaint.concat(A.NAMES.customers.allergy, A.PLACEMENT_KIDS).forEach((n) => universe.add(A.lastName(n)));
  Object.values(A.STAMPS).forEach((s) => s.approver.forEach((n) => universe.add(A.lastName(n))));
  Object.values(A.STORY_VARIANTS).forEach((vs) => vs.forEach((v) => universe.add(v.last)));
  ['Pike', 'Sandoval', 'Garland'].forEach((n) => universe.add(n));
  universe.delete('');
  let tried = 0, cases = 0;
  for (const sur of universe) {
    tried++;
    const seed = 600 + tried;
    const st = A.buildStaff(seed, 72, sur);
    if (st.some((p) => p.last === sur)) fail('player-surname', sur, 'an officer has it');
    const poi = A.campaignPoi(seed, sur);
    if (poi.some((n) => A.lastName(n) === sur)) fail('player-surname', sur, 'a person of interest has it');
    const word = new RegExp(`(^|[^\\w’'-])${sur}($|[^\\w’'-])`);
    for (const day of [2, 5, 8, 10]) {
      const S = camp(day, seed, { officer: sur, staff: st, poi, memory: undefined });
      for (const kind of ['clean', 'back', 'q', 'cruel']) for (let k = 0; k < 4; k++) {
        const c = A.buildCase({ kind }, S, A.makeRng(seed * 31 + day * 7 + k + kind.length));
        cases++;
        const st2 = c.docs.find((d) => d.type === 'stamp');
        const people = [c.last, JSON.stringify(c.ctx.cit || ''), JSON.stringify(c.ctx.oth || ''), JSON.stringify((c.ctx.c || {}).contact || ''), JSON.stringify((c.ctx.s || {}).contact || ''), String(c.ctx.n || ''), String(c.ctx.kid || ''), (c.flaw && c.flaw.wrong) || '', st2 ? stampField(st2, 'by') : '', fieldV(c, 'to') || ''].join(' | ');
        if (word.test(people)) fail('player-surname', sur, `d${day} ${kind} ${c.tpl} names someone ${sur}`, people.slice(0, 140));
      }
      Object.keys(A.STORY_PEOPLE).forEach((id) => { const c = A.STORY_PEOPLE[id].make(S); if (c.last === sur) fail('player-surname', sur, 'story officer', id); });
    }
  }
  console.log(`player surname: ${tried} surnames tried, ${cases} cases`);
}

// One digit off: the changed digit's position is spread across the figure, and some are swaps.
{
  const tot = Object.values(digitPos).reduce((a, b) => a + b, 0);
  const at = (re) => Object.entries(digitPos).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
  const last = at(/^digit:0$/), swaps = at(/^swap/);
  if (!tot) fail('digit-off', 'no one-digit-off flaws generated');
  else {
    if (last / tot > 0.45) fail('digit-off', `the last digit changes in ${Math.round((100 * last) / tot)}% of one-digit-off flaws`);
    if (swaps / tot < 0.15) fail('digit-off', `only ${Math.round((100 * swaps) / tot)}% are swaps`);
  }
  console.log(`digit-off positions (${tot}): last digit ${Math.round((100 * last) / tot)}%, swaps ${Math.round((100 * swaps) / tot)}%, other positions ${Math.round((100 * (tot - last - swaps)) / tot)}%`, JSON.stringify(digitPos));
  const t = weekdaySrc.given + weekdaySrc.calendar;
  const share = srcWeekdayCount.bare / Math.max(1, srcWeekdayCount.bare + srcWeekdayCount.named);
  if (share < 0.3 || share > 0.5) fail('weekday-source', `late dated sources leave the weekday out ${Math.round(share * 100)}% of the time (want about 40%)`);
  if (!weekdaySrc.calendar || !weekdaySrc.given) fail('weekday-source', 'weekday flaws never use one of the two forms', JSON.stringify(weekdaySrc));
  // A wrong weekday can be a Saturday or a Sunday too: a weekend in the draft proves nothing on its own.
  if (!weekdaySrc.weekend) fail('weekday-source', 'a wrong weekday is never Saturday or Sunday', JSON.stringify(weekdaySrc));
  if (calChecked < 100) fail('calendar-months', `only ${calChecked} dates checked against the desk calendar`);
  console.log(`weekday flaws: ${JSON.stringify(weekdaySrc)}; dates in weekday-less sources checked against the desk calendar: ${calChecked}`);
  // Every late day leaves the weekday to the calendar in some cases and gives it in others, not one day all of one kind.
  Object.entries(srcWeekdayByDay).forEach(([d, v]) => { const n = v.bare + v.named; if (n >= 20 && (v.bare / n < 0.2 || v.bare / n > 0.6)) fail('weekday-source', `day ${d}: ${v.bare} of ${n} dated sources leave the weekday out`); });
  // digitOff never lands on a figure the source already gives, however crowded the source is.
  const dr = A.makeRng(99);
  for (let k = 0; k < 400; k++) {
    const t = (k % 3 ? '$' : '#') + dr.int(100, 99999);
    const crowd = [A.digitOff(t, '', A.makeRng(k)).to].concat(Array.from({ length: 12 }, (x, i) => A.digitOff(t, '', A.makeRng(k * 50 + i)).to)).join(' | ');
    const got = A.digitOff(t, crowd, A.makeRng(k));
    if (crowd.split(' | ').includes(got.to)) fail('digit-off', t, 'became', got.to, 'which the source already gives');
  }
  console.log(`weekday sources: ${Math.round(share * 100)}% of late dated sources leave the weekday to the calendar; weekday flaws ${weekdaySrc.calendar}/${t} calendar-only; ${weekdaysChecked} printed weekdays checked`);
}

// Endless: every printed weekday matches the real calendar, past New Year, up to shift 120.
{
  const before = weekdaysChecked;
  for (let day = 1; day <= 120; day += 1) {
    const S = camp(day, 77, { endless: true, endlessStart: 1, flags: {} });
    for (const kind of ['clean', 'back']) for (let k = 0; k < 6; k++) runCase(A.buildCase({ kind }, S, A.makeRng(day * 977 + k * 3 + kind.length)), S, kind, `endless shift ${day} ${kind}`);
    for (const tplId of ['payment-reminder', 'backdate', 'price-increase', 'order-confirm']) {
      const T = A.TEMPLATES.find((x) => x.id === tplId);
      const kind = T.fraudOnly ? 'q' : 'clean';
      runCase(A.buildCase({ kind, tpl: tplId }, S, A.makeRng(day * 31 + tplId.length)), S, kind, `endless shift ${day} ${tplId}`);
    }
  }
  console.log(`endless calendar: ${weekdaysChecked - before} weekdays checked over 120 shifts (to ${A.dayDate(120).toISOString().slice(0, 10)})`);
}

// Decoy surnames: 30 or more, never anyone else's, once each per campaign. Officer quirks: never shared in a department.
{
  if (A.NAMES.decoy.length < 30 || new Set(A.NAMES.decoy).size !== A.NAMES.decoy.length) fail('decoys', `${A.NAMES.decoy.length} decoy surnames (want 30+, unique)`);
  const taken = new Set(A.NAMES.s.concat(A.STORY_SURNAMES, A.NAMES.empLast));
  A.NAMES.decoy.forEach((n) => { if (taken.has(n)) fail('decoys', n, 'is also someone’s surname'); });
  let repeats = 0, used = 0;
  for (let campaign = 0; campaign < 20; campaign++) {
    const S = camp(8, 4400 + campaign, { memory: undefined });
    const seen = [];
    for (let k = 0; k < 200 && seen.length < 25; k++) {
      const c = A.buildCase(Object.assign({ kind: 'q' }, A.campaignAvoid(S)), S, A.makeRng(campaign * 1009 + k));
      if (c.flaw && c.flaw.kind === 'surname') { used++; if (seen.includes(c.flaw.decoy)) repeats++; seen.push(c.flaw.decoy); }
      A.recordCase(S, c);
    }
  }
  if (repeats) fail('decoys', `${repeats} decoy surnames repeated within a campaign`);
  console.log(`decoys: ${A.NAMES.decoy.length} surnames, ${used} wrong-surname flaws over 20 campaigns, ${repeats} repeats`);
  let shared = 0;
  for (let seed = 0; seed < 200; seed++) {
    const by = {};
    A.buildStaff(seed, 72).forEach((p) => { (by[p.dept] = by[p.dept] || []).push(p.quirk); });
    Object.entries(by).forEach(([d, qs]) => { if (qs.length <= A.QUIRKS[d].length && new Set(qs).size !== qs.length) shared++; });
  }
  if (shared) fail('quirks', `${shared} departments deal the same quirk twice`);
  Object.entries(A.QUIRKS).forEach(([d, qs]) => { if (qs.length < 6) fail('quirks', d, `has ${qs.length} quirks`); });
}

// Campaigns run the way game.js runs them: flaw kinds once a shift, the cruel cap counting every flavour, quirks fresh.
{
  let flawDup = 0, cruelLeak = 0, quirkDup = 0, shifts = 0;
  for (let campaign = 0; campaign < 30; campaign++) {
    const S = camp(1, 8100 + campaign, { memory: undefined, metStaff: [] });
    const count = {}, firsts = {};
    for (let day = 1; day <= 10; day++) {
      Object.assign(S, { day });
      const kinds = [], used = [];
      A.DAY_PLAN[day].slots.filter((s) => typeof s !== 'string').forEach((slot, i) => {
        const slots = A.DAY_PLAN[day].slots.filter((s) => typeof s !== 'string');
        let cruelLeft = slots.slice(i + 1).filter((q) => q.kind === 'cruel').length;
        for (let d = day + 1; d <= 10; d++) cruelLeft += A.DAY_PLAN[d].slots.filter((q) => q && q.kind === 'cruel').length;
        const c = A.buildCase(Object.assign({ kind: 'clean', avoid: used, avoidMax: Object.keys(count).filter((id) => count[id] >= 2), avoidFlaws: kinds, cruelLeft }, A.campaignAvoid(S), slot), S, A.makeRng(campaign * 7919 + day * 131 + i));
        used.push(c.tpl); count[c.tpl] = (count[c.tpl] || 0) + 1;
        if (c.flawKey) { if (kinds.includes(c.flawKey)) flawDup++; kinds.push(c.flawKey); }
        const T = A.TEMPLATES.find((t) => t.id === c.tpl);
        const m = S.memory || {};
        if (T.cruel && ((c.cruel && (m.civic || []).includes(c.tpl)) || (!c.cruel && (m.cruel || []).includes(c.tpl)))) cruelLeak++;
        const p = S.staff.find((x) => x.sid === c.sid);
        if (!S.metStaff.includes(c.sid)) { if (firsts[p.quirk]) quirkDup++; firsts[p.quirk] = true; S.metStaff.push(c.sid); }
        A.recordCase(S, c);
      });
      shifts++;
    }
  }
  if (flawDup) fail('flaw-kind-repeat', `${flawDup} shifts reuse a flaw kind`);
  if (quirkDup) fail('quirk-repeat', `${quirkDup} officers met with a quirk already seen this campaign`);
  console.log(`campaign repeats over ${shifts} shifts: flaw kind reused ${flawDup}, cruel template in two flavours ${cruelLeak}, quirk met twice ${quirkDup}`);
  if (cruelLeak) fail('cruel-flavour', `${cruelLeak} cruel templates appeared in another flavour in the same campaign (30 campaigns)`);
}

// Every Withhold or Return has something to point at: a flaggable line or stamp, or a case-file finding.
{
  let checked = 0;
  for (let day = 1; day <= 10; day++) for (const kind of ['back', 'q']) for (let k = 0; k < 60; k++) {
    const S = camp(day, 31);
    const c = A.buildCase({ kind }, S, A.makeRng(day * 1777 + k * 5 + kind.length));
    checked++;
    const stampFlaw = c.flaw && /^stamp/.test(c.flaw.kind) && c.flaw.kind !== 'stampMissing';
    if (!(c.flawFields.length || stampFlaw || c.items.some((i) => i.tell))) fail('evidence', `d${day} ${kind} ${c.tpl} ${c.flaw && c.flaw.kind}: nothing to flag and nothing to find`);
    if (c.flaw && c.flaw.kind === 'fraud' && !c.flawFields.length) fail('evidence', c.tpl, 'fraud lines are not flaggable');
  }
  for (const seed of [1, 2]) Object.keys(A.STORY_PEOPLE).forEach((id) => {
    const c = A.STORY_PEOPLE[id].make(camp(9, seed));
    if (['deny', 'detain'].includes(c.expected) && !(c.flawFields.length || c.items.some((i) => i.tell))) fail('evidence', 'story', id, 'nothing to flag and nothing to find');
  });
  console.log(`evidence: ${checked} Withhold/Return cases each have a flaggable line or a finding`);
}

// Every template's every flaw can be generated, passes the case checks, and maps to a statute.
{
  let covered = 0, total = 0;
  A.TEMPLATES.forEach((T) => {
    (T.flaws || []).forEach((f) => {
      total++;
      const sig = JSON.stringify([f.edit, f.add, f.att, f.tag]);
      for (let k = 0; k < 400; k++) {
        const day = Math.max(T.min, 1 + (k % 5));
        const S = camp(day, 70 + k);
        const kind = f.sev === 'back' ? 'back' : 'q';
        const c = A.buildCase({ kind, tpl: T.id }, S, A.makeRng(k * 97 + T.id.length));
        if (c.flaw && c.flaw.kind === 'tpl' && JSON.stringify([c.flaw.edit, c.flaw.add, c.flaw.att, c.flaw.tag]) === sig) { runCase(c, S, kind, `flaw ${T.id}`); covered++; return; }
      }
      fail('template-flaw', T.id, f.tag, 'never generated');
    });
  });
  console.log(`template flaws: ${covered}/${total} generated and checked, ${A.TEMPLATES.length} templates`);
}

// Story people's own lines (their exits) are theirs: no generic pool shares one, or six words in a row of one.
{
  const generic = [A.GREETS, A.EXIT_LINES.approve, A.EXIT_LINES.deny, A.EXIT_LINES.detain, A.LINES.draft, A.LINES.caseFile, A.LINES.complain, A.LINES.found].flat()
    .concat(...Object.values(A.COLLEAGUE_RUSH), ...Object.values(A.COLLEAGUE_READ));
  const grams = (t) => { const w = t.toLowerCase().replace(/[^a-z’' ]/g, ' ').split(/\s+/).filter(Boolean); return w.map((x, i) => w.slice(i, i + 6).join(' ')).filter((g) => g.split(' ').length === 6); };
  const gen = new Set(generic.flatMap(grams));
  Object.keys(A.STORY_PEOPLE).forEach((id) => {
    const c = A.STORY_PEOPLE[id].make(camp(5, 1));
    if (!c.exit || !c.exit.approve || !c.exit.deny || !c.exit.detain) fail('story-exit', id, 'has no exit lines of its own');
    Object.values(c.exit || {}).concat(c.greet.filter((g) => typeof g === 'string')).forEach((t) => {
      if (generic.includes(t)) fail('story-exit', id, 'a generic pool has this line', t);
      grams(t).forEach((g) => { if (gen.has(g)) fail('story-exit', id, 'shares a phrase with a generic line', g); });
    });
  });
  // One joke per shift across mouths: after a line from a joke family, nothing else from that family is drawn.
  A.JOKE_FAMILIES.forEach((re, fi) => {
    const fam = A.GREETS.concat(A.LINES.chuckGreet.any, A.LINES.draft, A.LINES.decide.deny, A.LINES.decide.detain, A.LINES.decide.approve, A.CHUCK_CONFIDENT, A.LINES.found, A.LINES.flagClean, A.LINES.flagPlain, A.LINES.caseFile, A.EXIT_LINES.deny, A.EXIT_LINES.approve, A.EXIT_LINES.detain).filter((l) => re.test(l));
    if (fam.length < 2) return;
    for (let k = 0; k < 20; k++) {
      const used = [fam[k % fam.length]];
      const pool = A.LINES.chuckGreet.any.concat(A.GREETS, A.LINES.draft, A.CHUCK_CONFIDENT, A.LINES.decide.deny, A.LINES.found, A.LINES.flagClean, A.LINES.caseFile, A.EXIT_LINES.deny, A.EXIT_LINES.approve, A.EXIT_LINES.detain, A.LINES.decide.detain, A.LINES.decide.approve, A.LINES.flagPlain).filter((l) => re.test(l) && !used.includes(l));
      if (pool.length && A.jokesOf(A.drawFresh(pool.concat(['A line from no family at all.']), used, [], A.makeRng(k).next)).includes(fi)) fail('joke-family', 'drew the same joke twice in a shift', re);
    }
  });
}

// The desk calendar's pages match the real calendar, 2031 to 2033.
{
  for (let y = 2031; y <= 2033; y++) for (let m = 1; m <= 12; m++) {
    const page = A.calendarMonth(y, m);
    const flat = page.weeks.flat();
    for (let d = 1; d <= page.days; d++) {
      const real = new Date(Date.UTC(y, m - 1, d));
      if (real.getUTCMonth() !== m - 1) fail('calendar', y, m, d, 'is not in the month');
      const at = flat.indexOf(d);
      if (at < 0 || at % 7 !== real.getUTCDay()) fail('calendar', `${y}-${m}-${d} sits under ${page.weekdays[at % 7]}`);
    }
    if (new Date(Date.UTC(y, m - 1, page.days + 1)).getUTCMonth() === m - 1) fail('calendar', y, m, 'is missing days');
    if (page.weeks.some((w) => w.length !== 7)) fail('calendar', y, m, 'has a short week');
  }
  if (A.calendarMonth(2031, 11).weeks[0][6] !== 1 || A.calendarMonth(2031, 11).weeks[2][1] !== 10) fail('calendar', 'November 2031 does not start on a Saturday with Monday the 10th');
}

// Ending keys were renamed; the old ones still resolve.
if (A.endingKey('walked_out') !== 'relocated' || A.endingKey('replaced') !== 'autosigned' || !A.ENDINGS.relocated || !A.ENDINGS.autosigned || A.ENDINGS.walked_out || A.ENDINGS.replaced) fail('ending-keys', 'renamed keys do not resolve');

console.log('flaw kinds seen', JSON.stringify(seen));
console.log(JSON.stringify(counts));
console.log('cases', n, 'problems', problems, JSON.stringify(checks));
process.exitCode = problems ? 1 : 0;
