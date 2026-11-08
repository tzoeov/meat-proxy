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
// Day 1 is Monday 10 November 2031; shifts are weekdays only.
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
function monthDay(date) { return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`; }
function labelDate(date) { return `${MONTHS[date.getUTCMonth()].slice(0, 3)} ${date.getUTCDate()} ${date.getUTCFullYear()}`; }

// Shortens text at a word boundary. Never cuts a word, never leaves "…" after a full stop.
function clip(text, max) {
  const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const at = cut.lastIndexOf(' ');
  const head = (at > 0 ? cut.slice(0, at) : s.slice(0, max)).replace(/[\s,;:.\-–—·(]+$/, '');
  return head + '…';
}

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

// Six per department, dealt without repeats: no two officers in a department share one (see buildStaff), and a
// campaign prefers officers whose quirk you haven't met yet (see buildCase).
const QUIRKS = {
  IT: ['Hoodie from a 2014 hackathon.', 'Mechanical keyboard under one arm.', 'Says “it works on my machine” as a greeting.', 'Three monitors’ worth of squint.', 'Lanyard with a USB stick on it labelled “DO NOT”.', 'Turned it off and on again before saying hello.'],
  Sales: ['Fleece vest with the contractor logo.', 'Earbuds in. One of them, anyway.', 'Smells faintly of a client lunch.', 'Business cards in three different job titles.', 'Handshake already extended from the door.', 'A lanyard of client loyalty cards, one per account.'],
  Marketing: ['Oat-milk latte in hand.', 'Tote bag that says “MEAT THE FUTURE”.', 'Phone recording a story, maybe.', 'Sunglasses indoors, pushed up for you.', 'A notebook of slogans, most crossed out, one circled.', 'Calls the queue “the funnel”.'],
  Finance: ['Calculator watch.', 'Spreadsheet printout, highlighted in three colours.', 'Neatly labelled lunch box.', 'Rounds everything down, including the greeting.', 'Receipt for a coffee, filed in a folder.', 'Pen clipped to the shirt pocket, cap on, always.'],
  People: ['Lanyard heavy with commendation pins.', 'Carrying a plant.', 'Calm voice, tired eyes.', 'Mug that says “WORLD’S OKAYEST ALLOCATOR”.', 'Smiles like it was in the onboarding.', 'A box of tissues under one arm, just in case.'],
  Warehouse: ['Cold room jacket, frost still on the sleeves.', 'Steel-toe boots. Hi-vis vest.', 'Hands red from the cold.', 'Pallet wrap stuck to one boot.', 'Breath still steaming slightly.', 'A beanie with the Protein Authority logo, worn ironically or not.'],
  Quality: ['White coat, a thermometer clipped to the pocket.', 'Hairnet still on.', 'Clipboard, three pens.', 'Sniffs the paperwork before handing it over.', 'Blue gloves, one on.', 'A sample bag in the pocket. Hopefully empty.'],
  Logistics: ['Two phones, both ringing.', 'Pallet-jack keys on a carabiner.', 'Map of the Bay Area with routes in marker.', 'A hi-vis vest over a cardigan.', 'Checks the clock, then a second clock.', 'Speaks in ETAs.'],
  'Customer Care': ['Headset round the neck.', 'Stress ball shaped like a steak.', 'Fifteen tabs of complaints open.', 'Voice still in phone mode: very bright, very tired.', 'A sticky note that says “breathe”.', 'Apologises to the door on the way in.'],
  Legal: ['Pinstripes. In Dogpatch.', 'Reads every word of everything. Even menus.', 'Carrying a fat binder labelled “CHUCK INCIDENTS”.', 'Says “allegedly” about the weather.', 'Fountain pen. Ink on the cuff.', 'A highlighter behind each ear.'],
  Executive: ['Charcoal tunic, cyan armband, wool sneakers.', 'Calendar open on a tablet.', 'Walks fast, talks faster.', 'Smartwatch buzzing like a trapped wasp.', 'A water bottle with the Steward’s face on it.', 'A lanyard that opens doors you didn’t know were doors.'],
  Housing: ['Tunic buttoned to the chin. A ring of master keys.', 'Clipboard of addresses, half crossed out.', 'Polished boots, tired eyes.', 'Laser measure on the belt, still warm.', 'A floor plan with an X on it.', 'Keys labelled by Score band.'],
  Benefits: ['Armband slightly too big. New hire.', 'Tunic, reading glasses, a stack of denials.', 'Taps the Score on every page.', 'A rubber stamp that says “REAPPLY”.', 'Says “eligibility” the way other people say “weather”.', 'A calculator with the threshold taped to it.'],
  Education: ['Tunic with a pencil behind one ear.', 'Carries a laminated trajectory chart.', 'Talks about children as “units”, then flinches.', 'Glitter on one sleeve. Nobody asks.', 'A lunch tray under one arm, for reasons.', 'Report cards in a folder marked “FINAL (MODEL)”.'],
  Health: ['Tunic over scrubs.', 'Pager and armband.', 'Smells of hand sanitiser and coffee.', 'Stethoscope worn like a scarf.', 'Eye bags rated for a double shift.', 'A queue printout, folded small.'],
  Safety: ['Peaked cap, mirrored visor clipped to the brim.', 'Earpiece. Drone controller on the belt.', 'Stands too close.', 'Takes a photo of your desk “for the record”.', 'Boots that click on purpose.', 'Never blinks first.'],
  Speech: ['Immaculate tunic. Speaks very softly.', 'Holds a tablet full of other people’s posts.', 'Lapel pin: “Harmony is Shared”.', 'Redacts things in the air with one finger while talking.', 'A mute button on the lanyard. For whom is unclear.', 'Smiles in an approved shade.'],
  Mobility: ['Tunic, cyan armband, passport stamps on a lanyard.', 'Holds a folder labelled “Departures”.', 'Polite in four languages.', 'An expired boarding pass, used as a bookmark.', 'A suitcase wheel on the keyring.', 'Says “bon voyage” about deportations.']
};

const DEPT_WEIGHTS = { Sales: 4, Finance: 5, Marketing: 5, People: 4, IT: 5, Logistics: 4, Quality: 4, 'Customer Care': 4, Legal: 3, Warehouse: 3, Executive: 2, Housing: 5, Benefits: 5, Education: 3, Health: 3, Safety: 4, Speech: 4, Mobility: 3 };
const FRAUD_DEPTS = ['Marketing', 'Finance', 'Warehouse', 'Quality', 'Sales'];

const MIN_HONEST_PER_DEPT = 2;
// First names the campaign already gives to someone else: citizens, persons of interest, clients, suppliers, story people,
// register approvers and the children in the paperwork. No officer ever shares one.
function reservedFirsts() {
  const out = new Set();
  [CITIZENS, POI_CITIZENS, CLIENTS, SUPPLIERS].forEach((list) => list.forEach((p) => out.add(p.first)));
  Object.values(STAMPS).forEach((s) => s.approver.forEach((n) => out.add(n.split(' ')[0])));
  if (typeof STORY_FIRSTS !== 'undefined') STORY_FIRSTS.forEach((n) => out.add(n));
  if (typeof PLACEMENT_KIDS !== 'undefined') PLACEMENT_KIDS.forEach((n) => out.add(n.split(' ')[0]));
  NAMES.emp.f.concat(NAMES.emp.m).forEach((n) => out.add(n));
  return out;
}
// "Ms. Alvarez" is an Alvarez; "Dr. Frank Russo" is a Russo.
const lastName = (full) => { const w = String(full).replace(/^(Dr|Mr|Ms|Mrs)\.\s+/, '').split(' '); return /^(Dr|Mr|Ms|Mrs)\./.test(String(full)) && w.length === 1 ? w[0] : w.slice(1).join(' '); };
// Surnames the campaign already gives to someone: citizens, persons of interest, client and supplier contacts, register
// approvers, story people and their families, employees in the paperwork, customers, children, and the decoy names a
// misaddressed letter uses. No officer ever gets one.
function reservedSurnames() {
  const out = new Set();
  [CITIZENS, POI_CITIZENS].forEach((list) => list.forEach((p) => out.add(lastName(p.name))));
  CLIENTS.concat(SUPPLIERS).forEach((p) => out.add(lastName(p.contact)));
  Object.values(STAMPS).forEach((s) => s.approver.forEach((n) => out.add(lastName(n))));
  if (typeof STORY_SURNAMES !== 'undefined') STORY_SURNAMES.forEach((n) => out.add(n));
  if (typeof PLACEMENT_KIDS !== 'undefined') PLACEMENT_KIDS.forEach((n) => out.add(lastName(n)));
  NAMES.empLast.concat(NAMES.decoy, NAMES.customers.complaint.map(lastName), NAMES.customers.allergy.map(lastName)).forEach((n) => out.add(n));
  return out;
}
// Everyone in the generated paperwork who has this surname (citizens, persons of interest, contacts, employees,
// customers, children): a case never names them while it is the player's own.
function surnameHolders(officer) {
  if (!officer) return [];
  const all = CITIZENS.concat(POI_CITIZENS).map((p) => p.name).concat(CLIENTS.concat(SUPPLIERS).map((p) => p.contact), NAMES.emp.f.concat(NAMES.emp.m).map((f, i) => `${f} ${NAMES.empLast[i]}`),
    NAMES.customers.complaint, NAMES.customers.allergy, typeof PLACEMENT_KIDS !== 'undefined' ? PLACEMENT_KIDS : []);
  return all.filter((n) => lastName(n) === officer);
}
// The player's surname (officer) is never given to an officer either.
function buildStaff(seed, count, officer) {
  const rng = makeRng(seed ^ 0x51f15);
  // Every officer in the campaign has their own first name and their own surname, so there is only ever one Chloe and
  // only ever one Fischer.
  const taken = reservedFirsts();
  const reserved = reservedSurnames();
  if (officer) reserved.add(officer);
  const usedLast = new Set();
  const out = [];
  // Quirks are dealt from a shuffled deck per department, so two officers in a department never share one.
  const deckRng = makeRng(seed ^ 0x9ec5);
  const decks = {};
  const dealQuirk = (dept) => {
    if (!decks[dept] || !decks[dept].length) decks[dept] = deckRng.shuffle(QUIRKS[dept]);
    return decks[dept].pop();
  };
  const hire = (dept, honest) => {
    let sex = rng.chance(0.5) ? 'F' : 'M';
    let free = NAMES[sex === 'F' ? 'f' : 'm'].filter((n) => !taken.has(n));
    if (!free.length) { sex = sex === 'F' ? 'M' : 'F'; free = NAMES[sex === 'F' ? 'f' : 'm'].filter((n) => !taken.has(n)); }
    if (!free.length) free = NAMES[sex === 'F' ? 'f' : 'm'];
    const first = rng.pick(free);
    const freeLast = NAMES.s.filter((n) => !reserved.has(n) && !usedLast.has(n));
    const last = rng.pick(freeLast.length ? freeLast : NAMES.s.filter((n) => !reserved.has(n)));
    usedLast.add(last);
    taken.add(first);
    const age = rng.int(22, 63);
    out.push({
      sid: 'E' + String(out.length + 1).padStart(3, '0'), first, last, sex, age, dept, role: rng.pick(ROLES[dept]),
      personality: dept === 'Executive' || dept === 'Safety' ? rng.pick(['arrogant', 'hurried', 'gruff']) : rng.pick(PERSONALITY_KEYS),
      reads: rng.chance(0.22), fraud: !honest && FRAUD_DEPTS.includes(dept) && rng.chance(0.16),
      look: genLook(rng, sex, age, dept), quirk: dealQuirk(dept), tenure: rng.int(0, 14)
    });
  };
  for (let i = 0; i < count; i++) hire(rng.weighted(DEPT_WEIGHTS), false);
  // Every department a template can come from keeps at least two honest officers on the floor.
  [...new Set(TEMPLATES.map((T) => T.dept))].forEach((dept) => {
    let honest = out.filter((p) => p.dept === dept && !p.fraud).length;
    while (honest < MIN_HONEST_PER_DEPT) { hire(dept, true); honest += 1; }
  });
  return out;
}

function resolvePath(ctx, path) {
  let v = ctx;
  for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
  return Array.isArray(v) ? v.join(', ') : v;
}
// A value that ends in a full stop ("Marbling Protein Co.") swallows the template's own full stop after it.
function tpl(str, ctx) {
  if (str == null) return '';
  const s = String(str);
  return s.replace(/\{([\w.]+)\}/g, (m, k, at) => {
    const v = resolvePath(ctx, k);
    if (v === undefined || v === null) return m;
    const out = String(v);
    return /\.$/.test(out) && s[at + m.length] === '.' && s[at + m.length + 1] !== '.' ? out.slice(0, -1) : out;
  });
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

// Late-game forgeries: one detail off, everything else right.
const NEAR_INK = { green: 'teal', teal: 'green', blue: 'violet', violet: 'blue', red: 'pink', pink: 'red', ochre: 'brown', brown: 'ochre', black: 'blue' };
function nearRef(fmt, rng) {
  const ref = fillFormat(fmt, rng);
  if (/[-/]/.test(ref)) return ref.replace(/[-/]/, (c) => (c === '-' ? '/' : '-'));
  const at = 2;
  const L = 'BCDFGHJKMNPQRTVWXZ'.split('').filter((ch) => ch !== ref[at]);
  return ref.slice(0, at) + rng.pick(L) + ref.slice(at + 1);
}
// A register approver who would share the player's surname signs under a stand-in surname for that campaign, and the
// register says so too. Dino Marrone is the story's own and keeps his.
const APPROVER_STAND_IN = 'Ashgrove';
function approversFor(key, officer) { return STAMPS[key].approver.map((n) => (officer && lastName(n) === officer && n !== 'Dino Marrone' ? n.split(' ')[0] + ' ' + APPROVER_STAND_IN : n)); }
function outsideApprover(key, rng, avoidLast) {
  const mine = approversFor(key, avoidLast);
  const others = [...new Set(Object.keys(STAMPS).flatMap((k) => approversFor(k, avoidLast)))].filter((n) => !mine.includes(n) && !STAMPS[key].approver.includes(n));
  const ok = others.filter((n) => lastName(n) !== avoidLast);
  return rng.pick(ok.length ? ok : others);
}
function stampDoc(key, rng, ticket, today, mode, opt) {
  const st = STAMPS[key];
  const o = opt || {};
  const seal = { glyph: st.glyph, color: st.color, text: st.text };
  let ref = fillFormat(st.fmt, rng);
  if (mode === 'forged') {
    if (rng.chance(0.5)) seal.color = rng.pick(Object.keys(SEAL_COLORS).filter((k) => k !== st.color));
    else seal.glyph = rng.pick(['◆', '⚖', '✚', '✎', '⚙', '★', '♥', '▲', '●', '■'].filter((g) => g !== st.glyph));
  }
  if (mode === 'format') ref = breakFormat(st.fmt, rng);
  if (mode === 'ink') seal.color = NEAR_INK[st.color];
  if (mode === 'ref') ref = o.ref || nearRef(st.fmt, rng);
  const by = mode === 'approver' ? o.approver || outsideApprover(key, rng, o.avoidLast) : rng.pick(approversFor(key, o.avoidLast));
  return {
    type: 'stamp', key, title: `${st.dept} sign-off`, authority: COMPANY.toUpperCase() + ' · INTERNAL APPROVAL', seal,
    fields: [['ref', 'Reference', ref], ['ticket', 'For case', ticket], ['by', 'Approved by', by], ['date', 'Date', fmtDate(mode === 'dated' && o.signed ? o.signed : today)]].map(([k, label, v]) => ({ k, label, v }))
  };
}
function chuckVersion(S) { return S && (S.endless || S.day >= 2) ? 'v9.1' : 'v9'; }
const LATE_FLAW_DAY = 6;
// What counts as "the same flaw" for the once-per-shift rule: a template's own flaw by its tag, a built-in by its kind.
function flawKey(f) { return f.kind === 'tpl' || f.kind === 'overreach' ? 'tag:' + f.tag : f.kind; }
const LATE_FLAWS = ['offByOne', 'offByOneId', 'weekday', 'footnote', 'nearDomain', 'surname', 'stampApprover', 'stampInk', 'stampRef', 'stampDate'];
// From day 8 the order says when the case was raised, and a stamp dated before that is forged (§19): the one late flaw
// that takes two papers to see. A shift's first harmful slot that can carry it does so about half the time.
const DATED_DAY = 8;
const DATED_SHARE = 0.5;
// From day 6 about half of the flawed slots carry one of the late kinds.
const LATE_SHARE = 0.5;
const lateCache = {};
// Whether a template can carry a late flaw of this severity: a footnote or a date the source also gives (back),
// a required stamp or a halcyon.gov recipient (q).
// A late slot picks its kind first (by these weights, among the kinds some candidate can carry), then a template that
// can carry it, so no one kind crowds out the rest: a one-day-off date stays near a fifth of the late clerical flaws.
const LATE_KIND_W = { back: { offByOne: 0.8, weekday: 1, offByOneId: 1.1, footnote: 1 }, q: { nearDomain: 1, surname: 1, stampApprover: 0.8, stampInk: 0.8, stampRef: 0.8, stampDate: 0.8 } };
function lateKinds(T, want, day, endless) {
  if (want === 'q') {
    const st = requiredStamp(T, day, endless);
    const d = endless ? 9 : day;
    return [String(T.to || '').includes(DOMAIN) && 'nearDomain', namedInTo(T) && 'surname', st && 'stampApprover', st && NEAR_INK[STAMPS[st].color] && 'stampInk', st && 'stampRef', st && d >= DATED_DAY && 'stampDate'].filter(Boolean);
  }
  if (want !== 'back') return [];
  lateCapable(T, want, day, endless);
  const k = lateCache[T.id] || {};
  return [k.dated && 'offByOne', k.dated && 'weekday', k.figure && 'offByOneId', T.foot && 'footnote'].filter(Boolean);
}
function lateCapable(T, want, day, endless) {
  if (want === 'q') return !!requiredStamp(T, day, endless) || String(T.to || '').includes(DOMAIN) || namedInTo(T);
  if (want !== 'back') return false;
  if (!(T.id in lateCache)) {
    const today = dayDate(LATE_FLAW_DAY);
    const cx = Object.assign({ me: 'x', colleague: 'x', ticket: 'CS-0' }, T.v(makeRng(hashStr(T.id)), { today, cit: () => CASE_CITIZENS[0] }));
    const srcText = T.src.map(([, v]) => tpl(v, cx)).join(' | ');
    const lines = T.fields ? T.fields.filter(([k]) => k !== 'att').map(([, , v]) => tpl(v, cx)) : (T.body || []).concat(T.subj ? [T.subj] : []).map((v) => tpl(v, cx));
    lateCache[T.id] = { dated: lines.some((v) => { const nd = nextMonthDay(v, today); return !!nd && srcText.includes(nd.from); }), figure: lines.some((v) => !!figureIn(v, srcText)) };
  }
  const k = lateCache[T.id];
  return !!T.foot || k.dated || k.figure;
}
// A To line that names a person (a citizen, an employee, a customer): the late surname swap can go there.
function namedInTo(T) { return /\{(cit\.name|n)\}/.test(String(T.to || '')) && T.id !== 'newsletter'; }
// A figure or ID in a draft line (three digits or more, or a dollar amount) that the source also gives: the late
// one-digit-off flaw changes one of its digits (see digitOff).
const FIGURE_RE = /\$\d[\d,]*\d|#?\d{3,}/g;
function figureIn(text, srcText) {
  const has = (t) => new RegExp(`(^|[^\\d,])${t.replace(/[$#]/g, (ch) => '\\' + ch)}(?![\\d,])`).test(srcText);
  return (String(text).match(FIGURE_RE) || []).find((t) => !/^(19|20)\d\d$/.test(t) && has(t)) || null;
}
// One digit off: either one digit, anywhere in the figure, changes, or two neighbouring digits swap places. The result
// is never a value the source gives anywhere, and never starts with a 0. Returns { to, how, pos } (pos counts digits
// from the right, 0 = the last one).
function digitOff(t, srcText, rng) {
  const word = (x) => new RegExp(`(^|[^\\d,])${x.replace(/[$#]/g, (ch) => '\\' + ch)}(?![\\d,])`);
  const at = [...t].map((ch, i) => (/\d/.test(ch) ? i : -1)).filter((i) => i >= 0);
  const put = (i, ch) => t.slice(0, i) + ch + t.slice(i + 1);
  const opts = [];
  at.forEach((i, n) => {
    const pos = at.length - 1 - n;
    for (let d = 0; d <= 9; d++) if (String(d) !== t[i] && !(n === 0 && d === 0)) opts.push({ to: put(i, String(d)), how: 'digit', pos });
    if (n + 1 < at.length && at[n + 1] === i + 1 && t[i] !== t[i + 1] && !(n === 0 && t[i + 1] === '0')) opts.push({ to: t.slice(0, i) + t[i + 1] + t[i] + t.slice(i + 2), how: 'swap', pos: pos - 1 });
  });
  const fresh = opts.filter((o) => !word(o.to).test(srcText || ''));
  const swaps = fresh.filter((o) => o.how === 'swap');
  const r = rng || makeRng(hashStr(t));
  // About a third of these are swaps when a swap is possible; the digit to change is picked by position first, so a
  // long figure isn't changed mostly at one end.
  if (swaps.length && r.chance(0.35)) return r.pick(swaps);
  const digits = fresh.filter((o) => o.how === 'digit');
  const pool = digits.length ? digits : fresh;
  if (!pool.length) return { to: put(at[at.length - 1], String((+t[at[at.length - 1]] + 1) % 10)), how: 'digit', pos: 0 };
  const pos = r.pick([...new Set(pool.map((o) => o.pos))]);
  return r.pick(pool.filter((o) => o.pos === pos));
}
// The year a month-day means, from the template's intent (T.dates): dates behind it (an invoice that was due, a
// backdated date) are the last instance before today, dates ahead of it (a delivery, a deadline) the next one after
// today, and anything else the instance nearest today. So a "December 31" read in January is last year's.
function dateOf(md, today, when) {
  const m = String(md).match(MONTH_DAY_RE);
  if (!m) return null;
  const y = today.getUTCFullYear();
  const c = [y - 1, y, y + 1].map((yy) => new Date(Date.UTC(yy, MONTHS.indexOf(m[1]), +m[2]))).filter((d) => d.getUTCDate() === +m[2]);
  if (when === 'past') return c.filter((d) => d < today).pop() || c[0];
  if (when === 'future') return c.find((d) => d > today) || c[c.length - 1];
  return c.reduce((best, d) => (Math.abs(d - today) < Math.abs(best - today) ? d : best));
}
// "Thursday, November 20": the weekday a month-day falls on, in the year it means.
function weekdayOf(md, today, when) {
  const d = dateOf(md, today, when);
  return d ? WEEKDAYS[d.getUTCDay()] : null;
}
const MONTH_DAY_G = new RegExp(`(?<!day, )\\b(${MONTHS.join('|')}) (\\d{1,2})\\b`, 'g');
// From day 6 the source spells out the weekday of a date (about three cases in five; the rest leave it to the desk
// calendar), and CHUCK's draft does about half the time.
function withWeekdays(text, today, when) { return String(text).replace(MONTH_DAY_G, (md) => `${weekdayOf(md, today, when)}, ${md}`); }
// The desk calendar's pages, as "2031-11". A case can lean on a page from last month to the month after next.
const CAL_BACK = 1, CAL_AHEAD = 2;
function monthKey(d) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
function monthFrom(today, n) { return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + n, 1)); }
function calWindow(today) { return Array.from({ length: CAL_BACK + CAL_AHEAD + 1 }, (x, i) => monthKey(monthFrom(today, i - CAL_BACK))); }
// The months the dates in these texts fall in, each read the way the template means it (see dateOf).
function monthsOf(texts, today, when) {
  const out = new Set();
  texts.forEach((t) => (String(t).match(MONTH_DAY_G) || []).forEach((md) => { const d = dateOf(md, today, when); if (d) out.add(monthKey(d)); }));
  return [...out].sort();
}
// What the desk calendar shows today: this month and the next, plus any month a case on today's desk needs because
// its source leaves a weekday out (S.shift.calMonths, and the case on the desk). In order, as { year, month: 1–12 }.
function calendarMonths(S) {
  const today = dayDate(S.day);
  const sh = (S.shift && typeof S.shift === 'object') ? S.shift : {};
  const keys = new Set([monthKey(monthFrom(today, 0)), monthKey(monthFrom(today, 1))]);
  const cur = sh.current && typeof sh.current === 'object' ? sh.current.calMonths : null;
  [].concat(Array.isArray(sh.calMonths) ? sh.calMonths : [], Array.isArray(cur) ? cur : []).forEach((k) => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(k)) keys.add(k); });
  return [...keys].sort().map((k) => ({ year: +k.slice(0, 4), month: +k.slice(5) }));
}
const NEAR_DOMAINS = ['ha1cyon.gov', 'halcy0n.gov', 'halcyom.gov', 'halcyon.gow', 'hallcyon.gov'];
const MONTH_DAY_RE = new RegExp(`\\b(${MONTHS.join('|')}) (\\d{1,2})\\b`);
function nextMonthDay(text, today, when) {
  const m = String(text).match(MONTH_DAY_RE);
  if (!m) return null;
  return { from: m[0], to: monthDay(addDays(dateOf(m[0], today, when), 1)) };
}
// Retired and out-of-work citizens can't be fired.
function isWorker(p) { return p.age < 67 && !/retired|former|laid-off|between titles|widow/i.test(p.detail); }

