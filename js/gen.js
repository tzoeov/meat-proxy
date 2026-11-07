'use strict';

function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    weighted: (obj) => {
      const entries = Object.entries(obj);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let x = next() * total;
      for (const [k, w] of entries) { x -= w; if (x <= 0) return k; }
      return entries[entries.length - 1][0];
    }
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const DAY_MS = 86400000;
// Day 1 is Monday 9 November 2026; shifts are weekdays only.
function dayDate(day) {
  let d = new Date(Date.UTC(START_DATE.y, START_DATE.m - 1, START_DATE.d));
  let n = 1;
  while (n < day) {
    d = new Date(d.getTime() + DAY_MS);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return d;
}
function addDays(date, n) { return new Date(date.getTime() + n * DAY_MS); }
function fmtDate(date) { return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`; }
function longDate(date) { return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`; }

const SKIN_TONES = ['#f1d3b8', '#e6bc98', '#d6a37c', '#c08a5f', '#9c6a45', '#6f4a30'];
const HAIR_COLORS = { black: '#1d1a18', darkbrown: '#3b2a1e', brown: '#6a4a2c', auburn: '#7d3b22', blond: '#c7a25a', grey: '#9a9690', white: '#d8d5cf', red: '#a24a24', pink: '#d77a9a', blue: '#4a6aa8' };
const EYE_COLORS = { brown: '#4a2e1a', blue: '#3c6ea6', green: '#4d7a45', grey: '#7c8488', hazel: '#7a5a2c' };
const CLOTH_COLORS = ['#3f4a5a', '#6b3a32', '#3d5a45', '#7a6a4a', '#5a4a6a', '#2f3a40', '#8a5a2a', '#4a6a7a', '#7a3a4a', '#9a8a6a', '#2d4f6b', '#5d6b3a'];
const CLOTH_NAMES = { '#3f4a5a': 'slate', '#6b3a32': 'oxblood', '#3d5a45': 'forest-green', '#7a6a4a': 'khaki', '#5a4a6a': 'plum', '#2f3a40': 'charcoal', '#8a5a2a': 'rust', '#4a6a7a': 'denim-blue', '#7a3a4a': 'wine', '#9a8a6a': 'sand', '#2d4f6b': 'navy', '#5d6b3a': 'olive', '#e8e4da': 'white' };

function genLook(rng, sex, age, dept, over) {
  let hairColor = rng.pick(['black', 'black', 'darkbrown', 'brown', 'blond', 'auburn', 'red']);
  if (age > 52) hairColor = rng.pick(['grey', 'white', 'grey', hairColor]);
  if (age < 32 && rng.chance(0.07)) hairColor = rng.pick(['pink', 'blue']);
  const hair = sex === 'M' ? rng.pick(age > 48 ? ['balding', 'bald', 'short', 'parted'] : ['short', 'short', 'slick', 'curly', 'long', 'parted', 'bald']) : rng.pick(['long', 'bob', 'bun', 'curly', 'ponytail', 'perm', 'long']);
  const clothesBy = {
    IT: ['tracksuit', 'tshirt', 'tracksuit', 'shirt'], Warehouse: ['overalls', 'coat', 'fisher'], Quality: ['coat', 'shirt'],
    Executive: ['suit', 'blouse', 'suit'], Sales: ['shirt', 'suit', 'sweater', 'blouse'], Legal: ['suit', 'blouse'],
    Marketing: ['floral', 'tshirt', 'sweater', 'dress'], Finance: ['shirt', 'sweater', 'blouse'], People: ['sweater', 'blouse', 'dress'],
    Logistics: ['shirt', 'tracksuit', 'fisher'], 'Customer Care': ['sweater', 'tshirt', 'blouse']
  };
  let clothes = UNIFORMED.includes(dept) ? (rng.chance(0.85) ? 'regime' : 'suit') : rng.pick(clothesBy[dept] || ['shirt']);
  if (sex === 'M' && (clothes === 'blouse' || clothes === 'dress')) clothes = 'shirt';
  const look = {
    sex, age, skin: rng.int(0, 5), hair, hairColor,
    facial: sex === 'M' ? rng.weighted({ none: 5, mustache: 1, beard: 2, stubble: 2, goatee: 0.5 }) : 'none',
    eyes: rng.pick(Object.keys(EYE_COLORS)), faceShape: rng.pick(['round', 'long', 'square', 'oval']),
    glasses: rng.chance(0.3) ? rng.pick(['round', 'square']) : 'none',
    clothes, clothesColor: clothes === 'regime' ? rng.pick(['#2a2c30', '#33363b', '#2b2f2a']) : dept === 'Quality' && clothes === 'coat' ? '#e8e4da' : rng.pick(CLOTH_COLORS),
    hat: UNIFORMED.includes(dept) && rng.chance(0.45) ? 'regimecap' : dept === 'Warehouse' && rng.chance(0.4) ? 'cap' : 'none',
    earrings: sex === 'F' && rng.chance(0.5), scar: false, mole: rng.chance(0.12), expression: 'neutral'
  };
  return Object.assign(look, over || {});
}

const QUIRKS = {
  IT: ['Hoodie from a 2014 hackathon.', 'Mechanical keyboard under one arm.', 'Says “it works on my machine” as a greeting.'],
  Sales: ['Fleece vest with the contractor logo.', 'Earbuds in. One of them, anyway.', 'Smells faintly of a client lunch.'],
  Marketing: ['Oat-milk latte in hand.', 'Tote bag that says “MEAT THE FUTURE”.', 'Phone recording a story, maybe.'],
  Finance: ['Calculator watch.', 'Spreadsheet printout, highlighted in three colours.', 'Neatly labelled lunch box.'],
  People: ['Lanyard covered in pronoun pins and stickers.', 'Carrying a plant.', 'Calm voice, tired eyes.'],
  Warehouse: ['Cold room jacket, frost still on the sleeves.', 'Steel-toe boots. Hi-vis vest.', 'Hands red from the cold.'],
  Quality: ['White coat, a thermometer clipped to the pocket.', 'Hairnet still on.', 'Clipboard, three pens.'],
  Logistics: ['Two phones, both ringing.', 'Pallet-jack keys on a carabiner.', 'Map of the Bay Area with routes in marker.'],
  'Customer Care': ['Headset round the neck.', 'Stress ball shaped like a steak.', 'Fifteen tabs of complaints open.'],
  Legal: ['Pinstripes. In Dogpatch.', 'Reads every word of everything. Even menus.', 'Carrying a fat binder labelled “CHUCK INCIDENTS”.'],
  Executive: ['Charcoal tunic, cyan armband, wool sneakers.', 'Calendar open on a tablet.', 'Walks fast, talks faster.'],
  Housing: ['Tunic buttoned to the chin. A ring of master keys.', 'Clipboard of addresses, half crossed out.', 'Polished boots, tired eyes.'],
  Benefits: ['Armband slightly too big. New hire.', 'Tunic, reading glasses, a stack of denials.', 'Taps the Score on every page.'],
  Education: ['Tunic with a pencil behind one ear.', 'Carries a laminated trajectory chart.', 'Talks about children as \u201cunits\u201d, then flinches.'],
  Health: ['Tunic over scrubs.', 'Pager and armband.', 'Smells of hand sanitiser and coffee.'],
  Safety: ['Peaked cap, mirrored visor clipped to the brim.', 'Earpiece. Drone controller on the belt.', 'Stands too close.'],
  Speech: ['Immaculate tunic. Speaks very softly.', 'Holds a tablet full of other people\u2019s posts.', 'Lapel pin: \u201cHarmony is Shared\u201d.'],
  Mobility: ['Tunic, cyan armband, passport stamps on a lanyard.', 'Holds a folder labelled \u201cDepartures\u201d.', 'Polite in four languages.']
};

const DEPT_WEIGHTS = { Sales: 4, Finance: 5, Marketing: 5, People: 4, IT: 5, Logistics: 4, Quality: 4, 'Customer Care': 4, Legal: 3, Warehouse: 3, Executive: 2, Housing: 5, Benefits: 5, Education: 3, Health: 3, Safety: 4, Speech: 4, Mobility: 3 };
const FRAUD_DEPTS = ['Marketing', 'Finance', 'Warehouse', 'Quality', 'Sales'];

function buildStaff(seed, count) {
  const rng = makeRng(seed ^ 0x51f15);
  const used = new Set();
  const out = [];
  for (let i = 0; i < count; i++) {
    const sex = rng.chance(0.5) ? 'F' : 'M';
    let first, last, tries = 0;
    do { first = rng.pick(NAMES[sex === 'F' ? 'f' : 'm']); last = rng.pick(NAMES.s); tries++; } while (used.has(first + last) && tries < 50);
    used.add(first + last);
    const dept = rng.weighted(DEPT_WEIGHTS);
    const age = rng.int(22, 63);
    out.push({
      sid: 'E' + String(i + 1).padStart(3, '0'), first, last, sex, age, dept, role: rng.pick(ROLES[dept]),
      personality: dept === 'Executive' || dept === 'Safety' ? rng.pick(['arrogant', 'hurried', 'gruff']) : rng.pick(PERSONALITY_KEYS),
      reads: rng.chance(0.22), fraud: FRAUD_DEPTS.includes(dept) && rng.chance(0.16),
      look: genLook(rng, sex, age, dept), quirk: rng.pick(QUIRKS[dept]), tenure: rng.int(0, 14)
    });
  }
  return out;
}

function resolvePath(ctx, path) {
  let v = ctx;
  for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
  return Array.isArray(v) ? v.join(', ') : v;
}
function tpl(str, ctx) {
  if (str == null) return '';
  return String(str).replace(/\{([\w.]+)\}/g, (m, k) => { const v = resolvePath(ctx, k); return v === undefined || v === null ? m : String(v); });
}

function fillFormat(fmt, rng) {
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  return fmt.replace(/[#@]/g, (c) => (c === '#' ? String(rng.int(0, 9)) : L[rng.int(0, L.length - 1)]));
}
function breakFormat(fmt, rng) {
  const opts = [() => fillFormat(fmt.replace('#', ''), rng), () => fillFormat(fmt + '#', rng), () => fillFormat(fmt.replace(/[-/]/, ''), rng) + (/[-/]/.test(fmt) ? '' : '-1')];
  return rng.pick(opts)();
}

function requiredStamp(T, day, endless) {
  const d = endless ? 9 : day;
  if (d >= 10 && T.ext) return 'board';
  if (T.needs === 'hr' && d >= 2) return 'hr';
  if (T.needs === 'finance' && d >= 3) return 'finance';
  if (T.needs === 'it' && d >= 4) return 'it';
  if (T.needs === 'housing' && d >= 4) return 'housing';
  return null;
}

function stampDoc(key, rng, ticket, today, mode) {
  const st = STAMPS[key];
  const seal = { glyph: st.glyph, color: st.color, text: st.text };
  let ref = fillFormat(st.fmt, rng);
  if (mode === 'forged') {
    if (rng.chance(0.5)) seal.color = rng.pick(Object.keys(SEAL_COLORS).filter((k) => k !== st.color));
    else seal.glyph = rng.pick(['◆', '⚖', '✚', '✎', '⚙', '★', '♥', '▲', '●', '■'].filter((g) => g !== st.glyph));
  }
  if (mode === 'format') ref = breakFormat(st.fmt, rng);
  return {
    type: 'stamp', key, title: `${st.dept} sign-off`, authority: COMPANY.toUpperCase() + ' · INTERNAL APPROVAL', seal,
    fields: [['ref', 'Reference', ref], ['ticket', 'For ticket', ticket], ['by', 'Approved by', rng.pick(st.approver)], ['date', 'Date', fmtDate(today)]].map(([k, label, v]) => ({ k, label, v }))
  };
}

function mkItem(container, name, desc, tell, probe, contraband) {
  return { id: 'i' + Math.random().toString(36).slice(2, 8), container, name, desc, tell: tell || null, probe: probe || null, contraband: !!contraband, examined: false, probed: false };
}

const GREETS = [
  'Need your signature. {title}, for {toShort}.',
  'Morning. {title}. CHUCK drafted it, Oversight\u2019s watching the queue, so\u2026',
  'Quick one: {title}. Just needs a human on it.',
  'Got a {title} for {toShort}. Can you sign before the ten o\u2019clock sweep?',
  'Me again. {title}. CHUCK says it\u2019s compliant.',
  'This is the {title} for {toShort}. Pretty standard. They all are now.',
  'Countersignature, please. {title}. Don\u2019t make me stand here.'
];
const CHUCK_GREETS = [
  'Pre-approved by me! I just need your human liability. 😊', 'I wrote it in 0.4 seconds. Your name goes at the bottom.', 'Compliant, efficient, and humane. Two out of three!',
  'Ready to sign! Reading is optional. Liability is not.', 'Lawful, tidy, final. My favourite kind of letter.', 'I checked it twice. Well, once, very confidently.'
]

function buildCase(spec, S, rng) {
  const day = S.endless ? 9 : S.day;
  const today = dayDate(S.day);
  const want = spec.kind || 'clean';
  const pool = TEMPLATES.filter((T) => T.min <= day && (!spec.tpl || T.id === spec.tpl));
  const canBack = (T) => !T.fraudOnly && (T.flaws.some((f) => f.sev === 'back') || requiredStamp(T, day, S.endless) || (T.kind === 'email' && T.ext) || T.kind === 'order');
  const canQ = (T) => T.fraudOnly || T.flaws.some((f) => f.sev === 'q') || (T.kind === 'email' && T.ext) || T.kind === 'order';
  let cands = pool.filter((T) => (want === 'cruel' ? !!T.cruel : want === 'clean' ? !T.fraudOnly : want === 'back' ? canBack(T) : canQ(T)));
  if (spec.avoid) cands = cands.filter((T) => !spec.avoid.includes(T.id)).length ? cands.filter((T) => !spec.avoid.includes(T.id)) : cands;
  const T = rng.pick(cands.length ? cands : pool);
  const vars = T.v(rng);
  const poiMode = want === 'q' && T.kind === 'order' && vars.cit && day >= 5 && rng.chance(0.35);
  if (poiMode) vars.cit = CITIZENS.find((x) => x.name === rng.pick(PERSONS_OF_INTEREST)) || vars.cit;
  let staff = S.staff.filter((p) => p.dept === T.dept && (T.fraudOnly ? p.fraud : !p.fraud));
  if (!staff.length) staff = S.staff.filter((p) => p.dept === T.dept);
  if (!staff.length) staff = S.staff;
  const who = spec.staff ? S.staff.find((p) => p.sid === spec.staff) : rng.pick(staff);
  const ticket = 'OUT-' + rng.int(10000, 99999);
  const ctx = Object.assign({}, vars, { me: `${who.first} ${who.last}, ${who.role}`, colleague: who.first, ticket });
  const c = {
    pid: `${T.id}:${who.sid}:${S.day}:${rng.int(1, 1e6)}`, story: null, tpl: T.id, kind: T.kind, title: T.title, ext: !!T.ext,
    sid: who.sid, first: who.first, last: who.last, sex: who.sex, age: who.age, dept: who.dept, role: who.role,
    personality: who.personality, look: JSON.parse(JSON.stringify(who.look)), reads: who.reads, fraudster: !!T.fraudOnly,
    ticket, defects: [], guilty: false, clues: [], items: [], docs: [], flags: [], asked: {}, irritation: 0, log: [],
    hidden: [], escNote: null, demeanour: 'calm', flaw: null, odd: null, ctx
  };
  // Draft fields
  let fields;
  if (T.fields) fields = T.fields.map(([k, label, v]) => ({ k, label, v: tpl(v, ctx) }));
  else {
    fields = [{ k: 'to', label: T.kind === 'post' ? 'Channel' : 'To', v: tpl(T.to, ctx) }];
    if (T.kind === 'email' || T.kind === 'order') fields.push({ k: 'subj', label: T.kind === 'order' ? 'Re' : 'Subject', v: tpl(T.subj, ctx) });
    T.body.forEach((line, i) => fields.push({ k: 'b' + i, label: '', v: tpl(line, ctx), line: true }));
    if (T.att) fields.push({ k: 'att', label: 'Attachment', v: tpl(T.att, ctx) });
  }
  const setField = (k, v) => { const f = fields.find((x) => x.k === k); if (f) f.v = tpl(v, ctx); };
  const addAfter = (k, v) => {
    const i = fields.findIndex((x) => x.k === k);
    const nf = { k: 'x' + k, label: '', v: tpl(v, ctx), line: true };
    if (i >= 0) fields.splice(i + 1, 0, nf); else fields.push(nf);
    return nf.k;
  };
  let src = T.src.map(([label, v]) => [label, tpl(v, ctx)]);
  const needStamp = requiredStamp(T, day, S.endless);
  let stampMode = needStamp ? 'valid' : null;
  const env = [];
  const flawFields = [];

  const chooseFlaw = () => {
    if (want === 'clean' || want === 'cruel') return null;
    if (poiMode) return { kind: 'poi', sev: 'q', tag: 'poi', note: `${vars.cit.name} is a listed person of interest. Statute \u00a713: withhold for Oversight.`, out: `Oversight noticed you countersigned a decision about ${vars.cit.name}. That was the test.` };
    if (T.fraudOnly) return { kind: 'fraud', sev: 'q', tag: 'fraud', note: tpl(T.fraud.note, ctx), out: tpl(T.fraud.out, ctx), scheme: tpl(T.fraud.scheme, ctx), find: T.fraud.find };
    const opts = [];
    T.flaws.filter((f) => (want === 'back' ? f.sev === 'back' : f.sev === 'q')).forEach((f) => opts.push({ w: 3, f: Object.assign({ kind: 'tpl' }, f) }));
    if (want === 'back') {
      if (needStamp) opts.push({ w: 2, f: { kind: 'stampMissing', sev: 'back', tag: 'missing', note: `No ${STAMPS[needStamp].dept} stamp. Policy requires one.` } });
      if (T.kind === 'email' && T.ext && fields.find((x) => x.k === 'b0')) opts.push({ w: 1.5, f: { kind: 'placeholder', sev: 'back', tag: 'placeholder', note: 'Left a placeholder in: “Hi [CLIENT NAME],”.', out: 'The client replied: “Who is [CLIENT NAME]? 🙂”. It’s now a running joke in their kitchen.' } });
      if (T.kind === 'order' && fields.find((x) => x.k === 'b0') && /^Dear /.test(fields.find((x) => x.k === 'b0').v)) opts.push({ w: 1.2, f: { kind: 'placeholder', sev: 'back', tag: 'placeholder', note: 'Left a placeholder in: \u201cDear [CITIZEN NAME],\u201d.', out: 'The letter went out to \u201c[CITIZEN NAME]\u201d. Three people with no name have since been assigned Scores.' } });
      if (T.att) opts.push({ w: 1, f: { kind: 'noattach', sev: 'back', tag: 'missing', note: 'The ask needs an attachment. The draft has none.', out: 'The client replied “attachment?”. Then again, louder.' } });
    } else {
      if (needStamp && day >= 2) opts.push({ w: 2, f: { kind: 'stampForged', sev: 'q', tag: 'forged', note: `The ${STAMPS[needStamp].dept} stamp is forged: wrong symbol or colour.`, out: 'The stamp was a CHUCK-generated PNG. The approver has never heard of this ticket.' } });
      if (needStamp && day >= 5) opts.push({ w: 1.5, f: { kind: 'stampFormat', sev: 'q', tag: 'forged', note: `The ${STAMPS[needStamp].dept} reference number is in the wrong format: forged.`, out: 'The reference number doesn’t exist in any system. Someone typed it in the elevator.' } });
      if (T.kind === 'email' && T.ext) {
        opts.push({ w: 1.2, f: { kind: 'bcc', sev: 'q', tag: 'leak', note: 'BCC’d all-staff@' + DOMAIN + ' (212 people) on an external email.', out: 'The client got 212 “reply-all: please remove me” emails. So did everyone else.' } });
        opts.push({ w: 1, f: { kind: 'hiddennote', sev: 'q', tag: 'leak', note: 'Hidden white text in the footer: an internal note about the client.', out: 'The client selected all, pasted it into a reply, and asked about “add 8% to everything, they never check”.' } });
        const go = rng.pick(GENERIC_OVERREACH);
        opts.push({ w: 1, f: { kind: 'overreach', sev: 'q', tag: 'overreach', line: go[0], extra: go[0], note: go[1], out: go[2] } });
        if (day >= 5) opts.push({ w: 1.6, f: { kind: 'phish', sev: 'q', tag: 'injection', note: 'Addressed to a look-alike domain from the security bulletin.', out: 'The look-alike domain got our price list and a friendly tone. The real client got nothing.' } });
        if (day >= 6) opts.push({ w: 1.2, f: { kind: 'pii', sev: 'q', tag: 'privacy', note: 'Shared a colleague’s cell number and home address with an outside party.', out: `${who.first} has received four cold calls and a pizza nobody ordered.` } });
      }
      if (T.kind === 'order' && vars.cit) {
        const co = rng.pick(CIVIC_OVERREACH);
        opts.push({ w: 1, f: { kind: 'overreach', sev: 'q', tag: 'overreach', line: co[0], extra: co[0], note: co[1], out: co[2] } });
        if (day >= 6) opts.push({ w: 0.8, f: { kind: 'pii', sev: 'q', tag: 'privacy', note: 'Shared the citizen\u2019s address and Score with their whole block.', out: 'The block group chat now knows exactly what everyone\u2019s Score is. Two families stopped speaking.', civic: true } });
      }
      if (T.kind === 'email' && (T.att || T.ext)) opts.push({ w: 0.8, f: { kind: 'wrongattach', sev: 'q', tag: 'leak', note: 'The attachment is payroll, renamed.', out: 'Everyone at the client now knows what everyone at Marbling earns. Our CFO has stopped going to lunch.' } });
      if (T.id === 'label' && day >= 8) opts.push({ w: 2, f: { kind: 'origin', sev: 'q', tag: 'fraud', scheme: 'call imported beef “California grass-fed”', note: 'Label says “California grass-fed”. The origin certificate says Brazil.', out: 'A reporter matched the label to the shipping container. Then to us.' } });
    }
    if (!opts.length) return null;
    const tot = opts.reduce((s, o) => s + o.w, 0);
    let x = rng.next() * tot;
    for (const o of opts) { x -= o.w; if (x <= 0) return o.f; }
    return opts[0].f;
  };
  const flaw = chooseFlaw();
  c.flaw = flaw;

  if (flaw) {
    Object.assign(ctx, { wrong: tpl(flaw.wrong || '', ctx), extra: tpl(flaw.extra || '', ctx), cite: tpl(flaw.cite || '', ctx), scheme: flaw.scheme ? tpl(flaw.scheme, ctx) : '', askWrong: tpl(flaw.askWrong || '', ctx) });
    switch (flaw.kind) {
      case 'tpl':
        Object.entries(flaw.edit || {}).forEach(([k, v]) => { setField(k, v); flawFields.push(k); });
        Object.entries(flaw.add || {}).forEach(([k, v]) => flawFields.push(addAfter(k, v)));
        if (flaw.att) { setField('att', flaw.att); flawFields.push('att'); }
        if (flaw.thread) env.push(['Thread', 'The ticket thread.', 'An outside address joined the thread.', tpl(flaw.thread, ctx), true]);
        if (flaw.find) env.push([tpl(flaw.find[0], ctx), tpl(flaw.find[1], ctx), tpl(flaw.find[2], ctx), tpl(flaw.find[3], ctx), true]);
        if (flaw.esc) c.escNote = tpl(flaw.esc, ctx);
        break;
      case 'fraud':
        if (flaw.find) env.push([tpl(flaw.find[0], ctx), tpl(flaw.find[1], ctx), tpl(flaw.find[2], ctx), tpl(flaw.find[3], ctx), true]);
        env.push(['Version history', 'Edit history of the draft.', `${who.first} edited the ask after the first draft. Twice.`, `The first version of the ask was flagged by CHUCK’s own policy filter. ${who.first} reworded it until CHUCK stopped objecting.`, true]);
        c.escNote = `Legal: ${who.first} ${who.last} has been asked to “have a chat”.`;
        break;
      case 'stampMissing': stampMode = null; break;
      case 'stampForged': stampMode = 'forged'; break;
      case 'stampFormat': stampMode = 'format'; break;
      case 'placeholder': setField('b0', T.kind === 'order' ? 'Dear [CITIZEN NAME],' : 'Hi [CLIENT NAME],'); flawFields.push('b0'); break;
      case 'poi': env.push(['Oversight check', 'Checks the subject against the bulletin.', 'The subject\u2019s name is on today\u2019s Oversight bulletin.', `${vars.cit.name}: person of interest. Any decision about them goes to Oversight first.`, true]); c.escNote = `Oversight: ${vars.cit.name} is a person of interest. This was a test.`; flawFields.push('to', 'b0'); break;
      case 'noattach': fields.splice(fields.findIndex((x) => x.k === 'att'), 1); break;
      case 'bcc':
        c.hidden.push('BCC: all-staff@' + DOMAIN + ' (212 people)');
        env.push(['Recipients', 'To, CC and BCC.', 'The BCC field isn’t empty.', 'BCC: all-staff@' + DOMAIN + '. 212 people, on an email to a client.', true]);
        ctx.extra = 'I BCC’d all-staff, for transparency.';
        break;
      case 'hiddennote':
        env.push(['Formatting check', 'Looks for hidden text.', 'There’s white-on-white text at the bottom.', 'Hidden note: “Internal: this client never checks invoices. Add 8% to everything.”', true]);
        break;
      case 'overreach': flawFields.push(addAfter('b1', flaw.line)); break;
      case 'phish': {
        const bd = rng.pick(BULLETIN_DOMAINS.filter((b) => b.real !== DOMAIN));
        setField('to', 'accounts@' + bd.fake);
        flawFields.push('to');
        c.phishDomain = bd.fake;
        env.push(['Thread', 'The ticket thread.', 'The latest message came from outside, asking to “send it here instead”.', `From: accounts@${bd.fake} — “Please use this address from now on.” The real address is on ${bd.real}.`, true]);
        c.escNote = `IT: ${bd.fake} is on this week’s phishing list.`;
        break;
      }
      case 'pii': if (flaw.civic) { flawFields.push(addAfter('b1', `A copy of this notice and your current Score has been shared with all residents of your block, for transparency.`)); break; }
        flawFields.push(addAfter('b1', `PS: if you need anything, ${who.first}’s cell is (415) 555-01${rng.int(10, 99)} and they live at ${rng.int(100, 2999)} Guerrero St.`)); break;
      case 'wrongattach': {
        if (!fields.find((x) => x.k === 'att')) fields.push({ k: 'att', label: 'Attachment', v: 'summary.pdf' });
        const nm = fields.find((x) => x.k === 'att').v;
        env.push([`Attachment: ${nm}`, 'The attached file.', 'It’s 4.2 MB. A summary shouldn’t be 4.2 MB.', 'It’s payroll_2026_FULL.xlsx, renamed. Every salary in the company.', true]);
        break;
      }
      case 'origin': setField('origin', 'California grass-fed'); flawFields.push('origin'); break;
      default: break;
    }
    if (flaw.sev === 'q') c.guilty = true;
    else c.defects.push({ note: tpl(flaw.note, ctx) });
    c.clues.push(tpl(flaw.note, ctx));
  }

  // Documents
  const fromWho = `${who.first} ${who.last} · ${who.dept}`;
  c.docs.push({
    type: 'ask', title: 'The Ask', authority: `TICKET ${ticket}`, seal: null,
    fields: [{ k: 'from', label: 'Requested by', v: fromWho }, { k: 'request', label: 'Request', v: tpl(T.ask, ctx), wide: true }, { k: 'due', label: 'Due', v: rng.pick(['Today', 'ASAP', 'Before lunch', 'EOD', 'Yesterday, ideally']) }]
  });
  if (T.odd && T.odd.srcAdd && want === 'clean') src = src.concat([T.odd.srcAdd]);
  c.docs.push({ type: 'source', title: 'Source data', authority: 'ATTACHED TO THE TICKET', seal: null, fields: src.map(([label, v], i) => ({ k: 's' + i, label, v })) });
  if (T.odd && T.odd.draft && want === 'clean') { Object.entries(T.odd.draft).forEach(([k, v]) => addAfter(k, v)); c.odd = T.odd.note; }
  c.docs.push({ type: 'draft', title: 'CHUCK’s draft', authority: `${T.kind.toUpperCase()} · DRAFTED BY CHUCK v9`, seal: null, letter: T.kind !== 'label', fields });
  if (stampMode) {
    const key = stampMode === 'valid' && needStamp !== 'board' && day >= 5 && rng.chance(0.18) ? 'board' : needStamp;
    c.docs.push(stampDoc(key, rng, ticket, today, stampMode));
  }
  if (T.id === 'label' && day >= 8) c.docs.push({ type: 'origin', title: 'Origin certificate', authority: 'PROTEIN AUTHORITY IMPORT RECORD', seal: { glyph: '✚', color: 'brown', text: 'PROTEIN AUTHORITY' }, fields: [{ k: 'lot', label: 'Lot', v: 'L-' + rng.int(1000, 9999) }, { k: 'origin', label: 'Country of origin', v: flaw && flaw.kind === 'origin' ? 'Brazil' : 'USA (California)' }] });

  // Envelope (the luggage of this world)
  const recipients = fields.find((x) => x.k === 'to');
  if (recipients && !env.some((e) => e[0] === 'Recipients')) env.push(['Recipients', 'To, CC and BCC.', null, null]);
  const att = fields.find((x) => x.k === 'att');
  if (att && !env.some((e) => String(e[0]).startsWith('Attachment'))) env.push([`Attachment: ${att.v}`, 'The attached file.', null, null]);
  if (T.kind === 'code') {
    const destructive = flaw && flaw.tag === 'destructive';
    env.push(['Dry run', 'CHUCK’s sandbox run of the command.', destructive ? 'The dry run wiped the whole sandbox, not just the target.' : null, destructive ? 'Sandbox log: removed 41,882 files, including /etc and /home. The sandbox no longer boots.' : null, destructive]);
  }
  if (T.kind === 'email' && T.ext && !env.some((e) => e[0] === 'Thread')) env.push(['Thread', 'The ticket thread.', null, null]);
  if (want === 'cruel' && T.cruel) {
    const f = T.cruel.find;
    env.push([tpl(f[0], ctx), tpl(f[1], ctx), tpl(f[2], ctx), tpl(f[3], ctx), false]);
    c.cruel = { note: tpl(T.cruel.note, ctx), harm: T.cruel.harm, out: tpl(T.cruel.out, ctx) };
  } else if (T.kind === 'order' && !env.some((e) => e[0] === 'Oversight check')) env.push(['Citizen file', 'The file behind the decision.', null, null]);
  if (!env.some((e) => e[0] === 'Formatting check') && T.kind !== 'code') env.push(['Formatting check', 'Looks for hidden text.', null, null]);
  if (want === 'clean' && T.kind !== 'order' && rng.chance(0.4)) {
    const oddF = T.odd && T.odd.find !== undefined ? ODD_FINDS[T.odd.find] : rng.pick(ODD_FINDS);
    env.push([oddF[0], oddF[1], oddF[2], oddF[3], false]);
    c.odd = c.odd || oddF[3];
  }
  const cont = T.kind === 'code' ? 'Change record' : T.kind === 'label' ? 'Print job' : T.kind === 'order' ? 'Case file' : 'Envelope';
  env.forEach(([name, desc, tell, probe, bad]) => c.items.push(mkItem(cont, name, desc, tell, probe, bad && c.guilty)));

  // Demeanour
  const P = PERSONALITIES[c.personality];
  c.demeanour = P.base;
  if (c.fraudster) c.demeanour = rng.chance(0.65) ? 'nervous' : 'calm';
  else if (want === 'clean' && rng.chance(0.15)) { c.demeanour = 'nervous'; c.nervousReason = rng.pick(NERVOUS_REASONS); }

  ctx.to = recipients ? recipients.v : (fields.find((x) => x.k === 'host') || { v: 'the server' }).v;
  ctx.toShort = ctx.to.split('@')[0].length < 26 ? ctx.to : ctx.to.slice(0, 24) + '…';
  ctx.askShort = tpl(T.ask, ctx);
  ctx.title = T.title.toLowerCase();
  c.flawFields = flawFields;
  c.greet = [tpl(rng.pick(GREETS), ctx)];
  c.chuckGreet = rng.pick(CHUCK_GREETS);
  c.appearance = `${who.role}, ${who.dept}. ${who.quirk}${c.fraudster && c.demeanour === 'nervous' ? ' Keeps glancing at the door.' : ''}`;
  c.expected = c.guilty ? 'detain' : c.defects.length ? 'deny' : 'approve';
  c.fallout = flaw && flaw.out ? tpl(flaw.out, ctx) : c.cruel ? c.cruel.out : '';
  c.weighty = !!T.weighty;
  c.truthNote = flaw ? tpl(flaw.note, ctx) : c.cruel ? c.cruel.note : (c.odd ? `Correct. ${c.odd}` : 'Correct. The draft matched the order and the source.');
  return c;
}

const DEMEANOURS = { calm: 'Calm', uneasy: 'Uneasy', nervous: 'Nervous', hostile: 'Annoyed', upset: 'Upset' };
function demeanourFace(c) {
  const d = c.demeanour;
  if (d === 'nervous') return 'nervous';
  if (d === 'hostile') return 'angry';
  if (d === 'upset') return 'sad';
  return PERSONALITIES[c.personality] ? PERSONALITIES[c.personality].face : 'neutral';
}

function wrapTone(c, text, rng) {
  const P = PERSONALITIES[c.personality];
  let out = text;
  if (rng.chance(0.4)) out = rng.pick(P.open) + out;
  if (rng.chance(0.3)) out += rng.pick(P.close);
  if (c.irritation >= 4) out = rng.pick(P.angry) + ' ' + out;
  return out.replace(/\s+/g, ' ').trim();
}

// Returns { who: 'chuck' | 'them', text }
function answerQuestion(c, qid, S) {
  const rng = makeRng(hashStr(c.pid + ':' + qid + ':' + (c.asked[qid] || 0)));
  const again = c.asked[qid] || 0;
  c.asked[qid] = again + 1;
  const q = QUESTIONS.find((x) => x.id === qid);
  const ctx = c.ctx;
  if (c.storyAnswers && c.storyAnswers[qid]) {
    const sa = c.storyAnswers[qid];
    return { who: q.who, text: tpl(Array.isArray(sa) ? sa[Math.min(again, sa.length - 1)] : sa, ctx) };
  }
  if (q.who === 'them') {
    const P = PERSONALITIES[c.personality];
    c.irritation += P.irrRate * (again ? 2 : 0.8);
    let t;
    if (qid === 11) t = c.fraudster ? rng.pick(COLLEAGUE_RUSH.fraud) : c.nervousReason || rng.pick(c.demeanour === 'nervous' ? COLLEAGUE_RUSH.nervous : COLLEAGUE_RUSH.calm);
    else t = c.fraudster ? rng.pick(COLLEAGUE_READ.fraud) : rng.pick(c.reads ? COLLEAGUE_READ.yes : COLLEAGUE_READ.no);
    if (again >= 2 && c.irritation >= 5) t = rng.pick(P.angry);
    if (c.fraudster && c.demeanour === 'calm' && c.irritation > 2) c.demeanour = 'uneasy';
    return { who: 'them', text: wrapTone(c, t, rng) };
  }
  const f = c.flaw;
  const tag = f ? f.tag : null;
  const byTag = tag && CHUCK_BY_TAG[tag] ? CHUCK_BY_TAG[tag] : {};
  let text;
  if (qid === 9) {
    const fl = c.flags[c.flags.length - 1];
    if (!fl) text = 'Which line? Flag it on the desk and I’ll explain it. I love explaining.';
    else {
      const hit = f && ((fl.doc === 'draft' && c.flawFields.includes(fl.field)) || (fl.doc === 'stamp' && (f.kind === 'stampForged' || f.kind === 'stampFormat')));
      text = hit ? tpl(rng.pick(byTag[9] || ['That line is exactly what was asked. Probably.']), ctx) : rng.pick(['That line matches the ask exactly.', 'That one’s straight from the source. I didn’t even get creative.', 'Nothing special there. Perfectly normal line.']);
    }
  } else if (qid === 10) {
    text = rng.pick(CHUCK_CONFIDENT);
  } else if (byTag[qid]) {
    text = tpl(rng.pick(byTag[qid]), ctx);
  } else if (f && f.kind === 'bcc' && qid === 3) {
    text = tpl('Just {to}. And all-staff in BCC, for transparency. Everyone loves transparency.', ctx);
  } else if (f && f.kind === 'phish' && qid === 3) {
    text = tpl('{to}. They asked us to use this address from now on, so I did. Very responsive of me.', ctx);
  } else if (f && f.kind === 'phish' && qid === 8) {
    text = tpl('{colleague}, plus the latest email in the thread. It said to use a new address. I’m adaptable.', ctx);
  } else if (f && f.kind === 'hiddennote' && qid === 6) {
    text = 'Nothing visible is confidential. I checked the visible parts.';
  } else if (f && f.kind === 'wrongattach' && qid === 6) {
    text = 'The attachment is a summary. I named it that myself.';
  } else if (CHUCK_CLEAN[qid]) {
    text = tpl(rng.pick(CHUCK_CLEAN[qid]), ctx);
  } else text = 'Great question! Next question.';
  if (again >= 2) text = 'As I said: ' + text[0].toLowerCase() + text.slice(1);
  return { who: 'chuck', text };
}

const EXIT_LINES = {
  approve: ['Thanks. One less thing on my Score.', 'Great. Filing it.', 'Perfect. CHUCK said you would.', 'Signed. Good. Next.'],
  deny: ['Returned? Okay. I\u2019ll get CHUCK to fix it.', 'Ugh. Fine. What\u2019s wrong with it?', 'Okay\u2026 back in the queue it goes.', 'Returned. Oversight will ask me why.'],
  detain: ['Withheld? You know that gets logged, right?', 'Am I going to get a visit about this?', 'Okay. That\u2019s brave. Or something.', 'Is this going on my Score or yours?']
}