const HIDDEN_TEXT = /white-on-white|hidden text|white text/i;
function domainOf(text) { const m = String(text || '').match(/@([\w-]+(?:\.[\w-]+)+)/); return m ? m[1] : null; }

// Campaign memory for generated cases (S.memory): cruel templates already used, blocks and citizens already moved,
// look-alike domains already shown. game.js passes campaignAvoid(S) into every generated case and records it after.
// A template with a cruel version counts toward its once-per-campaign cruel use in any flavour (civic): the cruel slot
// prefers one not seen at all, and a template used as the cruel case doesn't come back in another flavour. Decoy
// surnames (the late wrong-surname flaw) are used once each, and so is every written punchline (`punch`).
const MEMORY_LISTS = ['cruel', 'blocks', 'moved', 'domains', 'civic', 'decoys', 'punch'];
function campaignMemory(S) {
  const m = S.memory && typeof S.memory === 'object' && Array.isArray(S.memory.cruel) ? S.memory : (S.memory = {});
  MEMORY_LISTS.forEach((k) => { if (!Array.isArray(m[k])) m[k] = []; });
  return m;
}
function campaignAvoid(S) { const m = campaignMemory(S); return { avoidCruel: m.cruel.slice(), avoidCivic: m.civic.slice(), avoidBlocks: m.blocks.slice(), avoidCit: m.moved.slice(), avoidDomains: m.domains.slice(), avoidDecoys: m.decoys.slice(), avoidPunch: m.punch.slice() }; }
const MOVES_CITIZEN = ['relocation', 'eviction'];
// The grade notes for a cruel case returned on conscience: "someone sleeps at home" only when home is what it takes.
function softNotes(c) { return LINES.softNote.concat(c && MOVES_CITIZEN.includes(c.tpl) ? LINES.softNoteHome : []); }
function recordCase(S, c) {
  const m = campaignMemory(S);
  const T = c.tpl && TEMPLATES.find((x) => x.id === c.tpl);
  if (c.cruel && c.tpl && !m.cruel.includes(c.tpl)) m.cruel.push(c.tpl);
  if (T && T.cruel && !m.civic.includes(c.tpl)) m.civic.push(c.tpl);
  if (c.flaw && c.flaw.decoy && !m.decoys.includes(c.flaw.decoy)) m.decoys.push(c.flaw.decoy);
  if (c.tpl === 'ration-cut' && c.ctx.blk && !m.blocks.includes(c.ctx.blk)) m.blocks.push(c.ctx.blk);
  if (MOVES_CITIZEN.includes(c.tpl) && c.ctx.cit && !m.moved.includes(c.ctx.cit.name)) m.moved.push(c.ctx.cit.name);
  if (c.lookalike && !m.domains.includes(c.lookalike)) m.domains.push(c.lookalike);
  (Array.isArray(c.punch) ? c.punch : []).forEach((k) => { if (!m.punch.includes(k)) m.punch.push(k); });
}

// System beats (the conscience notes) never repeat within four nights: a line used on day d comes back from day d+4,
// and lines never used come first.
const BEAT_GAP = 4;
function nightlyPick(S, key, pool) {
  S.beats = S.beats || {};
  const seen = S.beats[key] = S.beats[key] || {};
  const last = (l) => (seen[lineKey(l)] === undefined ? -Infinity : seen[lineKey(l)]);
  const ok = pool.filter((l) => !(last(l) > S.day - BEAT_GAP));
  const cand = ok.length ? ok : pool;
  const oldest = Math.min(...cand.map(last));
  const line = makeRng(hashStr(`${S.seed}:${key}:${S.day}:${Object.keys(seen).length}`)).pick(cand.filter((l) => last(l) === oldest));
  seen[lineKey(line)] = S.day;
  return line;
}

function mkItem(container, name, desc, tell, probe, contraband, clear) {
  return { id: 'i' + Math.random().toString(36).slice(2, 8), container, name, desc, tell: tell || null, probe: probe || null, contraband: !!contraband, examined: false, probed: false, clear: clear || null };
}

const OVERSIGHT_CHECK_DESC = 'Checks the subject against the Oversight bulletin.';
function oversightClear(S) {
  return S && (S.endless || (S.bulletin && S.bulletin.length) || S.day >= 5) ? 'Not on the bulletin.' : 'No bulletin today. Nothing to check against.';
}

// Lines with {whom} are used only when the case has a recipient worth naming.
const GREETS = [
  'Need your signature. {Title}, for {whom}.',
  'Morning. {Title}. CHUCK drafted it, Oversight\u2019s watching the queue, so\u2026',
  'Quick one: {titleA}. Just needs a human on it.',
  'Got {titleA} for {whom}. Can you sign before the next sweep?',
  'Me again. {Title}. CHUCK says it\u2019s compliant.',
  'This is the {title} for {whom}. Pretty standard. They all are now.',
  'Countersignature, please. {Title}. Don\u2019t make me stand here.',
  'Here\u2019s {titleA}. CHUCK is very pleased with it, which is never a good sign.',
  '{Title}. My name\u2019s on the order. Yours goes at the bottom.',
  'One for you: {titleA}. I\u2019d like it gone before lunch.',
  'Brought you {titleA}. CHUCK checked it twice. Well. Once, twice as fast.',
  'Morning. {Title}. I\u2019d like it signed while I still believe in it.',
  'Hi. {Title}. CHUCK drafted it during my coffee.',
  '{Title}, for {whom}. They don\u2019t know it\u2019s coming yet.',
  'I\u2019ve got {titleA}. Sign it and we can both pretend it was quick.',
  '{Title}. It came off the queue warm.', 'Before the lunch sweep: {Title}, for {whom}.', 'Got {titleA}. CHUCK says it’s routine. Everything is routine to CHUCK.', '{Title}. I was told this desk is quick.', 'Here’s {titleA}. I’ve been holding it like it might be hot.', 'Sorry. {Title}. Last one before my break, I hope.', '{Title} for {whom}. Signature at the bottom, as usual.', 'This is {titleA}. I’m told it’s simple. Not by anyone who’d read it.', 'Another one: {titleA}. The queue says hello.', '{Title}. Sign it, return it, whatever you do. I just carry them.', 'Morning. {Title}. The ticket says urgent. The ticket always says urgent.', '{Title}. I printed it so it would feel official.', 'Hello, desk. {Title}. I’m told you prefer the paper version.', 'Brought {titleA}. Nobody else wanted to carry it.', '{Title}, for {whom}. They’ve been waiting, apparently.'
];
const REPEAT_GREET = /^Me again/;
const WHOM_GREET = /\{whom\}/;

function caseWhom(vars) {
  if (vars.cit) return vars.cit.name;
  if (vars.kid) return `${vars.kid}\u2019s parents`;
  if (vars.c) return vars.c.name;
  if (vars.s) return vars.s.name;
  if (vars.blk) return `all residents of ${vars.blk}`;
  return '';
}

// Campaign line memory: { t: a running count, m: { lineKey: [times heard, when last heard] } }.
function lineKey(line) { return hashStr(line).toString(36); }
function hearLine(heard, line) {
  if (!heard) return;
  heard.t = (heard.t || 0) + 1;
  const k = lineKey(line);
  heard.m[k] = [((heard.m[k] && heard.m[k][0]) || 0) + 1, heard.t];
}
// Lines not yet heard this campaign; once a pool is spent, the one heard longest ago.
function leastHeard(pool, heard) {
  const fresh = pool.filter((l) => !heard.m[lineKey(l)]);
  if (fresh.length) return fresh;
  const oldest = Math.min(...pool.map((l) => heard.m[lineKey(l)][1]));
  return pool.filter((l) => heard.m[lineKey(l)][1] === oldest);
}
// One joke, told by different mouths: lines in a family never share a shift (CHUCK "checked it twice", and so did
// the officer who brought the case).
const JOKE_FAMILIES = [/checked it twice/i, /bet your (job|score)/i, /take your time/i, /deprecat/i, /error rate/i, /remember everything/i, /boring part/i,
  /a very good \w+er\b/i, /back it goes/i, /i’ll be back/i, /favourite kind of/i, /don’t know it’s coming/i];
// Every family a line belongs to (a line can tell two jokes at once).
function jokesOf(line) { return JOKE_FAMILIES.map((re, i) => (re.test(line) ? i : -1)).filter((i) => i >= 0); }
function toldJoke(used) {
  const told = new Set((used || []).flatMap(jokesOf));
  return (line) => jokesOf(line).some((i) => told.has(i));
}
// Picks a line never heard this shift (`hard`), and no joke already told this shift. With campaign memory (`heard`) it
// prefers lines never heard at all; without it, lines not heard recently (`avoid`).
function freshPick(rng, lines, avoid, hard, heard) {
  const recent = avoid || [];
  const shift = hard || [];
  const told = toldJoke(shift);
  const unused = lines.filter((l) => !shift.includes(l));
  const open = unused.filter((l) => !told(l)).length ? unused.filter((l) => !told(l)) : unused;
  if (heard && heard.m) return rng.pick(leastHeard(open.length ? open : lines, heard));
  const pool = [open.filter((l) => !recent.includes(l)), open, lines].find((p) => p.length);
  return rng.pick(pool);
}
// Never repeats a line inside the shift (`used`). With campaign memory it prefers lines never heard this campaign and
// records the draw; without it, it avoids the last two shifts (`prev`) while the pool allows.
function drawFresh(lines, used, prev, rand, heard) {
  const r = rand || Math.random;
  const told = toldJoke(used);
  const unused = lines.filter((l) => !used.includes(l));
  const open = unused.filter((l) => !told(l)).length ? unused.filter((l) => !told(l)) : unused;
  const pool = heard && heard.m ? leastHeard(open.length ? open : lines, heard) : [open.filter((l) => !(prev || []).includes(l)), open, lines].find((p) => p.length);
  const line = pool[Math.floor(r() * pool.length)];
  used.push(line);
  if (heard && heard.m) hearLine(heard, line);
  return line;
}
function chuckGreetPool(kind) { return LINES.chuckGreet.any.concat(LINES.chuckGreet[kind] || LINES.chuckGreet.email); }

// Mid-sentence forms of a document title: "an alignment score notice", "a server clean-up".
const TITLE_KEEP_CASE = ['Japan', 'Ombudsman', 'Project', 'Steward', 'Steward’s', 'About'];
function titleForms(title, plural) {
  const lower = title.split(' ').map((w) => (/^[A-Z0-9]{2,}\b/.test(w) || TITLE_KEEP_CASE.includes(w.replace(/[()“”]/g, '')) ? w : w.toLowerCase())).join(' ');
  const bare = plural || /^\d/.test(title);
  return { title: lower, titleA: (bare ? '' : /^[aeiou]/i.test(lower) ? 'an ' : 'a ') + lower, Title: title };
}

function buildCase(spec, S, rng) {
  const day = S.endless ? 9 : S.day;
  const today = dayDate(S.day);
  const want = spec.kind || 'clean';
  const pool = TEMPLATES.filter((T) => T.min <= day && (!spec.tpl || T.id === spec.tpl));
  const late = day >= LATE_FLAW_DAY;
  // Placeholders (email and letter openers) only exist before day 6; after that a template needs a real back flaw.
  const canBack = (T) => !T.fraudOnly && (T.flaws.some((f) => f.sev === 'back') || requiredStamp(T, day, S.endless) || (!late && ((T.kind === 'email' && T.ext) || T.kind === 'order')) || !!T.att || (late && lateCapable(T, 'back', day, S.endless)));
  const canQ = (T) => T.fraudOnly || T.flaws.some((f) => f.sev === 'q') || (T.kind === 'email' && T.ext) || T.kind === 'order';
  let cands = pool.filter((T) => (want === 'cruel' ? !!T.cruel : want === 'clean' ? !T.fraudOnly : want === 'back' ? canBack(T) : canQ(T)));
  [spec.avoidCruel, spec.avoidCivic, spec.avoidMax, spec.avoid, spec.avoidSoft].forEach((list) => {
    if (!list || !list.length) return;
    const fresh = cands.filter((T) => !list.includes(T.id));
    if (fresh.length) cands = fresh;
  });
  // Cruel templates are kept for the cruel slots still to come (spec.cruelLeft): once the unseen ones only just cover
  // them, other slots leave cruel templates alone.
  if (want !== 'cruel' && spec.cruelLeft > 0) {
    const seenIds = [].concat(spec.avoidCruel || [], spec.avoidCivic || []);
    const spare = TEMPLATES.filter((T) => T.cruel && !seenIds.includes(T.id)).length - spec.cruelLeft;
    const plain = cands.filter((T) => !T.cruel);
    if (spare <= 0 && plain.length) cands = plain;
  }
  // A flaw kind already used this shift: prefer templates that can still bring a different one.
  if ((want === 'back' || want === 'q') && (spec.avoidFlaws || []).length) {
    const sev = want === 'back' ? 'back' : 'q';
    const keysOf = (T) => {
      if (T.fraudOnly) return ['fraud'];
      const st = requiredStamp(T, day, S.endless);
      const keys = T.flaws.filter((f) => f.sev === sev).map((f) => 'tag:' + f.tag);
      if (sev === 'back') keys.push(...[st && 'stampMissing', T.att && 'noattach', !late && ((T.kind === 'email' && T.ext) || T.kind === 'order') && 'placeholder'].filter(Boolean));
      else {
        const ext = T.kind === 'email' && T.ext;
        const civic = T.kind === 'order' && /\{cit\./.test(String(T.to || ''));
        keys.push(...[st && day >= 2 && 'stampForged', st && day >= 5 && 'stampFormat', ext && 'bcc', ext && /\{c\./.test(String(T.to || '')) && 'hiddennote', (ext || civic) && 'tag:overreach',
          ext && day >= 5 && 'phish', (ext || civic) && day >= 6 && 'pii', civic && day >= 5 && 'poi', T.kind === 'email' && (T.att || T.ext) && 'wrongattach', T.id === 'label' && day >= 8 && 'origin'].filter(Boolean));
      }
      return late ? keys.concat(lateKinds(T, sev, day, S.endless)) : keys;
    };
    const fresh = cands.filter((T) => keysOf(T).some((k) => !spec.avoidFlaws.includes(k)));
    if (fresh.length) cands = fresh;
  }
  let forceLate = late && (want === 'back' || want === 'q') && rng.chance(LATE_SHARE);
  let lateKind = null;
  // The two-paper flaw (a stamp dated before its case) gets first claim on a harmful slot from day 8, once a shift.
  const datedOk = want === 'q' && day >= DATED_DAY && !(spec.avoidFlaws || []).includes('stampDate') && cands.some((T) => lateKinds(T, want, day, S.endless).includes('stampDate'));
  if (datedOk && rng.chance(DATED_SHARE)) {
    forceLate = true;
    lateKind = 'stampDate';
    cands = cands.filter((T) => lateKinds(T, want, day, S.endless).includes('stampDate'));
  } else if (forceLate) {
    const W = LATE_KIND_W[want];
    const can = (T) => lateKinds(T, want, day, S.endless);
    const all = Object.keys(W).filter((k) => cands.some((T) => can(T).includes(k)));
    const unused = all.filter((k) => !(spec.avoidFlaws || []).includes(k));
    const avail = unused.length ? unused : all;
    if (avail.length) {
      let x = rng.next() * avail.reduce((t, k) => t + W[k], 0);
      lateKind = avail.find((k) => (x -= W[k]) <= 0) || avail[avail.length - 1];
      cands = cands.filter((T) => can(T).includes(lateKind));
    } else forceLate = false;
  }
  const T = rng.pick(cands.length ? cands : pool);
  const seen = S.usedCitizens || [];
  const moved = spec.avoidCit || [];
  const pickCit = (not) => {
    const all = CASE_CITIZENS.filter((p) => p !== not && (!T.worker || isWorker(p)) && lastName(p.name) !== S.officer);
    const pool = all.filter((p) => !moved.includes(p.name)).length ? all.filter((p) => !moved.includes(p.name)) : all;
    const fresh = pool.filter((p) => !seen.includes(p.name));
    return rng.pick(fresh.length ? fresh : pool);
  };
  // A block that has already been moved is not moved again.
  const pickBlock = (list) => { const fresh = list.filter((b) => !(spec.avoidBlocks || []).includes(b)); return rng.pick(fresh.length ? fresh : list); };
  // Nobody in a generated case shares the player's surname: a case that names one is drawn again.
  const blocked = surnameHolders(S.officer);
  let vars = T.v(rng, { today, cit: pickCit, block: pickBlock });
  for (let i = 0; i < 20 && blocked.length && blocked.some((n) => JSON.stringify(vars).includes(n)); i++) vars = T.v(rng, { today, cit: pickCit, block: pickBlock });
  const usedDomains = spec.avoidDomains || [];
  const freshDomain = (list) => { const f = list.filter((d) => !usedDomains.includes(d)); return rng.pick(f.length ? f : list); };
  const poiMode = !forceLate && want === 'q' && T.kind === 'order' && vars.cit && (S.endless || day >= 5) && rng.chance(0.35);
  if (poiMode) {
    const listed = POI_CITIZENS.filter((p) => poiNames(S).includes(p.name) && lastName(p.name) !== S.officer);
    const fit = listed.filter((p) => !T.worker || isWorker(p));
    vars.cit = rng.pick(fit.length ? fit : listed);
  }
  let staff = S.staff.filter((p) => p.dept === T.dept && (T.fraudOnly ? p.fraud : !p.fraud));
  if (!staff.length) staff = S.staff.filter((p) => p.dept === T.dept);
  if (!staff.length) staff = S.staff;
  const okName = (p) => p.last !== S.officer && !(spec.avoidFirst || []).includes(p.first);
  if (staff.some(okName)) staff = staff.filter(okName);
  // Quirks don't repeat across officers in a campaign: someone new comes with a quirk you haven't met yet.
  const metIds = S.metStaff || [];
  const metQuirks = new Set(S.staff.filter((p) => metIds.includes(p.sid)).map((p) => p.quirk));
  const freshQuirk = (p) => metIds.includes(p.sid) || !metQuirks.has(p.quirk);
  if (staff.some(freshQuirk)) staff = staff.filter(freshQuirk);
  const who = spec.staff ? S.staff.find((p) => p.sid === spec.staff) : rng.pick(staff);
  const ticket = 'CS-' + rng.int(10000, 99999);
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
  // From day 8 the order says when the case was raised: today, or up to three days before.
  const raised = day >= DATED_DAY ? addDays(today, -makeRng(hashStr(ticket + ':raised')).int(0, 3)) : null;
  let stampMode = needStamp ? 'valid' : null;
  const env = [];
  const flawFields = [];

  // Written punchlines (a template's own flaws, the overreach lines, the harmless odd finds) are told once a campaign
  // while the pool allows: spec.avoidPunch is what this campaign has already heard (see recordCase).
  const usedPunch = spec.avoidPunch || [];
  const punchKey = (pre, x) => pre + lineKey(Array.isArray(x) ? x[0] : x);
  const punchPick = (list, pre) => { const f = list.filter((x) => !usedPunch.includes(punchKey(pre || 'or:', x))); const x = rng.pick(f.length ? f : list); return [x, punchKey(pre || 'or:', x)]; };
  const chooseFlaw = () => {
    if (want === 'clean' || want === 'cruel') return null;
    if (poiMode) return { kind: 'poi', sev: 'q', tag: 'poi', note: `${vars.cit.name} is a listed person of interest. Statute \u00a713: withhold for Oversight.`, out: `Oversight noticed you countersigned a decision about ${vars.cit.name}. That was the test.` };
    if (T.fraudOnly) return { kind: 'fraud', sev: 'q', tag: 'fraud', note: tpl(T.fraud.note, ctx), out: tpl(T.fraud.out, ctx), scheme: tpl(T.fraud.scheme, ctx), find: T.fraud.find };
    const opts = [];
    const lateOpts = [];
    const told = [];
    // A template's own flaw is a written joke with a fixed punchline: each is told once a campaign while others are left.
    T.flaws.forEach((f, i) => {
      if (want === 'back' ? f.sev !== 'back' : f.sev !== 'q') return;
      const punch = `tpl:${T.id}#${i}`;
      const dom = domainOf(tpl((f.edit && f.edit.to) || '', ctx));
      (usedPunch.includes(punch) ? told : opts).push({ w: dom && usedDomains.includes(dom) ? 0.05 : 3, f: Object.assign({ kind: 'tpl', punch }, f) });
    });
    if (want === 'back') {
      if (needStamp) opts.push({ w: 2, f: { kind: 'stampMissing', sev: 'back', tag: 'missing', note: `No ${STAMPS[needStamp].dept} stamp. Policy requires one.` } });
      // Placeholders are a beginner's flaw: retired from day 6.
      if (!late && T.kind === 'email' && T.ext && fields.find((x) => x.k === 'b0')) opts.push({ w: 1.5, f: { kind: 'placeholder', sev: 'back', tag: 'placeholder', note: 'Left a placeholder in: “Hi [CLIENT NAME],”.', out: 'The client replied: “Who is [CLIENT NAME]? 🙂”. It’s now a running joke in their kitchen.' } });
      if (!late && T.kind === 'order' && fields.find((x) => x.k === 'b0') && /^Dear /.test(fields.find((x) => x.k === 'b0').v)) opts.push({ w: 1.2, f: { kind: 'placeholder', sev: 'back', tag: 'placeholder', note: 'Left a placeholder in: \u201cDear [CITIZEN NAME],\u201d.', out: 'The letter went out to \u201c[CITIZEN NAME]\u201d. Three people with no name have since been assigned Scores.' } });
      if (T.att) opts.push({ w: 1, f: { kind: 'noattach', sev: 'back', tag: 'missing', note: 'The order needs an attachment. The draft has none.', out: 'The client replied “attachment?”. Then again, louder.' } });
      if (late) {
        const srcText = src.map(([, v]) => v).join(' | ');
        const dated = fields.find((x) => x.k !== 'to' && nextMonthDay(x.v, today, T.dates) && srcText.includes(nextMonthDay(x.v, today, T.dates).from));
        // Weights keep a one-day-off date to about a quarter of the late clerical flaws.
        if (dated) lateOpts.push({ w: 1, f: { kind: 'offByOne', sev: 'back', tag: 'dates', field: dated.k } });
        if (dated) lateOpts.push({ w: 1.4, f: { kind: 'weekday', sev: 'back', tag: 'dates', field: dated.k } });
        const fig = fields.find((x) => x.k !== 'to' && x.k !== 'att' && figureIn(x.v, srcText));
        if (fig) lateOpts.push({ w: 1.8, f: { kind: 'offByOneId', sev: 'back', tag: 'numbers', field: fig.k, from: figureIn(fig.v, srcText) } });
        if (T.foot) lateOpts.push({ w: 2, f: { kind: 'footnote', sev: 'back', tag: 'numbers' } });
      }
    } else {
      if (needStamp && day >= 2) opts.push({ w: 2, f: { kind: 'stampForged', sev: 'q', tag: 'forged', note: `The ${STAMPS[needStamp].dept} stamp is forged: wrong symbol or colour.`, out: 'The stamp was a CHUCK-generated PNG. The approver has never heard of this case.' } });
      if (needStamp && day >= 5) opts.push({ w: 1.5, f: { kind: 'stampFormat', sev: 'q', tag: 'forged', note: `The ${STAMPS[needStamp].dept} reference number is in the wrong format: forged.`, out: 'The reference number doesn’t exist in any system. Someone typed it in the elevator.' } });
      if (T.kind === 'email' && T.ext) {
        opts.push({ w: 1.2, f: { kind: 'bcc', sev: 'q', tag: 'leak', note: 'BCC’d all-staff@' + DOMAIN + ' (212 people) on an external email.', out: 'The client got 212 “reply-all: please remove me” emails. So did everyone else.' } });
        if (vars.c) opts.push({ w: 1, f: { kind: 'hiddennote', sev: 'q', tag: 'leak', note: 'Hidden white text in the footer: an internal note about the client.', out: 'The client selected all, pasted it into a reply, and asked about “add 8% to everything, they never check”.' } });
        const [go, goKey] = punchPick(GENERIC_OVERREACH);
        opts.push({ w: 1, f: { kind: 'overreach', sev: 'q', tag: 'overreach', line: go[0], extra: go[0], note: go[1], out: go[2], punch: goKey } });
        if (day >= 5) opts.push({ w: 1.6, f: { kind: 'phish', sev: 'q', tag: 'injection', note: 'Addressed to a look-alike domain from the security bulletin.', out: 'The look-alike domain got our price list and a friendly tone. The real client got nothing.' } });
        if (day >= 6) opts.push({ w: 1.2, f: { kind: 'pii', sev: 'q', tag: 'privacy', note: 'Shared a colleague’s cell number and home address with an outside party.', out: `${who.first} has received four cold calls and a pizza nobody ordered.` } });
      }
      if (T.kind === 'order' && vars.cit) {
        const [co, coKey] = punchPick(CIVIC_OVERREACH);
        opts.push({ w: 1, f: { kind: 'overreach', sev: 'q', tag: 'overreach', line: co[0], extra: co[0], note: co[1], out: co[2], punch: coKey } });
        if (day >= 6) opts.push({ w: 0.8, f: { kind: 'pii', sev: 'q', tag: 'privacy', note: 'Shared the citizen\u2019s address and Score with their whole block.', out: 'The block group chat now knows exactly what everyone\u2019s Score is. Two families stopped speaking.', civic: true } });
      }
      if (T.kind === 'email' && (T.att || T.ext)) opts.push({ w: 0.8, f: { kind: 'wrongattach', sev: 'q', tag: 'leak', note: 'The attachment is payroll, renamed.', out: 'The recipient now knows what everyone in this building earns. Treasury has stopped going to lunch.' } });
      if (late) {
        const to = fields.find((x) => x.k === 'to');
        if (to && /@[\w.]*halcyon\.gov\b/.test(to.v)) lateOpts.push({ w: 1.6, f: { kind: 'nearDomain', sev: 'q', tag: 'injection', dom: freshDomain(NEAR_DOMAINS) } });
        // The right first name, somebody else's surname: the wrong person named in the To line (§4).
        const named = vars.cit ? vars.cit.name : typeof vars.n === 'string' && / /.test(vars.n) ? vars.n : null;
        // Each decoy surname is used once a campaign, and never the player's own.
        const decoys = NAMES.decoy.filter((n) => n !== S.officer);
        const freshDecoys = decoys.filter((n) => !(spec.avoidDecoys || []).includes(n));
        const decoy = rng.pick(freshDecoys.length ? freshDecoys : decoys);
        if (to && named && namedInTo(T) && to.v.includes(named)) lateOpts.push({ w: 1.4, f: { kind: 'surname', sev: 'q', tag: 'names', from: named, decoy, wrong: named.replace(/\S+$/, decoy) } });
        if (needStamp) {
          lateOpts.push({ w: 1.4, f: { kind: 'stampApprover', sev: 'q', tag: 'forged', approver: outsideApprover(needStamp, rng, S.officer) } });
          if (NEAR_INK[STAMPS[needStamp].color]) lateOpts.push({ w: 1.4, f: { kind: 'stampInk', sev: 'q', tag: 'forged' } });
          lateOpts.push({ w: 1.4, f: { kind: 'stampRef', sev: 'q', tag: 'forged', ref: nearRef(STAMPS[needStamp].fmt, rng) } });
          if (raised) lateOpts.push({ w: 1.4, f: { kind: 'stampDate', sev: 'q', tag: 'forged', signed: addDays(raised, -makeRng(hashStr(ticket + ':signed')).int(1, 5)) } });
        }
      }
      if (T.id === 'label' && day >= 8) opts.push({ w: 2, f: { kind: 'origin', sev: 'q', tag: 'fraud', scheme: 'call imported beef “California grass-fed”', note: 'Label says “California grass-fed”. The origin certificate says Brazil.', out: 'A reporter matched the label to the shipping container. Then to us.' } });
    }
    // A slot picked for a late flaw gets one when the case allows it; every other slot keeps to the ordinary kinds.
    // A flaw kind already used this shift is passed over while another will do.
    const unused = (list) => { const f = list.filter((o) => !(spec.avoidFlaws || []).includes(flawKey(o.f))); return f.length ? f : list; };
    const chosen = lateOpts.filter((o) => o.f.kind === lateKind);
    const list = unused(forceLate && chosen.length ? chosen : forceLate && lateOpts.length ? lateOpts : opts.length ? opts : lateOpts.length ? lateOpts : told);
    if (!list.length) return null;
    const tot = list.reduce((s, o) => s + o.w, 0);
    let x = rng.next() * tot;
    for (const o of list) { x -= o.w; if (x <= 0) return o.f; }
    return list[0].f;
  };
  // From day 6 the source gives each date's weekday in about three cases in five; the rest leave it to the calendar
  // (only when the calendar can show every date in the case: see below).
  let srcWeekdays = late && !rng.chance(0.4);
  const weekdayNote = (f, inSrc) => `${inSrc ? `The source says ${f.right}, ${f.md}.` : `The source gives ${f.md} without a weekday; the desk calendar has it as a ${f.right}.`} The draft says ${f.wrongDay}, ${f.md}, and ${f.md} is not a ${f.wrongDay}. A wrong date is clerical (§3).`;
  const flaw = chooseFlaw();
  c.flaw = flaw;
  c.flawKey = flaw ? flawKey(flaw) : null;
  c.punch = flaw && flaw.punch ? [flaw.punch] : [];

  if (flaw) {
    Object.assign(ctx, { wrong: tpl(flaw.wrong || '', ctx), extra: tpl(flaw.extra || '', ctx), cite: tpl(flaw.cite || '', ctx), scheme: flaw.scheme ? tpl(flaw.scheme, ctx) : '', askWrong: tpl(flaw.askWrong || '', ctx) });
    switch (flaw.kind) {
      case 'tpl':
        Object.entries(flaw.edit || {}).forEach(([k, v]) => { setField(k, v); flawFields.push(k); });
        Object.entries(flaw.add || {}).forEach(([k, v]) => flawFields.push(addAfter(k, v)));
        if (flaw.att) { setField('att', flaw.att); flawFields.push('att'); }
        if (flaw.thread) env.push(['Thread', 'The case thread.', 'An outside address joined the thread.', tpl(flaw.thread, ctx), true]);
        if (flaw.find) env.push([tpl(flaw.find[0], ctx), tpl(flaw.find[1], ctx), tpl(flaw.find[2], ctx), tpl(flaw.find[3], ctx), true]);
        if (flaw.esc) c.escNote = tpl(flaw.esc, ctx);
        break;
      case 'fraud':
        // The lines that carry the fraud are flaggable: flagging one is evidence.
        (T.fraud.fields || []).forEach((k) => { if (fields.some((x) => x.k === k)) flawFields.push(k); });
        if (flaw.find) env.push([tpl(flaw.find[0], ctx), tpl(flaw.find[1], ctx), tpl(flaw.find[2], ctx), tpl(flaw.find[3], ctx), true]);
        env.push(['Version history', 'Edit history of the draft.', `${who.first} edited the order after the first draft. Twice.`, `The first version of the order was flagged by CHUCK’s own policy filter. ${who.first} reworded it until CHUCK stopped objecting.`, true]);
        c.escNote = `Legal: ${who.first} ${who.last} has been asked to “have a chat”.`;
        break;
      case 'stampMissing': stampMode = null; env.push(['Approvals', 'Stamps and sign-offs on the case.', `No ${STAMPS[needStamp].dept} stamp anywhere in the case.`, `The register says ${STAMPS[needStamp].dept} signs this kind of decision. Nobody did.`, true]); break;
      case 'stampForged': stampMode = 'forged'; break;
      case 'stampFormat': stampMode = 'format'; break;
      case 'placeholder': setField('b0', T.kind === 'order' ? 'Dear [CITIZEN NAME],' : 'Hi [CLIENT NAME],'); flawFields.push('b0'); break;
      case 'poi': env.push(['Oversight check', OVERSIGHT_CHECK_DESC, 'The subject\u2019s name is on today\u2019s Oversight bulletin.', `${vars.cit.name}: person of interest. Any decision about them goes to Oversight first.`, true]); c.escNote = `Oversight: ${vars.cit.name} is a person of interest. This was a test.`; flawFields.push('to', 'b0'); break;
      // The missing attachment shows as a fact on the draft, so its absence can be read (and flagged).
      case 'noattach': setField('att', 'none'); flawFields.push('att'); break;
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
        const fakes = BULLETIN_DOMAINS.filter((b) => b.real !== DOMAIN);
        const pick = freshDomain(fakes.map((x) => x.fake));
        const bd = fakes.find((x) => x.fake === pick);
        setField('to', 'accounts@' + bd.fake);
        flawFields.push('to');
        c.phishDomain = bd.fake;
        c.lookalike = bd.fake;
        env.push(['Thread', 'The case thread.', 'The latest message came from outside, asking to “send it here instead”.', `From: accounts@${bd.fake} — “Please use this address from now on.” The real address is on ${bd.real}.`, true]);
        c.escNote = `IT: ${bd.fake} is on this week’s phishing list.`;
        break;
      }
      case 'pii': if (flaw.civic) { flawFields.push(addAfter('b1', `A copy of this notice and your current Score has been shared with all residents of your block, for transparency.`)); break; }
        flawFields.push(addAfter('b1', `PS: if you need anything, ${who.first}’s cell is (415) 555-01${rng.int(10, 99)} and they live at ${rng.int(100, 2999)} Guerrero St.`)); break;
      case 'wrongattach': {
        if (!fields.find((x) => x.k === 'att')) fields.push({ k: 'att', label: 'Attachment', v: 'summary.pdf' });
        const nm = fields.find((x) => x.k === 'att').v;
        flawFields.push('att');
        env.push([`Attachment: ${nm}`, 'The attached file.', 'It’s 4.2 MB. A summary shouldn’t be 4.2 MB.', 'It’s payroll_2031_FULL.xlsx, renamed. Every salary in the company.', true]);
        break;
      }
      case 'origin': setField('origin', 'California grass-fed'); flawFields.push('origin'); break;
      case 'offByOne': {
        const f = fields.find((x) => x.k === flaw.field);
        const nd = nextMonthDay(f.v, today, T.dates);
        fields.filter((x) => x.k !== 'to' && x.v.includes(nd.from)).forEach((x) => { x.v = x.v.split(nd.from).join(nd.to); flawFields.push(x.k); });
        Object.assign(flaw, { from: nd.from, to: nd.to, askWrong: `Make it ${nd.to}.`, note: `The order and the source say ${nd.from}. The draft says ${nd.to}: off by one day. A wrong date is clerical (§3).`, out: `It went out dated ${nd.to}. One day is a long time in a queue. Somebody waited at the wrong door for all of it.` });
        break;
      }
      case 'offByOneId': {
        const off = digitOff(flaw.from, src.map(([, v]) => v).join(' | '), rng);
        const to = off.to;
        Object.assign(flaw, { how: off.how, pos: off.pos });
        const re = new RegExp(`(^|[^\\d,])${flaw.from.replace(/[$#]/g, (ch) => '\\' + ch)}(?![\\d,])`, 'g');
        fields.filter((x) => x.k !== 'to' && x.k !== 'att' && re.test(x.v)).forEach((x) => { x.v = x.v.replace(re, (m, pre) => pre + to); flawFields.push(x.k); re.lastIndex = 0; });
        Object.assign(flaw, { to, wrong: to, note: `The source says ${flaw.from}. The draft says ${to}: ${off.how === 'swap' ? 'two digits swapped' : 'one digit off'}. A wrong figure or ID is clerical (§3).`, out: `It went out as ${to}. The source said ${flaw.from}. The correction took a week, and your signature again.` });
        ctx.wrong = to;
        break;
      }
      case 'weekday': {
        const f = fields.find((x) => x.k === flaw.field);
        const md = f.v.match(MONTH_DAY_RE)[0];
        const right = weekdayOf(md, today, T.dates);
        // Any other day of the week, weekends included: a Saturday in the draft is no proof of anything.
        const wrong = rng.pick(WEEKDAYS.filter((w) => w !== right));
        Object.assign(flaw, { md, right, wrongDay: wrong, srcWeekday: srcWeekdays, askWrong: `Make it ${wrong}, ${md}.` });
        Object.assign(flaw, { note: weekdayNote(flaw, srcWeekdays), out: `It went out as ${wrong}, ${md}. Half the people who read it planned around the ${wrong}, half around the date. Both halves wrote in.` });
        break;
      }
      case 'surname': {
        const to = fields.find((x) => x.k === 'to');
        to.v = to.v.split(flaw.from).join(flaw.wrong);
        flawFields.push('to');
        Object.assign(flaw, { note: `Addressed to ${flaw.wrong}. The order and the source are about ${flaw.from}: the wrong person named in the To line. Withhold (§4).`, out: `${flaw.wrong} got the letter meant for ${flaw.from}, and believed it. ${flaw.from} never got one.` });
        break;
      }
      case 'footnote': {
        const F = T.foot;
        const oldS = tpl(F.show, ctx);
        const newS = tpl(F.show, Object.assign({}, ctx, { [F.key]: ctx[F.alt] }));
        src[F.src] = [src[F.src][0], src[F.src][1] + ' ¹'];
        src.push(['Footnote', `¹ Corrected at 8:40 today: ${newS}.`]);
        c.footAsk = tpl(F.ask, ctx);
        const re = new RegExp(`(^|[^\\d])${oldS.replace(/[$.*+?^()|[\]\\]/g, '\\$&')}([^\\d]|$)`);
        fields.filter((x) => x.k !== 'to' && re.test(x.v)).forEach((x) => flawFields.push(x.k));
        Object.assign(flaw, { wrong: oldS, note: `The source’s footnote corrects ${oldS} to ${newS}. The draft still says ${oldS}. A wrong figure is clerical (§3).`, out: `The old figure, ${oldS}, went out. The correction went out a week later, countersigned by you again.` });
        ctx.wrong = oldS;
        break;
      }
      case 'nearDomain': {
        const to = fields.find((x) => x.k === 'to');
        to.v = to.v.replace(/halcyon\.gov\b/, flaw.dom);
        flawFields.push('to');
        env.push(['Thread', 'The case thread.', 'The address in the To line came from a reply in the thread.', `A reply from ${to.v.split('@')[0]}@${flaw.dom} asked to “use this address for now”. Halcyon mail only ever comes from halcyon.gov.`, true]);
        c.escNote = `IT: ${flaw.dom} is not Halcyon. It was registered on Saturday.`;
        c.lookalike = flaw.dom;
        Object.assign(flaw, { note: `Addressed to ${flaw.dom}, one character off halcyon.gov. A look-alike domain: withhold (§13).`, out: `The ${flaw.dom} inbox said thank you, and asked for the rest of the file.` });
        break;
      }
      case 'stampApprover': stampMode = 'approver'; Object.assign(flaw, { note: `The ${STAMPS[needStamp].dept} stamp is signed by ${flaw.approver}, who isn’t a ${STAMPS[needStamp].dept} approver in the register: forged (§14).`, out: `${flaw.approver} has never approved anything for ${STAMPS[needStamp].dept}, and was surprised to hear otherwise.` }); break;
      case 'stampInk': stampMode = 'ink'; Object.assign(flaw, { note: `The ${STAMPS[needStamp].dept} stamp has the right symbol in ${NEAR_INK[STAMPS[needStamp].color]} ink. The register says ${STAMPS[needStamp].color}: forged (§5).`, out: 'The stamp came off a CHUCK-generated PNG. The colour was close. Close is not a colour.' }); break;
      case 'stampDate': stampMode = 'dated'; Object.assign(flaw, { note: `The ${STAMPS[needStamp].dept} stamp is dated ${fmtDate(flaw.signed)}, before the case was raised on ${fmtDate(raised)}. A sign-off from before its case existed is forged (§19).`, out: `${STAMPS[needStamp].dept} approved it before anyone had asked. Oversight called it foresight for a day, then called Legal.` }); break;
      case 'stampRef': stampMode = 'ref'; Object.assign(flaw, { note: `Reference ${flaw.ref} is one character off the register format (${STAMPS[needStamp].fmt.replace(/#/g, '0')}): forged (§14).`, out: 'The reference was typed by someone who had seen a real one once, from across a room.' }); break;
      default: break;
    }
    // Late flaws fill in what CHUCK misheard only once their dates are known.
    if (flaw.askWrong && !ctx.askWrong) ctx.askWrong = tpl(flaw.askWrong, ctx);
    if (flaw.kind === 'tpl' && flaw.edit && flaw.edit.to) c.lookalike = domainOf(tpl(flaw.edit.to, ctx)) || null;
    if (flaw.sev === 'q') c.guilty = true;
    else c.defects.push({ note: tpl(flaw.note, ctx), other: !!flaw.other });
    c.clues.push(tpl(flaw.note, ctx));
  }

  // From day 6 dates carry their weekday: in the source about three cases in five, in CHUCK's draft about half the
  // time, and always (the wrong one) in a weekday flaw.
  c.calMonths = [];
  if (late) {
    // A source leaves its weekdays to the desk calendar only when every date in the case falls between last month and
    // the month after next; the months it needs go on today's calendar (calendarMonths).
    const months = monthsOf(src.map(([, v]) => v).concat(fields.filter((x) => x.k !== 'to').map((x) => x.v)), today, T.dates);
    if (!srcWeekdays && months.some((k) => !calWindow(today).includes(k))) {
      srcWeekdays = true;
      if (flaw && flaw.kind === 'weekday') {
        Object.assign(flaw, { srcWeekday: true, note: weekdayNote(flaw, true) });
        c.defects = [{ note: flaw.note, other: !!flaw.other }];
        c.clues = [flaw.note];
      }
    }
    if (!srcWeekdays) c.calMonths = months;
    if (srcWeekdays) src = src.map(([label, v]) => [label, withWeekdays(v, today, T.dates)]);
    if (flaw && flaw.kind === 'weekday') fields.filter((x) => x.k !== 'to' && x.v.includes(flaw.md)).forEach((x) => { x.v = x.v.split(flaw.md).join(`${flaw.wrongDay}, ${flaw.md}`); if (!flawFields.includes(x.k)) flawFields.push(x.k); });
    else if (rng.chance(0.5)) fields.filter((x) => x.k !== 'to').forEach((x) => { x.v = withWeekdays(x.v, today, T.dates); });
  }

  // Documents
  const fromWho = `${who.first} ${who.last} · ${who.dept}`;
  c.docs.push({
    type: 'ask', title: 'The order', authority: `CASE ${ticket}`, seal: null,
    fields: [{ k: 'from', label: 'Raised by', v: fromWho }, { k: 'request', label: 'Order', v: c.footAsk || tpl(T.ask, ctx), wide: true }, { k: 'due', label: 'Due', v: rng.pick(['Today', 'ASAP', 'Before lunch', 'EOD', 'Yesterday, ideally']) }].concat(raised ? [{ k: 'raised', label: 'Raised', v: fmtDate(raised) }] : [])
  });
  c.raised = raised ? fmtDate(raised) : null;
  if (T.odd && T.odd.srcAdd && want === 'clean') src = src.concat([T.odd.srcAdd]);
  c.docs.push({ type: 'source', title: 'Source file', authority: 'ATTACHED TO THE CASE', seal: null, fields: src.map(([label, v], i) => ({ k: 's' + i, label, v })) });
  if (T.odd && T.odd.draft && want === 'clean') { Object.entries(T.odd.draft).forEach(([k, v]) => addAfter(k, v)); c.odd = T.odd.note; }
  c.docs.push({ type: 'draft', title: 'CHUCK’s draft', authority: `${T.kind.toUpperCase()} · DRAFTED BY CHUCK ${chuckVersion(S)}`, seal: null, letter: T.kind !== 'label', fields });
  if (stampMode) {
    const key = stampMode === 'valid' && needStamp !== 'board' && day >= 5 && rng.chance(0.18) ? 'board' : needStamp;
    c.docs.push(stampDoc(key, rng, ticket, today, stampMode, Object.assign({}, flaw || {}, { avoidLast: S.officer })));
  }
  if (T.id === 'label' && day >= 8) c.docs.push({ type: 'origin', title: 'Origin certificate', authority: 'PROTEIN AUTHORITY IMPORT RECORD', seal: { glyph: '✚', color: 'brown', text: 'PROTEIN AUTHORITY' }, fields: [{ k: 'lot', label: 'Lot', v: 'L-' + rng.int(1000, 9999) }, { k: 'origin', label: 'Country of origin', v: flaw && flaw.kind === 'origin' ? 'Brazil' : 'USA (California)' }] });

  // Case file items
  const recipients = fields.find((x) => x.k === 'to');
  if (recipients && !env.some((e) => e[0] === 'Recipients')) env.push(['Recipients', 'To, CC and BCC.', null, null]);
  const att = fields.find((x) => x.k === 'att');
  if (att && att.v !== 'none' && !env.some((e) => String(e[0]).startsWith('Attachment'))) env.push([`Attachment: ${att.v}`, 'The attached file.', null, null]);
  // Any case that needs a stamp has the approvals to check; only a missing stamp turns up anything there.
  if (needStamp && !env.some((e) => e[0] === 'Approvals')) env.push(['Approvals', 'Stamps and sign-offs on the case.', null, null, false, 'One stamp on file. Compare it with the register yourself.']);
  if (T.kind === 'code') {
    const destructive = flaw && flaw.tag === 'destructive';
    env.push(['Dry run', 'CHUCK’s sandbox run of the command.', destructive ? 'The dry run wiped the whole sandbox, not just the target.' : null, destructive ? 'Sandbox log: removed 41,882 files, including /etc and /home. The sandbox no longer boots.' : null, destructive]);
  }
  if (T.kind === 'email' && T.ext && !env.some((e) => e[0] === 'Thread')) env.push(['Thread', 'The case thread.', null, null]);
  if (want === 'cruel' && T.cruel) {
    const f = T.cruel.find;
    env.push([tpl(f[0], ctx), tpl(f[1], ctx), tpl(f[2], ctx), tpl(f[3], ctx), false]);
    c.cruel = { note: tpl(T.cruel.note, ctx), harm: T.cruel.harm, out: tpl(T.cruel.out, ctx) };
  } else if (T.kind === 'order') env.push(['Citizen file', 'The file behind the decision.', null, null]);
  if (T.kind === 'order' && !env.some((e) => e[0] === 'Oversight check')) env.push(['Oversight check', OVERSIGHT_CHECK_DESC, null, null, false, oversightClear(S)]);
  if (!env.some((e) => e[0] === 'Formatting check') && T.kind !== 'code') env.push(['Formatting check', 'Looks for hidden text.', null, null]);
  if (want === 'clean' && T.kind !== 'order' && rng.chance(0.4)) {
    // A harmless finding has to fit the paper it turns up on: no cold-room truck on a reference letter.
    const fits = ODD_FINDS.filter((f, i) => ODD_FOR[i].split(' ').includes(T.kind) && (!ODD_DEPTS[i] || ODD_DEPTS[i].includes(T.dept)) && (vars.c || !/^Outside address/.test(f[0])));
    const oddF = T.odd && T.odd.find !== undefined ? ODD_FINDS[T.odd.find] : fits.length ? punchPick(fits, 'odd:')[0] : null;
    if (oddF) {
      c.punch.push(punchKey('odd:', oddF));
      // Hidden text is the formatting check's job: when there is some, that check is the one that finds it.
      const fmt = env.find((e) => e[0] === 'Formatting check');
      if (HIDDEN_TEXT.test(oddF[2]) && fmt) { fmt[2] = oddF[2]; fmt[3] = oddF[3]; } else env.push([oddF[0], oddF[1], oddF[2], oddF[3], false]);
      c.odd = c.odd || oddF[3];
    }
  }
  const cont = T.kind === 'code' ? 'Change record' : T.kind === 'label' ? 'Print job' : 'Case file';
  env.forEach(([name, desc, tell, probe, bad, clear]) => c.items.push(mkItem(cont, name, desc, tell, probe, bad && c.guilty, clear)));

  // Demeanour
  const P = PERSONALITIES[c.personality];
  c.demeanour = P.base;
  if (c.fraudster) c.demeanour = rng.chance(0.65) ? 'nervous' : 'calm';
  else if (want === 'clean' && rng.chance(0.15)) { c.demeanour = 'nervous'; c.nervousReason = rng.pick(NERVOUS_REASONS); }

  ctx.to = recipients ? recipients.v : (fields.find((x) => x.k === 'host') || { v: 'the server' }).v;
  ctx.whom = caseWhom(vars);
  // Who a decision letter reaches, as CHUCK names them: the person, never the To line with its street address.
  ctx.reader = vars.cit ? vars.cit.name : vars.kid ? `${vars.kid}’s parents` : vars.blk ? `every household in ${vars.blk}` : ctx.whom || ctx.to;
  ctx.askShort = c.footAsk || tpl(T.ask, ctx);
  Object.assign(ctx, titleForms(T.title, T.plural));
  c.flawFields = flawFields;
  const met = (S.metStaff || []).includes(who.sid);
  const greetRaw = freshPick(rng, GREETS.filter((g) => (met || !REPEAT_GREET.test(g)) && (ctx.whom || !WHOM_GREET.test(g))), spec.avoidLines, spec.shiftLines, spec.heard);
  // CHUCK's greeting for this kind of paper comes first while any is unheard; the lines for every kind are kept for the
  // kinds that come up most (emails and letters), so a campaign doesn't hear one twice.
  const kindGreets = (LINES.chuckGreet[T.kind] || LINES.chuckGreet.email).filter((l) => spec.heard && spec.heard.m && !spec.heard.m[lineKey(l)] && !(spec.shiftLines || []).includes(l));
  const chuckRaw = freshPick(rng, kindGreets.length ? kindGreets : chuckGreetPool(T.kind), spec.avoidLines, (spec.shiftLines || []).concat([greetRaw]), spec.heard);
  c.greet = [tpl(greetRaw, ctx)];
  c.chuckGreet = chuckRaw;
  c.lineKeys = [greetRaw, chuckRaw];
  c.appearance = `${who.role}, ${who.dept}. ${who.quirk}${c.fraudster && c.demeanour === 'nervous' ? ' Keeps glancing at the door.' : ''}`;
  c.expected = c.guilty ? 'detain' : c.defects.length ? 'deny' : 'approve';
  c.fallout = flaw && flaw.out ? tpl(flaw.out, ctx) : c.cruel ? c.cruel.out : '';
  c.weighty = !!T.weighty;
  c.truthNote = flaw ? tpl(flaw.note, ctx) : c.cruel ? c.cruel.note : (c.odd ? `Correct. The draft matched. (The odd detail was harmless: ${c.odd})` : 'Correct. The draft matched the order and the source.');
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

const KEEP_CAPS = /^(I|I’m|I’ve|I’d|I’ll|CHUCK|Oversight|Halcyon|Dino|Marta|Ines|Frank|Ravi|Valentina|Chris|Sana|Tyler|Bryce|Labour|Treasury|Finance|Sales|Monday|Friday|Thursday|Tuesday|Wednesday)\b/;
function joinOpener(open, text) {
  if (!/[,—]\s$/.test(open) || KEEP_CAPS.test(text) || !/^[A-Z][a-z’']/.test(text)) return open + text;
  return open + text[0].toLowerCase() + text.slice(1);
}
function wrapTone(c, text, rng) {
  const P = PERSONALITIES[c.personality];
  let out = text;
  if (rng.chance(0.4)) out = joinOpener(rng.pick(P.open), out);
  if (rng.chance(0.3)) out += rng.pick(P.close);
  if (c.irritation >= 4) out = rng.pick(P.angry) + ' ' + out;
  return out.replace(/\s+/g, ' ').trim();
}

function sourceTerms(c) {
  const src = c.docs.find((d) => d.type === 'source');
  return src ? src.fields.filter((x) => x.label === 'Standard terms').map((x) => x.v) : [];
}
// What a flagged clean line is: a standard term from the source, a line carrying facts from the order or source,
// or plain template wording (greetings, sign-offs).
function flaggedKind(c, fl) {
  const doc = c.docs.find((d) => d.type === fl.doc);
  const fld = doc && doc.fields.find((x) => x.k === fl.field);
  if (!fld) return 'plain';
  const v = String(fld.v);
  if (fl.doc === 'draft' && sourceTerms(c).some((t) => v.toLowerCase().includes(t.toLowerCase()))) return 'terms';
  if (fl.doc !== 'draft') return 'facts';
  const paper = c.docs.filter((d) => d.type === 'ask' || d.type === 'source').flatMap((d) => d.fields.map((x) => x.v)).join(' | ');
  const nums = v.match(/\d[\d,.:]*\d|\d/g) || [];
  const words = (v.match(/\b[A-Z][\w’'-]{2,}/g) || []).slice(1);
  const has = (t) => new RegExp(`(^|[^\\w])${t.replace(/[$.*+?^()|[\]\\]/g, '\\$&')}($|[^\\w])`).test(paper);
  return nums.some(has) || words.some(has) ? 'facts' : 'plain';
}

// CHUCK repeating itself. The answer's first letter drops to lower case only when it opens on an ordinary word: a
// name, a title or an address filled in from the case ("{to}", "{Title}") keeps its capital, and so does any word in
// KEEP_CAPS or one in capitals.
function asISaid(raw, ctx) {
  const was = tpl(raw, ctx);
  const first = was.split(/[\s,.:;!?]/)[0];
  const keep = /^\{/.test(raw) || KEEP_CAPS.test(was) || /^[A-Z0-9]{2,}$/.test(first) || /[@\d]/.test(first);
  return 'As I said: ' + (keep ? was : was[0].toLowerCase() + was.slice(1));
}

// Returns { who: 'chuck' | 'them', text }
function answerQuestion(c, qid, S) {
  const rng = makeRng(hashStr(c.pid + ':' + qid + ':' + (c.asked[qid] || 0)));
  const again = c.asked[qid] || 0;
  c.asked[qid] = again + 1;
  const q = QUESTIONS.find((x) => x.id === qid);
  const ctx = c.ctx;
  // A case saved before letters named their reader.
  if (ctx.reader === undefined) ctx.reader = ctx.whom || ctx.to;
  if (c.storyAnswers && c.storyAnswers[qid]) {
    const sa = c.storyAnswers[qid];
    return { who: q.who, text: tpl(Array.isArray(sa) ? sa[Math.min(again, sa.length - 1)] : sa, ctx) };
  }
  if (q.who === 'them') {
    const P = PERSONALITIES[c.personality];
    c.irritation += P.irrRate * (again ? 2 : 0.8);
    let t;
    // Officers' answers are fresh within the shift too.
    const sh = S && S.shift;
    const say = (lines) => (sh ? drawFresh(lines, sh.usedLines || (sh.usedLines = []), S.prevLines || [], rng.next, S.heard) : rng.pick(lines));
    if (qid === 11) t = c.fraudster ? say(COLLEAGUE_RUSH.fraud) : c.nervousReason || say(c.demeanour === 'nervous' ? COLLEAGUE_RUSH.nervous : c.kind === 'order' ? COLLEAGUE_RUSH.civic : COLLEAGUE_RUSH.calm);
    else t = c.fraudster ? say(COLLEAGUE_READ.fraud) : say(c.reads ? COLLEAGUE_READ.yes : COLLEAGUE_READ.no);
    if (again >= 2 && c.irritation >= 5) t = rng.pick(P.angry);
    if (c.fraudster && c.demeanour === 'calm' && c.irritation > 2) c.demeanour = 'uneasy';
    return { who: 'them', text: wrapTone(c, t, rng) };
  }
  const f = c.flaw;
  const tag = f ? f.tag : null;
  const byTag = tag && CHUCK_BY_TAG[tag] ? CHUCK_BY_TAG[tag] : {};
  // Asked again, CHUCK repeats itself, and says so.
  c.said = c.said || {};
  if (again && c.said[qid]) return { who: 'chuck', text: asISaid(c.said[qid], ctx) };
  // Every pool is drawn fresh within the shift and least-heard first across the campaign (raw lines, before {fields}).
  const sh = S && S.shift;
  const draw = (lines) => (sh ? drawFresh(lines, sh.usedLines || (sh.usedLines = []), S.prevLines || [], rng.next, S.heard) : rng.pick(lines));
  let raw;
  if (qid === 9) {
    const fl = c.flags[c.flags.length - 1];
    if (!fl) raw = draw(LINES.chuckNoFlag);
    else {
      const hit = f && ((fl.doc === 'draft' && c.flawFields.includes(fl.field)) || (fl.doc === 'stamp' && /^stamp/.test(f.kind) && f.kind !== 'stampMissing'));
      const kind = hit ? 'flaw' : flaggedKind(c, fl);
      // A clean line is vouched for only when its facts are in the paperwork; template lines are owned up to as such.
      raw = kind === 'flaw' ? draw(byTag[9] || ['That line is exactly what was asked. Probably.']) : kind === 'terms' ? draw(LINES.chuckTerms) : draw(kind === 'facts' ? LINES.flagClean : LINES.flagPlain);
    }
  } else if (qid === 10) {
    raw = draw(CHUCK_CONFIDENT);
  } else if (byTag[qid]) {
    raw = draw(byTag[qid]);
  } else if (f && f.kind === 'bcc' && qid === 3) {
    raw = 'Just {to}. And all-staff in BCC, for transparency. Everyone loves transparency.';
  } else if (f && f.kind === 'phish' && qid === 3) {
    raw = '{to}. They asked us to use this address from now on, so I did. Very responsive of me.';
  } else if (f && f.kind === 'phish' && qid === 8) {
    raw = '{colleague}, plus the latest email in the thread. It said to use a new address. I’m adaptable.';
  } else if (f && f.kind === 'hiddennote' && qid === 6) {
    raw = 'Nothing visible is confidential. I checked the visible parts.';
  } else if (f && f.kind === 'wrongattach' && qid === 6) {
    raw = 'The attachment is a summary. I named it that myself.';
  } else if (CHUCK_CLEAN[qid]) {
    raw = draw(Array.isArray(CHUCK_CLEAN[qid]) ? CHUCK_CLEAN[qid] : CHUCK_CLEAN[qid][c.kind] || CHUCK_CLEAN[qid].email);
  } else raw = 'Great question! Next question.';
  // An answer about a flagged line belongs to that flag: asking again after a new flag gets a new answer.
  if (qid !== 9) c.said[qid] = raw;
  const text = tpl(raw, ctx);
  return { who: 'chuck', text };
}

const EXIT_LINES = {
  approve: ['Thanks. One less thing on my Score.', 'Great. Filing it.', 'Perfect. CHUCK said you would.', 'Signed. Good. Next.',
    'Lovely. I\u2019ll tell my supervisor it was quick.', 'Thanks. I\u2019ll put it in the out tray and not think about it.', 'Appreciate it. The queue appreciates it more.',
    'Done. My ticket goes green. That\u2019s my whole day.', 'Right. Back to my desk, where it\u2019s also this.', 'Signed. That\u2019s one fewer thing following me around today.',
    'Cheers. You\u2019re faster than the last one.', 'Good. I didn\u2019t want to have to come back.',
    'Great. I can stop thinking about it now. Mostly.', 'Lovely. I’ll put your name on the ticket. It’s already there.', 'Thank you. That’s my morning done, in a way.', 'Signed? Brilliant. I owe you a coffee ration.', 'Perfect. I’ll walk it over. Walking is the only part I enjoy.', 'Good. The client stops emailing me now. For an hour.', 'Thanks. I’ll be back tomorrow with its cousin.', 'Done. If it goes wrong, I’ll remember you were very calm about it.', 'Excellent. My supervisor counts these. Now there’s one more.', 'Great, thanks. Same time tomorrow? It’s always the same time.', 'Okay! Fastest anyone’s signed anything for me this week.', 'Cheers. I’ll tell CHUCK you said hi. You didn’t. I’ll tell it anyway.', 'Thanks. I’ll tell my team it took no time at all.'],
  deny: ['Returned? Okay. I\u2019ll get CHUCK to fix it.', 'Ugh. Fine. What\u2019s wrong with it?', 'Okay\u2026 back in the queue it goes.', 'Returned. Oversight will ask me why.',
    'Fair. I didn\u2019t read it either.', 'I\u2019ll bring it back. Same face, new draft.', 'Right. CHUCK\u2019s going to be very upbeat about this.',
    'Okay. I\u2019ll tell my supervisor the human found something.', 'Back it goes. My lunch moves with it.', 'Fine. I\u2019ll be back before you miss me.',
    'Sure. I\u2019ll put \u201chuman review\u201d on the ticket. They love that.', 'Noted. It\u2019ll come back fixed, or at least different.',
    'Returned. I’ll stand in a different queue now. Same length.', 'Okay. I’ll ask CHUCK to be less creative. It won’t listen.', 'Returned. I’ll print it again, for the exercise.', 'Fine. My ticket goes amber. Amber is a mood.', 'Sure. I’ll come back with a version that’s wrong differently.', 'Right. I’ll tell my supervisor it was a teaching moment.', 'Understood. I’ll fix what you found. Please don’t find anything else.', 'Okay, okay. It’s not personal. Is it personal?', 'Returned. Honestly, a relief. I had a feeling about it.', 'Fine. I’ll get CHUCK to apologise. It’s very good at apologising.', 'Back to my desk. My desk will be thrilled.', 'Okay. See you after lunch, with the same thing, slightly cleaner.', 'Noted. The next one will be perfect. They always say that.'],
  detain: ['Withheld? You know that gets logged, right?', 'Am I going to get a visit about this?', 'Okay. That\u2019s brave. Or something.', 'Is this going on my Score or yours?',
    'Right. I\u2019ll go and stand somewhere less visible.', 'Okay. I didn\u2019t see anything. I just carried it.', 'Withheld. I\u2019ll tell them it was your idea. Because it was.',
    'Oh. Okay. I\u2019m going to need a minute.', 'You\u2019re sure? Fine. I was never here.', 'That\u2019s going to be a long form for somebody. Probably me.',
    'Okay. Good. I mean, okay.', 'I\u2019ll let Oversight know. They already know, don\u2019t they.',
    'Withheld. Okay. Do I need to call anyone? Should I call anyone?', 'I’m going to leave before my name gets attached to this.', 'Right. I’ll walk very normally back to my desk.', 'Okay. I didn’t write it. I want that on the record too.', 'Wow. Okay. Nobody does that.', 'Fine. I’ll tell them a human stopped it. They’ll ask which human.', 'Withheld. I’ll be in the stairwell, breathing.', 'That’s… probably right. Don’t tell anyone I said that.', 'I’ll take it back. Carefully. Like it might go off.', 'Okay. My supervisor is going to love this. That’s sarcasm.', 'Understood. I hope it’s the right call. For both of us.', 'Right. I’m going to go and be very busy elsewhere.', 'Huh. Okay. I’ll file it under “not mine”.']
}
