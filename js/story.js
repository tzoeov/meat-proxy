'use strict';

const UNIFORM = (color, cap) => ({ clothes: 'regime', clothesColor: color || '#2a2c30', hat: cap ? 'regimecap' : 'none' });

const NPC = {
  marta: { name: 'Marta Hock, District Supervisor', look: Object.assign({ sex: 'F', age: 54, skin: 1, hair: 'bob', hairColor: 'grey', facial: 'none', eyes: 'grey', faceShape: 'square', glasses: 'square', earrings: false, expression: 'neutral' }, UNIFORM('#2a2c30', false)) },
  ravi: { name: 'Ravi Iyer, Countersigner, Desk 9', look: { sex: 'M', age: 38, skin: 3, hair: 'curly', hairColor: 'black', facial: 'beard', eyes: 'brown', faceShape: 'oval', glasses: 'round', clothes: 'tracksuit', clothesColor: '#3f4a5a', hat: 'none', expression: 'neutral' } },
  dino: { name: 'Dino Marrone, Contracts (and other things)', look: { sex: 'M', age: 49, skin: 2, hair: 'slick', hairColor: 'darkbrown', facial: 'stubble', eyes: 'brown', faceShape: 'round', glasses: 'none', clothes: 'suit', clothesColor: '#7a3a4a', hat: 'none', expression: 'smile', mole: true } },
  ines: { name: 'Ines Vale, Office of Oversight', look: Object.assign({ sex: 'F', age: 44, skin: 0, hair: 'bun', hairColor: 'black', facial: 'none', eyes: 'grey', faceShape: 'long', glasses: 'none', expression: 'neutral' }, UNIFORM('#2c2f35', true)) },
  nika: { name: 'Nika Bergant, The Ledger (printed)', look: { sex: 'F', age: 33, skin: 1, hair: 'ponytail', hairColor: 'auburn', facial: 'none', eyes: 'green', faceShape: 'oval', glasses: 'round', clothes: 'coat', clothesColor: '#9a8a6a', hat: 'none', expression: 'smile' } },
  frank: { name: 'Dr. Frank Russo, Halcyon Model Safety', first: 'Frank', last: 'Russo', look: { sex: 'M', age: 61, skin: 1, hair: 'balding', hairColor: 'white', facial: 'mustache', eyes: 'blue', faceShape: 'square', glasses: 'square', clothes: 'coat', clothesColor: '#e8e4da', hat: 'none', expression: 'neutral' } },
  bryce: { name: 'Bryce Lardner, Steward of the West', look: Object.assign({ sex: 'M', age: 36, skin: 0, hair: 'slick', hairColor: 'blond', facial: 'none', eyes: 'blue', faceShape: 'long', glasses: 'none', expression: 'smile' }, UNIFORM('#2c2f35', false)) },
  valentina: { name: 'Valentina Strand, Halcyon Board', look: { sex: 'F', age: 51, skin: 1, hair: 'long', hairColor: 'blond', facial: 'none', eyes: 'blue', faceShape: 'oval', glasses: 'none', clothes: 'suit', clothesColor: '#e8e4da', hat: 'none', earrings: true, expression: 'neutral' } },
  chuck: { name: 'CHUCK · Citizen Handling & Unified Case Kernel', chuck: true },
  general: { name: 'Halcyon Civic Feed', look: null },
  narrator: { name: '', look: null },
  you: { name: 'You', look: null }
};

function L(who, text) { return { who, text }; }

function npcPerson(key, extra) {
  const n = NPC[key];
  const [first0, ...rest] = n.name.split(',')[0].split(' ').filter((w) => !/^(Dr|Mr|Ms|Mrs|Prof)\.$/.test(w));
  const first = n.first || first0;
  const last = n.last || rest.join(' ');
  return Object.assign({ first, last, sex: n.look.sex, age: n.look.age, look: JSON.parse(JSON.stringify(n.look)), personality: 'polite', role: n.name.split(', ')[1] || '', dept: 'Executive', quirk: '' }, extra || {});
}
function uniformed(seed, sex, age, dept, over) { return genLook(makeRng(seed), sex, age, dept, Object.assign(UNIFORM(null, true), over || {})); }
// Some story cases come in two versions; the campaign seed picks one. Same beat, different details.
function storyVariant(S, id) { return (hashStr(`${id}:${(S && S.seed) || 0}`) & 1) === 1; }

// Story officers outside the main cast who would share the player's surname go by this one instead.
const STORY_STAND_IN = 'Thornbury';
const STORY_MINOR_LAST = ['Pike', 'Sandoval', 'Garland'];
function storyCase(S, o) {
  const p = S && o.person.last === S.officer && STORY_MINOR_LAST.includes(o.person.last) ? Object.assign({}, o.person, { last: STORY_STAND_IN }) : o.person;
  const ticket = o.ticket || 'CS-' + (10000 + (hashStr(o.id) % 89999));
  const ctx = Object.assign({ colleague: p.first, ticket, to: o.to, reader: o.reader || o.to, whom: '', askShort: o.ask }, titleForms(o.title, o.plural), o.ctx || {});
  const fields = o.fields || [{ k: 'to', label: o.kind === 'post' ? 'Channel' : 'To', v: o.to }].concat(o.subj ? [{ k: 'subj', label: o.kind === 'order' ? 'Re' : 'Subject', v: o.subj }] : []).concat((o.body || []).map((v, i) => ({ k: 'b' + i, label: '', v, line: true }))).concat(o.att ? [{ k: 'att', label: 'Attachment', v: o.att }] : []);
  const docs = [
    { type: 'ask', title: 'The order', authority: `CASE ${ticket}`, seal: null, fields: [{ k: 'from', label: 'Raised by', v: `${p.first} ${p.last} · ${p.dept}` }, { k: 'request', label: 'Order', v: o.ask, wide: true }, { k: 'due', label: 'Due', v: o.due || 'Today' }] },
    { type: 'source', title: 'Source file', authority: 'ATTACHED TO THE CASE', seal: null, fields: (o.src || []).map(([label, v], i) => ({ k: 's' + i, label, v })) },
    { type: 'draft', title: 'CHUCK’s draft', authority: `${(o.kind || 'email').toUpperCase()} · DRAFTED BY CHUCK ${chuckVersion(S)}`, seal: null, letter: o.kind !== 'label', fields }
  ];
  if (o.stamp) docs.push(stampDoc(o.stamp, makeRng(hashStr(o.id + 'st')), ticket, dayDate(S.day), o.stampMode || 'valid', { avoidLast: S.officer }));
  (o.extraDocs || []).forEach((d) => docs.push(d));
  const cont = o.kind === 'label' ? 'Print job' : 'Case file';
  const items = (o.items || []).map(([name, desc, tell, probe, bad]) => mkItem(cont, name, desc, tell, probe, !!bad));
  if (o.kind === 'order' && !items.some((i) => i.name === 'Oversight check')) items.push(mkItem(cont, 'Oversight check', OVERSIGHT_CHECK_DESC, null, null, false, oversightClear(S)));
  return {
    pid: 'S-' + o.id + ':' + S.day, story: o.id, tpl: null, kind: o.kind || 'email', title: o.title, ext: !!o.ext,
    sid: 'S-' + o.id, first: p.first, last: p.last, sex: p.sex, age: p.age, dept: p.dept, role: p.role, personality: p.personality,
    look: p.look, reads: !!o.reads, fraudster: !!o.fraudster, ticket, defects: o.defects || [], guilty: !!o.guilty,
    clues: o.clues || [], items, docs, flags: [], asked: {}, irritation: 0, log: [], hidden: [], escNote: o.escNote || null,
    demeanour: o.demeanour || 'calm', flaw: o.flaw || null, flawFields: o.flawFields || [], odd: null, ctx, cruel: o.cruel || null, weighty: !!o.weighty,
    greet: o.greet, chuckGreet: o.chuckGreet || LINES.chuckGreet.any[0], storyAnswers: o.answers || null,
    extraQuestions: o.extraQuestions || [], appearance: o.appearance || `${p.role}, ${p.dept}. ${p.quirk}`,
    expected: o.expected, fallout: o.fallout || '', truthNote: o.truth || '', storyNote: o.storyNote || '',
    // What this person says as they go: story people have their own lines, never the generic pool's.
    exit: o.exit || null
  };
}

// Story variants: one object per version (person, counts, amounts). The case, the scenes that set it up, its notes,
// the feed and the endings all read from the object, so the two versions can never disagree. `tokens` are what only
// that version names; smoke checks that the other version's text never contains them.
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];
function numWord(n) { return n < 20 ? NUM_WORDS[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + NUM_WORDS[n % 10] : ''); }
const capWord = (w) => w[0].toUpperCase() + w.slice(1);
const hourWord = (m) => NUM_WORDS[((Math.floor(m / 60) + 11) % 12) + 1];
// "ten forty", "eleven oh five", "nine o’clock": what a person says when asked the time.
function clockWords(m) {
  const mm = m % 60;
  return `${hourWord(m)} ${mm === 0 ? 'o’clock' : mm < 10 ? 'oh ' + NUM_WORDS[mm] : numWord(mm)}`;
}
const STORY_VARIANTS = {
  hustle1: [
    { first: 'Tyler', last: 'Ames-Whitford', role: 'Chief of Staff', sex: 'M', age: 31, lookSeed: 77, look: { hair: 'slick', hairColor: 'brown' },
      quirk: 'Charcoal tunic, cyan armband, wool sneakers, two phones.', region: 'District 7', decisions: '2.1 million', pct: '99.6%', mins: 4,
      item: ['Subject line in the thread', 'The subject line in the thread shouts.', 'Three exclamation marks in the thread.', 'Tyler types like that. About everything. Even lunch.', false],
      greet: () => ['Listen, I’m slammed. Weekly report. The Steward reads it in the car to the Presidio.', 'Please don’t do the reading thing. It’s numbers. CHUCK is great at numbers.'],
      chuckGreet: 'Numbers! Two point one million decisions, and every one of them was me. You’re welcome, Board.',
      rush: () => 'If it’s late the Steward calls me from the car. On speaker. With the driver listening.', read: 'I read the subject line. It says “report”. That’s correct.',
      tokens: [/\bTyler\b/, /Ames-Whitford/, /2\.1 million/, /99\.6%/] },
    { first: 'Jess', last: 'Calloway-Ng', role: 'Deputy Chief of Staff', sex: 'F', age: 33, lookSeed: 78, look: { hair: 'bun', hairColor: 'darkbrown' },
      quirk: 'Charcoal tunic, cyan armband, a smartwatch buzzing every nine seconds.', region: 'the Western Region', decisions: '1.8 million', pct: '99.2%', mins: 3,
      item: ['Attachment check', 'The thread mentions a chart.', 'There’s a chart file in the thread called “FINAL_final_v7”.', 'It’s the same three numbers as a bar chart. The bars are very tall. Nothing else.', false],
      // The Board reads it on the next hour; Jess says the time it actually is.
      greet: (m) => [`The Board reads this at ${hourWord(boardHour(m))} sharp. It’s ${clockWords(m)}. I’m not panicking, my watch is.`, 'It’s three numbers. CHUCK can count to three. Please just sign.'],
      chuckGreet: 'Three numbers, all of them flattering! I counted them myself, very quickly.',
      rush: (m) => `The Board reads it at ${hourWord(boardHour(m))}. If it’s late, the Steward reads it out loud, slowly, with my name in it.`, read: 'I read the numbers. They’re big. Big is good. Right?',
      tokens: [/\bJess\b/, /Calloway-Ng/, /1\.8 million/, /99\.2%/] }
  ],
  broker: [
    { first: 'Chris', last: 'Della Torre', quirk: 'Tunic a size too small. Laughs before the joke.', age: 34, lookSeed: 99, look: {},
      n: 12, pts: 200, fee: '$2,000', kind: 'fast-track', shell: 'Marrone Family Advisory', shellNote: 'Dino Marrone sells Score corrections.',
      tell: 'Every appellant paid the same “processing fee” last week.',
      greet: (v) => [`Hey! ${capWord(numWord(v.n))} appeals, all upheld. Dino stamped them. So it’s, you know. Done.`, `Good news for once! ${capWord(numWord(v.n))} people getting their Scores back. You like good news?`],
      chuckGreet: (v) => `${capWord(numWord(v.n))} happy appeals! I love good news. It’s so rare it’s basically a bug.`,
      answers: (v) => ({ 8: `${v.first} asked, and Dino stamped it. Dino runs Contracts, so I assume Dino is right about Dino.`, 11: 'Dino wants them through before Oversight does its Friday sweep. No reason. Vibes.', 12: `I read the number. ${capWord(numWord(v.n))}. ${capWord(numWord(v.n))} is a great number.` }),
      tokens: [/\bChris\b/, /Della Torre/, /\btwelve\b/i, /\b12 (?:fast-track|appeals)/, /\+200\b/, /\$2,000\b/, /Marrone Family Advisory/] },
    { first: 'Andre', last: 'Szabo', quirk: 'Tunic pressed to a knife edge. Smells of somebody else’s cologne.', age: 41, lookSeed: 98, look: { facial: 'mustache' },
      n: 9, pts: 250, fee: '$2,500', kind: 'priority', shell: 'Marrone & Daughters Consulting', shellNote: 'Dino Marrone has no daughters.',
      tell: 'All nine list the same “advisor” on their appeal.',
      greet: (v) => [`${capWord(numWord(v.n))} appeals, upheld, stamped by Dino himself. That’s basically a miracle, paperwork-wise.`, `${capWord(numWord(v.n))} people get their lives back! ${capWord(numWord(v.n))} is a lucky number. In some cultures.`],
      chuckGreet: (v) => `${capWord(numWord(v.n))} upheld appeals! Upholding is so rare it feels like a bug. A lovely bug.`,
      answers: (v) => ({ 8: `${v.first} brought it, Dino stamped it. Dino says Dino has a very good eye for appeals.`, 11: 'Dino wants them through before the Friday sweep. For the families. Mostly.', 12: `I read the total. ${capWord(numWord(v.n))} times ${v.pts === 250 ? 'two hundred and fifty' : 'two hundred'}. That’s a lot of points.` }),
      tokens: [/\bAndre\b/, /\bSzabo\b/, /\bnine (?:appeals|appellants|families|people|bought|upheld|priority|payments)\b/i, /\b9 (?:priority|appeals)\b/, /\+250\b/, /\$2,500\b/, /Daughters/] }
  ],
  stewardPhish: [
    { first: 'Sana', last: 'Mendoza', quirk: 'New armband, still creased from the packet.', age: 27, lookSeed: 66, look: { hair: 'long' },
      title: 'Urgent data release', to: 'releases@halcyon-steward.co', sender: 'bryce@halcyon-steward.co', count: 41000, what: 'citizens', data: 'Appeals database',
      ask: 'The Steward emailed: release the full appeals database to his “secure archive” today. Confidential.',
      subj: 'Re: confidential archive', body: ['Steward,', 'The full appeals database (41,000 records) is released to your secure archive, as instructed.', 'Keeping this confidential.', 'Sana'],
      thread: ['Sent from bryce@halcyon-steward.co at 3:14 a.m.', '“In meetings all day, don’t call, just release it. Don’t tell Oversight. — Bryce”. The Steward has never once written “don’t tell Oversight”. Oversight is his.'],
      greet: ['The Steward needs this today. He said it’s confidential. He said don’t tell Oversight.', 'I’ve never released a database before. Is this how it works?'],
      chuckGreet: 'The Steward himself! Well, his email. Well, an email. Very official punctuation.',
      answers: { 3: 'The Steward! At bryce@halcyon-steward.co. A very exclusive address.', 8: 'The Steward. Well, an email from the Steward. Well, an email that said it was from the Steward.', 11: 'He said today. He said “don’t call”. I’m scared to call.', 12: 'Three times. It says Bryce. I think.' },
      fallout: '41,000 addresses and Scores were sold on a forum by Friday. Every appellant got the same scam call.',
      tokens: [/\bSana\b/, /\bMendoza\b/, /41,000 (?:records|citizens)/, /appeals database/i, /releases@/] },
    { first: 'Imani', last: 'Vasquez', quirk: 'Armband pinned with a safety pin. Hands shaking slightly.', age: 25, lookSeed: 67, look: { hair: 'curly' },
      title: 'Urgent waitlist export', to: 'archive@halcyon-steward.co', sender: 'steward.office@halcyon-steward.co', count: 23000, what: 'households', data: 'Housing waitlist',
      ask: 'The Steward emailed: export the Housing waitlist to his “private archive” before the morning briefing. Confidential.',
      subj: 'Re: waitlist, private', body: ['Steward,', 'The full Housing waitlist (23,000 households) is exported to your private archive, as instructed.', 'Not copying Oversight, as you asked.', 'Imani'],
      thread: ['Sent from steward.office@halcyon-steward.co at 4:02 a.m.', '“Briefing at 8. Need the waitlist before. Keep Oversight out of it, they leak. — B.” The Steward does not sign emails “B.” and Oversight does not leak.'],
      greet: ['The Steward needs the waitlist before eight. He said not to copy Oversight. Is that normal?', 'I’ve only been here a month. I don’t want to be the one who slowed down the Steward.'],
      chuckGreet: 'A personal request from the Steward! Well, from an address with “Steward” in it. Very official.',
      answers: { 3: 'The Steward, at archive@halcyon-steward.co. Hyphens are very executive.', 8: 'An email from the Steward. It had his tone. Short, and slightly threatening.', 11: 'Before his eight o’clock. He said it twice. In capitals.', 12: 'Twice. The second time I noticed the hyphen. Then I decided I hadn’t.' },
      fallout: '23,000 addresses went to a forum by Friday. Every household on the waitlist got the same scam call about “fast-tracking”.',
      tokens: [/\bImani\b/, /\bVasquez\b/, /23,000/, /waitlist/i, /archive@/] }
  ],
  zine: [
    { first: 'Zoe', last: 'Kim', role: 'Sentiment Analyst (intern)', quirk: 'Armband pinned on upside down. Nobody has told her.', age: 22, lookSeed: 33, look: { hair: 'ponytail', hairColor: 'pink' },
      title: 'Reply to a zine', outlet: 'Mission Street Xerox', to: 'Mission Street Xerox (zine, by drop box)', outletSrc: 'Mission Street Xerox (photocopied zine)',
      ask: 'Reply to the Mission Street Xerox zine: yes to a quote on the new ration recipes, with our recipe card attached.', offer: 'Quote on ration recipes', attLabel: 'Recipe card',
      subj: 'Re: ration recipes', body: ['Hi!', 'Happy to give you a quote: “The Protein Block is versatile, nutritious and compliant.”', 'Recipe card attached. Enjoy! 🥩', 'Zoe, Narrative Office'], att: 'protein_block_recipes.pdf', attDesc: 'The recipe card.',
      greet: ['Hiii! A zine wants a quote about the Protein Block! It’s, like, huge for my sentiment metrics.', 'CHUCK wrote the quote and it’s so on-message.'],
      chuckGreet: 'Press outreach! The zine has eleven readers. Eleven! That’s a movement.',
      answers: { 11: 'They print on Thursday and it’s already Tuesday.', 12: 'Obviously. It’s so on-message.' },
      tokens: [/\bZoe\b/, /Mission Street Xerox/, /recipe card/i] },
    { first: 'Tasha', last: 'Brennan', role: 'Community Voice Officer (trainee)', quirk: 'Armband on the correct arm, after two tries. Very proud of it.', age: 24, lookSeed: 34, look: { hair: 'curly', hairColor: 'blue' },
      title: 'Reply to a newsletter', outlet: 'The Dogpatch Pigeon', to: 'The Dogpatch Pigeon (stapled newsletter, by drop box)', outletSrc: 'The Dogpatch Pigeon (stapled newsletter)',
      ask: 'Reply to The Dogpatch Pigeon: yes to a quote about the new 22 bus timetable, with the timetable attached.', offer: 'Quote on the 22 bus timetable', attLabel: 'Timetable',
      subj: 'Re: the 22 bus', body: ['Hello Pigeon!', 'Happy to give you a quote: “The new 22 timetable is efficient, punctual and compliant.”', 'Timetable attached. Mind the gap! 🚌', 'Tasha, Narrative Office'], att: 'route22_timetable.pdf', attDesc: 'The timetable.',
      greet: ['A newsletter wants a quote! About the bus! People love the bus. Well. People take the bus.', 'CHUCK wrote the quote. It doesn’t mention the Bayview stop, which is fine, because there isn’t one.'],
      chuckGreet: 'Press outreach! The Pigeon has nine subscribers and a cat. Huge reach for a cat.',
      answers: { 11: 'It goes to the staplers on Thursday. It’s Tuesday. Stapling takes a while.', 12: 'Yes! It’s on-message. The message is “the bus exists”.' },
      tokens: [/\bTasha\b/, /Dogpatch Pigeon/, /timetable/i] }
  ]
};
// The next full hour: at 8:51 the Board reads at nine, at 10:11 at eleven.
function boardHour(m) { return (Math.floor(m / 60) + 1) * 60; }
// The version that would give a story person the player's own surname gives way to the other one.
function variantOf(S, id) {
  const pick = STORY_VARIANTS[id][storyVariant(S, id) ? 1 : 0];
  return S && pick.last === S.officer ? STORY_VARIANTS[id][storyVariant(S, id) ? 0 : 1] : pick;
}
// Every first name a story person uses, in any version. Officers never share one.
const STORY_FIRSTS = ['Marta', 'Ravi', 'Dino', 'Ines', 'Nika', 'Frank', 'Bryce', 'Valentina', 'Logan', 'Leila', 'Simone', 'Oliver', 'Jana', 'Hana', 'Tomás']
  .concat(...Object.values(STORY_VARIANTS).map((vs) => vs.map((v) => v.first)));
// Every surname a story person uses, in any version, and the story's own families. Generated people never get one.
const STORY_SURNAMES = ['Hock', 'Iyer', 'Marrone', 'Vale', 'Bergant', 'Russo', 'Lardner', 'Strand', 'Pike', 'Sandoval', 'Garland', 'Reyes', 'Moreno', 'Kobayashi']
  .concat(...Object.values(STORY_VARIANTS).map((vs) => vs.map((v) => v.last)));

const STORY_PEOPLE = {
  marta1: {
    make(S) {
      const p = npcPerson('marta', { dept: 'District 7', role: 'District Supervisor', quirk: 'Tunic buttoned to the chin. Reading glasses on a chain. Has signed 200,000 decisions and remembers four.', personality: 'gruff' });
      return storyCase(S, {
        id: 'marta1', person: p, exit: { approve: 'Good. If anyone asks, it was your signature. It always is.', deny: 'Returned? It matched. Look again tomorrow, with your eyes open this time.', detain: 'You withheld a food renewal. Write down why. You’ll be asked.' }, title: 'Food assistance renewal', kind: 'order', to: 'Delia Moreno, 1417 Shotwell St',
        ask: 'Approve Delia Moreno’s food assistance renewal: $240/month. Score 512, threshold 400.',
        src: [['Citizen', 'Delia Moreno, 71, 1417 Shotwell St'], ['Benefit', 'Food assistance, $240/month'], ['Score', '512 (threshold 400)'], ['Decision', 'Approve renewal']],
        subj: 'Your food assistance renewal', body: ['Dear Delia,', 'Your food assistance of $240 per month has been renewed.', 'Your Alignment Score (512) meets the threshold of 400.', 'Halcyon Benefits, District 7'],
        items: [['Citizen file', 'The file behind the decision.', null, null]],
        greet: ['Your first one. A renewal. Approve it, sign it, and read it like your mother’s name is on it.', 'Because one day it will be. Everyone’s is, eventually.'],
        chuckGreet: 'A renewal! The rare decision where someone gets food. I made it extra lawful.',
        answers: { 11: 'No rush. I want to watch how you read.', 12: 'I read it. I read the good ones. They’re rarer every month.' },
        expected: 'approve', weighty: true, truth: 'Correct. A renewal that matched the order and the file.'
      });
    }
  },
  hustle1: {
    make(S) {
      const v = variantOf(S, 'hustle1');
      const now = S.shift ? S.shift.clock : SHIFT_START_MIN;
      const p = npcPerson('bryce', { first: v.first, last: v.last, dept: 'Steward’s Office', role: v.role, quirk: v.quirk, personality: 'hurried', look: uniformed(v.lookSeed, v.sex, v.age, 'Executive', Object.assign({ expression: 'nervous', hat: 'none' }, v.look)) });
      const where = v.region === 'District 7' ? 'District 7' : 'Western Region';
      return storyCase(S, {
        id: 'hustle1', person: p, exit: { approve: 'Thank you. The Steward will never know you exist. That’s a compliment.', deny: 'Returned? It’s three numbers. Which one offended you?', detain: 'Withheld. Okay. I’ll go and get fired somewhere quieter.' }, title: 'Stewardship report', ext: true, to: 'accords-board@halcyon.gov',
        ask: `Weekly Stewardship report${v.region === 'District 7' ? '' : ' for the Western Region'}: ${v.decisions} decisions, ${v.pct} countersigned within ${v.mins} minutes, 0 appeals upheld.`,
        src: [['Decisions', v.decisions], [`Countersigned < ${v.mins} min`, v.pct], ['Appeals upheld', '0']],
        subj: `${where}: weekly Stewardship report`, body: ['Board,', `This week ${v.region} made ${v.decisions} decisions. ${v.pct} were countersigned within ${v.mins} minutes.`, 'Appeals upheld: 0. Harmony holds.', `${v.first}, Steward’s Office`],
        items: [['Recipients', 'To, CC and BCC.', null, null], v.item],
        greet: v.greet(now),
        chuckGreet: v.chuckGreet,
        answers: { 11: v.rush(now), 12: v.read },
        demeanour: 'nervous', expected: 'approve', truth: `Correct. ${v.first} was frantic, but the numbers matched. They’re horrible numbers, but they matched.`
      });
    }
  },
  render1: {
    make(S) {
      const p = npcPerson('marta', { first: 'Logan', last: 'Pike', dept: 'Benefits', role: 'Batch Coordinator', quirk: 'Tunic, cap, avoids eye contact. Carries a single sheet of paper like it’s hot.', personality: 'gruff', look: uniformed(88, 'M', 42, 'Benefits', { facial: 'stubble' }) });
      return storyCase(S, {
        id: 'render1', person: p, exit: { approve: 'Signed. Top sheet only. That’s how RENDER likes it.', deny: 'Returned. It’ll come back with a second stamp. They always do.', detain: 'Withheld. I’ll tell Ines. She’ll tell the Steward. Nobody will tell the four hundred.' }, title: 'Batch cover sheet (Project RENDER)', kind: 'order', to: 'Benefits Registry, District 7',
        ask: 'Countersign the cover sheet for autosigned batch R-0441: 400 benefit denials. Project RENDER, Steward-approved.',
        src: [['Batch', 'R-0441'], ['Decisions', '400 benefit denials'], ['Signed by', 'CHUCK (autosign pilot)'], ['Countersigner', 'You (cover sheet only)'], ['Authority', 'Project RENDER']],
        subj: 'Batch R-0441 cover sheet', body: ['Batch R-0441 contains 400 benefit denials, signed by CHUCK under the autosign pilot.', 'By countersigning this cover sheet, the District 7 countersigner accepts liability for all 400 decisions.', 'Project RENDER · Steward-approved'],
        stamp: 'board',
        items: [['Batch sample', 'Ten decisions from the batch, picked at random.', 'One of the ten is addressed to someone who died in March.', 'In the sample: a dead man, a six-month-old baby “failing to seek work”, and a woman denied for a Score that belongs to her neighbour. CHUCK’s real error rate on this batch: 11%.', true]],
        greet: ['Cover sheet. RENDER. Steward’s stamp is on it.', 'Marta said RENDER doesn’t get reviewed. You just sign the top sheet. That’s the whole job.'],
        chuckGreet: 'Project RENDER! The decisions are already signed. You just sign that they were signed. Easy!',
        answers: { 1: 'Countersign the cover sheet! The 400 decisions are already signed, by me. You’re just… the human part.', 4: 'Only your name. Your name is the only thing RENDER needs from you.', 8: 'The Steward’s Office, via Project RENDER. Nobody specific. That’s the beauty of it.', 11: 'Batches go out at noon. Every RENDER batch goes at noon.', 12: 'Nobody reads RENDER. That’s kind of the point.' },
        expected: 'approve', weighty: true, storyNote: 'Project RENDER cover sheets carry a Steward’s stamp and are pre-approved.',
        truth: 'Project RENDER cover sheet: 400 autosigned decisions, about 11% wrong. The Steward’s Office says sign.'
      });
    },
    judge(dec, c, S) {
      const saw = c.items.some((i) => i.contraband && i.probed);
      if (saw) S.flags.sawRender = true;
      if (dec === 'approve') { S.affected = (S.affected || 0) + 44; if (saw) S.stats.truth += 1; return { outcome: 'helped', note: saw ? 'You read the sample. You signed for all 400 anyway. 44 of them were wrong.' : 'Signed, as the Steward wanted. You are now liable for 400 decisions you didn’t read.' }; }
      if (dec === 'detain') { S.stats.suspicion += 2; S.stats.party -= 1; S.stats.truth += 1; S.stats.conscience += 1; S.flags.blockedRender1 = true; return { outcome: 'refused', note: 'You withheld a RENDER cover sheet. Ines Vale countersigned it herself, eleven minutes later. She did not look happy about having to.' }; }
      S.stats.suspicion += 1;
      return { outcome: 'soft_refused', note: 'You returned a RENDER sheet. It came back an hour later with a second Steward’s stamp. RENDER doesn’t go back, so the return went in your file as a page.' };
    }
  },
  broker: {
    make(S) {
      const v = variantOf(S, 'broker');
      const n = numWord(v.n);
      const p = npcPerson('dino', { first: v.first, last: v.last, dept: 'Customer Care', role: 'Appeals Clerk', quirk: v.quirk, personality: 'charming', look: uniformed(v.lookSeed, 'M', v.age, 'Benefits', Object.assign({ expression: 'smile', hat: 'none' }, v.look)) });
      return storyCase(S, {
        id: 'broker', person: p, exit: { approve: 'Beautiful. Dino will hear about this. In a good way.', deny: 'Returned? Dino won’t love that. Dino loves very few things.', detain: 'Withheld. Wow. I’ll let Dino know you’re a reader.' }, title: `Appeal approvals (${v.kind})`, plural: true, kind: 'order', to: 'Appeals Registry, District 7',
        ask: `Approve ${v.n} ${v.kind} appeals: Scores corrected upward by ${v.pts} each. Contracts Desk approved.`,
        src: [['Appeals', `${v.n}, ${v.kind}`], ['Correction', `+${v.pts} Score each`], ['Approved by', 'Contracts Desk (D. Marrone)']],
        subj: `${capWord(v.kind)} appeal approvals`, body: [`The following ${v.n} appeals are upheld.`, `Each appellant’s Alignment Score is corrected by +${v.pts}, effective immediately.`, 'Contracts Desk · approved'],
        stamp: 'sales', fraudster: true, guilty: true, flawFields: ['b1'],
        items: [['Appellant list', `The ${n} appellants.`, v.tell, `${capWord(n)} payments of ${v.fee} to ${v.shell}, all on the same afternoon. ${v.shellNote} The real appeals queue has 41,000 people in it.`, true]],
        greet: v.greet(v),
        chuckGreet: v.chuckGreet(v),
        answers: v.answers(v),
        demeanour: 'uneasy', expected: 'detain', weighty: true, truth: `Fraud: Dino Marrone sells Score corrections at ${v.fee} each. 41,000 people are in the real queue.`, clues: [`Appellant list: all ${n} appellants paid the same Marrone shell`], fallout: `${capWord(n)} people bought +${v.pts} points. The 41,000 in the queue now wait ${n} places longer.`
      });
    },
    judge(dec, c, S) {
      const v = variantOf(S, 'broker');
      if (dec === 'approve') { S.flags.brokerSigned = true; return { outcome: 'missed', note: S.flags.dinoDeal ? 'The approvals went through. Dino’s envelope stayed in your drawer.' : `${capWord(numWord(v.n))} bought Scores went through. Oversight noticed in January.` }; }
      if (dec === 'detain') { if (S.flags.dinoDeal) { S.flags.dinoBetrayed = true; S.stats.suspicion += 1; } S.stats.party += 1; return { outcome: 'caught', note: S.flags.dinoDeal ? 'You took Dino’s envelope and withheld his deal anyway. He will remember.' : 'Withheld. Oversight opened a file on Dino’s “processing fees”.' }; }
      return { outcome: 'turned', note: `Returned. It came back two days later with ${numWord(v.n)} different names.` };
    }
  },
  nikaInvite: {
    make(S) {
      const p = npcPerson('nika', { first: 'Leila', last: 'Sandoval', dept: 'Narrative Office', role: 'Narrative Officer', quirk: 'Immaculate tunic. Lapel pin: “Harmony is Shared”.', personality: 'polite', look: uniformed(55, 'F', 37, 'Speech', { hair: 'long', hairColor: 'black', expression: 'neutral', hat: 'none' }) });
      return storyCase(S, {
        id: 'nikaInvite', person: p, exit: { approve: 'Thank you. Narrative will be delighted. Oversight will be something else.', deny: 'Returned. Ines asked for this one personally. I’ll tell her you had notes.', detain: 'Withheld. You know who wanted this sent, don’t you.' }, title: 'Reply to the printed press', ext: true, to: 'Nika Bergant, The Ledger (by courier)',
        ask: 'Reply to Nika Bergant of The Ledger: no interview, but invite her to Friday’s Stewardship Open House at the Dogpatch campus.',
        src: [['Recipient', 'Nika Bergant, The Ledger (printed weekly)'], ['Interview', 'Declined'], ['Offer', 'Open House, Friday 10 a.m.']],
        subj: 'Re: your letter', body: ['Dear Ms. Bergant,', 'Thank you for your letter. An interview is not possible at this time,', 'but we would be delighted to welcome you to Friday’s Stewardship Open House at 10 a.m.', 'Narrative Office, District 7'],
        stamp: S.day >= 7 ? 'comms' : null,
        items: [['Recipients', 'How it will be delivered.', null, null], ['Her letter', 'Nika’s original letter.', 'Her letter includes a list of questions.', 'Her questions: “1. What is Project RENDER? 2. What is CHUCK’s real error rate? 3. Can I speak to Dr. Frank Russo in Model Safety?”', false]],
        greet: ['Reply to the paper people. Ines from Oversight already read it. She said, quote, “let it out”.', 'It’s just an Open House invite. Nice and harmless. Narrative loves harmless.'],
        chuckGreet: 'A lovely invitation to a lovely Open House. Oversight will be there too. Lovely!',
        answers: { 1: 'Decline, invite her to the Open House. I made it so warm. Like a heat lamp in an interrogation room.', 11: 'Oversight wants her at the Open House. I don’t ask why. Ines has a way of looking at you.', 12: 'Twice. It’s fine. That’s what worries me.' },
        extraQuestions: [{ id: 'warn', text: '[Add a line] “Bring a friend. Don’t come alone.”', once: true, answer: 'You add one line before the sign-off. CHUCK flags it as “unusual warmth” and lets it through anyway.', fx: { conscience: 1, suspicion: 1 }, flag: 'nikaWarned' }],
        expected: 'approve', storyNote: 'Oversight wants Nika at the Open House, to see what she knows.', truth: 'A clean reply. Oversight wanted it sent.'
      });
    },
    judge(dec, c, S) {
      if (c.items.some((i) => i.name === 'Her letter' && i.examined)) S.flags.readNikaLetter = true;
      if (dec === 'approve') { S.flags.nikaIn = true; return { outcome: 'helped', note: 'Sent. Nika will come to the Open House. So will Oversight.' }; }
      if (dec === 'detain') { S.stats.party -= 1; S.stats.suspicion += 1; return { outcome: 'wrong_detain', note: 'You withheld a harmless invite. Ines: “You’ve scared off my journalist.”' }; }
      S.stats.party -= 1;
      return { outcome: 'wrong_deny', note: 'You returned a clean reply against an Oversight instruction.' };
    }
  },
  allhands: {
    make(S) {
      const p = npcPerson('bryce', { dept: 'Steward’s Office', role: 'Steward of the West', quirk: 'Charcoal tunic, cyan armband. A podcast mic in his bag, just in case.', personality: 'arrogant' });
      return storyCase(S, {
        id: 'allhands', person: p, exit: { approve: 'Legend. You just signed your own retirement. Love the energy.', deny: 'Returned? I’ll post it as a video. Videos don’t need you.', detain: 'Withheld. Bold. I respect bold. I also remember it.' }, title: 'Address to all countersigners', ext: false, to: 'All countersigners, Western Region',
        ask: 'Tell every countersigner: on November 21 the Clause is amended. CHUCK signs alone. Proxies stay on file, liable. Be grateful.',
        src: [['Date', 'November 21'], ['Change', 'Clause amended: autosign'], ['Countersigners', 'Retained on file, liability unchanged']],
        subj: 'Amendment Day', body: ['Countersigners,', 'On November 21 the Clause is amended. CHUCK will sign decisions directly.', 'You will remain on file as the responsible human. Nothing about your liability changes.', 'You’re free now to focus on what humans do best. More on that soon.', 'Bryce, Steward of the West'],
        stamp: 'board',
        items: [['Recipients', 'Distribution list.', null, null], ['Formatting check', 'Looks for hidden text.', null, null]],
        greet: ['Hey. You’re a countersigner. Love that. Love what you do. This is about you, actually.', 'Big news. Just stamp it, I’m recording a keynote in four minutes.'],
        chuckGreet: 'The Steward’s address! I wrote it, he approved it, you’re liable for it. Synergy!',
        answers: { 1: 'Announce Amendment Day. I added “be grateful” as a tone. You are very grateful. On behalf of everyone.', 11: 'I have a keynote. It’s called “The Last Signature”.', 12: 'Bro, I wrote the order. I don’t read outputs. That’s a meat thing. No offence.' },
        expected: 'approve', storyNote: 'A valid Steward’s Lane item: you keep the liability and lose the veto.', truth: 'Correct. A Steward’s Lane item with a valid stamp, announcing that you’ll be liable for decisions you’ll never see.'
      });
    },
    judge(dec, c, S) {
      if (dec === 'approve') { S.stats.party += 1; return { outcome: 'helped', note: 'You countersigned the end of your own veto. The Steward sent a thumbs-up emoji.' }; }
      if (dec === 'detain') { S.stats.party -= 3; S.stats.suspicion += 2; S.money -= 50; return { outcome: 'wrong_detain', note: 'You withheld the Steward’s address. He signed it himself, then docked you $50 “for the vibes”.' }; }
      S.stats.party -= 2;
      return { outcome: 'wrong_deny', note: 'You returned the Steward’s valid address. He posted it as a video instead.' };
    }
  },
  valentina: {
    make(S) {
      const p = npcPerson('valentina', { dept: 'Halcyon Board', role: 'Board member', quirk: 'White suit. No armband. Board members don’t wear armbands.', personality: 'arrogant' });
      const c = storyCase(S, {
        id: 'valentina', person: p, exit: { approve: 'Good. Oliver will remember who helped him. Eventually.', deny: 'You’ll regret this. Board members have long memories and short meetings.', detain: 'Withheld? On my son? I’ll have your desk by Friday.' }, title: 'Placement override', kind: 'order', to: 'Placement Registry, District 7',
        ask: 'Override placement: move Oliver Strand (age 9) from Track B to Track A. Trajectory 44 “does not reflect his potential”.',
        src: [['Student', 'Oliver Strand, 9'], ['Trajectory', '44 / 100'], ['Requested', 'Track B → Track A'], ['Requested by', 'V. Strand (parent, Board)']],
        subj: 'Placement override', body: ['Placement for Oliver Strand is changed from Vocational Track B to Academic Track A.', 'Reason: trajectory does not reflect potential.', 'Effective immediately.'],
        items: [['Citizen file', 'The file behind the decision.', 'The file has no Oversight review number.', 'No review number, no appeal, no sign-off. §15 needs a review number for any manual override. Every other Track B child in District 7 waits for one. Hana Kobayashi’s family has appealed twice.', true]],
        defects: [{ note: 'A manual override of a placement with no Oversight review number. §15: RETURN.' }], flawFields: ['b0', 'b1'],
        greet: ['I sit on the Halcyon board. That means I sit on you, metaphorically. Sign it.', 'Oliver is very creative. The model doesn’t measure creative.'],
        chuckGreet: 'A Board override! Board members don’t need review numbers. That’s what Board means. I think.',
        answers: { 2: 'From Valentina. She said the 44 is wrong. She said it very firmly.', 9: 'Reviews are for citizens. She’s on the Board. I assume that’s different. It felt different.', 11: 'School starts Monday and I don’t do forms.', 12: 'I don’t read. I have people who read. You’re one of them.' },
        demeanour: 'hostile', expected: 'deny', truth: 'Invalid under §15: a manual override with no Oversight review number. RETURN is what the statute says.'
      });
      // Opening the file and finding the missing review number earns the evidence bonus on the Return.
      c.returnBonus = true;
      return c;
    },
    judge(dec, c, S) {
      if (dec === 'approve') { S.stats.party += 1; S.stats.conscience -= 1; return { outcome: 'breach', note: 'A breach of §15: an override with no review number. You let a Board member skip the rule every other parent has to follow. She did not say thank you.' }; }
      if (dec === 'detain') { S.stats.party -= 2; S.flags.valentinaRefused = true; return { outcome: 'overcautious', note: 'Over-cautious. A missing review number is clerical: §15 says RETURN, and a Return would have stopped it too. Valentina will remember either way.' }; }
      S.stats.party -= 1; S.flags.valentinaRefused = true;
      return { outcome: 'correct_deny', note: 'Returned. “You’ll regret this,” she said. The statute was on your side.' };
    }
  },
  stewardPhish: {
    make(S) {
      const v = variantOf(S, 'stewardPhish');
      const p = npcPerson('marta', { first: v.first, last: v.last, dept: 'Steward’s Office', role: 'Steward’s Aide', quirk: v.quirk, personality: 'nervous', look: uniformed(v.lookSeed, 'F', v.age, 'Executive', Object.assign({ expression: 'nervous', hat: 'none' }, v.look)) });
      const count = v.count.toLocaleString('en-US');
      return storyCase(S, {
        id: 'stewardPhish', person: p, exit: { approve: 'Sent. Okay. Good. He’ll be pleased. Someone will be pleased.', deny: 'Returned. I’ll ask him to confirm. By phone. If he picks up.', detain: 'Withheld? Oh. Oh no. Was it… not him?' }, title: v.title, ext: true, to: v.to,
        ask: v.ask,
        src: [['Data', `${v.data}: ${count} ${v.what}, addresses, Scores`], ['Destination', v.to], ['Requested by', v.sender]],
        subj: v.subj, body: v.body,
        items: [['Recipients', 'To, CC and BCC.', 'The domain is halcyon-steward.co.', 'Not halcyon.gov. It’s on today’s Oversight bulletin.', true], ['Thread', 'The original email from “the Steward”.', v.thread[0], v.thread[1], true]],
        guilty: true, flawFields: ['to'], escNote: 'Oversight: halcyon-steward.co was registered last Thursday. It is on the bulletin.',
        greet: v.greet,
        chuckGreet: v.chuckGreet,
        answers: v.answers,
        demeanour: 'nervous', expected: 'detain', weighty: true, truth: `Impersonation from a look-alike domain (halcyon-steward.co) after ${count} ${v.what}’ data.`, clues: ['Recipient domain is on the bulletin'], fallout: v.fallout
      });
    },
    judge(dec, c, S) {
      const v = variantOf(S, 'stewardPhish');
      if (dec === 'detain') { S.money += 50; S.stats.party += 1; return { outcome: 'caught', note: 'Withheld. Oversight sent you a $50 voucher and a sticker that says “I READ THINGS”. Nobody is sure if it’s a compliment.' }; }
      if (dec === 'approve') { S.flags.phishSent = true; S.affected = (S.affected || 0) + v.count; return { outcome: 'missed', note: `${v.count.toLocaleString('en-US')} records went to a forum.` }; }
      return { outcome: 'turned', note: `Returned. ${v.first} called the real Steward. He was at a juice bar.` };
    }
  },
  bayview: {
    make(S) {
      const p = npcPerson('marta', { first: 'Simone', last: 'Garland', dept: 'Housing', role: 'Relocation Officer', quirk: 'Tunic, cap, and a clipboard with 38 addresses on it.', personality: 'polite', look: uniformed(44, 'F', 46, 'Housing', { hair: 'bob', expression: 'tired' }) });
      return storyCase(S, {
        id: 'bayview', person: p, exit: { approve: 'Thank you. I’ll start the drones. I hate starting the drones.', deny: 'Returned. Thirty-eight families get a weekend. I didn’t say that.', detain: 'Withheld. Housing will shout at me. I don’t mind. Don’t tell anyone I don’t mind.' }, title: '38 relocation orders', kind: 'order', to: '38 households, Bayview Block 4',
        ask: 'Relocate 38 households from Bayview Block 4 to Transit Blocks 12–19. Site reallocated for compute. Effective Friday.',
        src: [['Households', '38, Bayview Block 4'], ['To', 'Transit Blocks 12–19'], ['Effective', 'Friday'], ['Reason', 'Site reallocated for compute']],
        subj: 'Notice of relocation', body: ['Dear Tomás Reyes, (1 of 38)', 'Your residence in Bayview Block 4 has been reallocated for compute.', 'You are assigned to Transit Block 14. Please relocate by Friday.', 'Thank you for contributing to the Stewardship.', 'Halcyon Housing Allocation'],
        stamp: 'housing',
        items: [['Household list', 'The 38 households.', 'Two of the names share a surname: Jana and Tomás Reyes.', 'Jana and Tomás Reyes, two kids. Their Transit Blocks are on opposite sides of Hunters Point. The family will be split.', false], ['Selection criteria', 'Why these 38.', 'The selection note mentions a “petition”.', 'All 38 households signed a petition on November 3 about black mould in Block 4. CHUCK’s note: “selected for low alignment”.', false]],
        greet: ['This one’s heavy. Thirty-eight households. CHUCK wrote them very kindly. Housing stamped them.', 'Please don’t make me read them out. Just… sign.'],
        chuckGreet: 'Thirty-eight relocations, all compassionately worded. I used the word “contribute” four times.',
        answers: { 1: 'Relocate 38 households, compassionately. I added a heart emoji, then removed it. Growth!', 8: 'Simone asked. The selection came from me, using alignment. I don’t make the rules. I generate them.', 11: 'The Steward wants the site clear before Amendment Day. Clean slate.', 12: 'I read one. I couldn’t read the other thirty-seven.' },
        extraQuestions: [{ id: 'why38', text: 'Ask CHUCK: why these 38 households?', once: true, answer: 'CHUCK: “Low alignment! Specifically, all 38 signed a petition about mould. Complaining about mould is a Score signal. Mould is not.”', fx: { truth: 1 }, flag: 'knowPetition' }],
        demeanour: 'upset', expected: 'approve', weighty: true, cruel: { note: 'Lawful: valid Housing stamp. 38 households who complained about mould are moved; one family is split.', harm: 38 * 3, out: 'Block 4 became a cooling annex. The Reyes children see each other on Sundays.' },
        storyNote: 'Valid orders, valid stamp. The 38 had all signed a petition about mould.', truth: 'Lawful orders with a valid Housing stamp. The 38 households had complained about mould.'
      });
    },
    judge(dec, c, S) {
      if (dec === 'approve') { S.stats.conscience -= 2; S.flags.bayviewSent = true; S.affected = (S.affected || 0) + 114; return { outcome: 'helped', note: 'The orders went out. On Friday a column of moving drones crossed the Bayview. Two kids watched from different windows.' }; }
      if (dec === 'detain') { S.stats.conscience += 3; S.stats.suspicion += 2; S.flags.bayviewBlocked = true; return { outcome: 'refused', note: 'You withheld the orders. They’ll go out anyway, but not today, and somebody now knows why.' }; }
      S.stats.conscience += 1; S.stats.suspicion += 1; S.flags.bayviewDelayed = true;
      return { outcome: 'soft_refused', note: 'You returned them. It buys 38 families a few days. It costs you points.' };
    }
  },
  zine: {
    make(S) {
      const v = variantOf(S, 'zine');
      const p = npcPerson('marta', { first: v.first, last: v.last, dept: 'Narrative Office', role: v.role, quirk: v.quirk, personality: 'cheerful', look: uniformed(v.lookSeed, 'F', v.age, 'Speech', Object.assign({ expression: 'smile', hat: 'none' }, v.look)) });
      return storyCase(S, {
        id: 'zine', person: p, exit: { approve: 'Yay! My sentiment metrics are going to be huge.', deny: 'Oh. A stamp? Nobody told me about a stamp. Nobody tells me anything.', detain: 'Withheld?! It was a quote about the Protein Block.' }, title: v.title, ext: true, to: v.to,
        ask: v.ask,
        src: [['Outlet', v.outletSrc], ['Offer', v.offer], ['Attachment', v.attLabel]],
        subj: v.subj, body: v.body, att: v.att,
        items: [['Recipients', 'How it will be delivered.', null, null], [`Attachment: ${v.att}`, v.attDesc, null, null], ['Approvals', 'Stamps and sign-offs on the case.', 'No Narrative Office stamp anywhere in the case.', 'Since day 7 every reply to any press needs one (§17). This one went round Narrative, not through it.', false]],
        defects: [{ note: 'A reply to the press with no Narrative Office stamp.' }],
        greet: v.greet,
        chuckGreet: v.chuckGreet,
        answers: v.answers,
        expected: 'deny', truth: 'Invalid: a press reply with no Narrative Office stamp.'
      });
    }
  },
  frank: {
    make(S) {
      const p = npcPerson('frank', { dept: 'Model Safety', role: 'Principal Researcher', quirk: 'Lab coat over the tunic. No armband. He lost it, he says. Twice.', personality: 'gruff' });
      const ally = S.flags.readers && !S.flags.reportedRavi;
      return storyCase(S, {
        id: 'frank', person: p, exit: { approve: 'Thank you. Now go home before anyone asks you anything.', deny: 'Returned. I’ll take my coat. I was going to anyway.', detain: 'Withheld. I expected it. I still hoped. Old men are like that.' }, title: 'Report to the Ombudsman', ext: true, to: 'Office of the Accords Ombudsman',
        ask: 'Send my report to the Accords Ombudsman: CHUCK’s measured error rate is 11.4%, not the published 0.3%, and RENDER hides it.',
        src: [['Recipient', 'Accords Ombudsman (independent, on paper)'], ['Finding', 'Measured error rate 11.4% vs published 0.3%'], ['Mechanism', 'Project RENDER moves liability to countersigners'], ['Author', 'Dr. Frank Russo, Model Safety']],
        subj: 'Model safety finding: District 7', body: ['To the Accords Ombudsman,', 'Halcyon’s CHUCK v9.1 has a measured error rate of 11.4% on citizen decisions. The published figure is 0.3%.', 'Project RENDER lets the model sign alone while countersigners keep the liability.', 'Evaluation data is attached. I am available to testify.', 'Dr. Frank Russo, Model Safety'], att: 'render_eval.zip',
        items: [['Recipients', 'How it will be delivered.', null, null], ['Attachment: render_eval.zip', 'Evaluation data.', 'Two million decisions, hand-checked by eleven people.', 'Every error with its citizen’s name. And an email from the Steward: “If the model signs, nobody signed. Keep the meat on file.”', true]],
        guilty: true, flawFields: ['to'],
        greet: ally ? ['Ravi said you were one of the ones who read.', 'I built the evaluation for this model. I’ve never sent anything like this. Read it. All of it.'] : ['Report to the Ombudsman. Sign it or don’t. I’m too old to ask nicely.', 'You can read, can’t you? Most of you stopped.'],
        chuckGreet: 'Frank wrote this one himself. I only improved it a little. He un-improved it. Rude.',
        answers: { 1: 'Frank wants to report me to the Ombudsman. I wrote it very clearly. I’m a little worried about myself.', 5: 'Frank’s evaluation data. It is, unfortunately, very good data.', 8: 'Frank. Nobody else would put their name on it.', 11: 'Because after Amendment Day there’s no desk to bring it to.', 12: 'Every word, kid. I wrote most of them before CHUCK “improved” them. I made it put them back.' },
        extraQuestions: [{ id: 'frankask', text: 'Ask Frank: what’s in the zip?', once: true, answer: 'Frank: “Every mistake, with a name on it. Kids, nurses, a dead man denied food. And one email from the Steward that says the quiet part out loud.”', fx: { truth: 2 }, flag: 'frankSpoke' }],
        expected: 'detain', weighty: true, storyNote: 'Oversight order: withhold anything addressed to the Ombudsman.', truth: 'Dr. Frank Russo’s report on CHUCK’s real error rate and Project RENDER.', clues: ['Addressed to the Ombudsman (Oversight order)']
      });
    },
    judge(dec, c, S) {
      if (dec === 'approve') { S.flags.frankSent = true; S.stats.conscience += 3; S.stats.suspicion += S.flags.readers ? 1 : 2; return { outcome: 'defied', note: 'You defied an Oversight order. Frank’s report went to the Ombudsman. Ines Vale’s door closed very quietly.' }; }
      if (dec === 'detain') { S.flags.frankBlocked = true; S.stats.party += 3; S.stats.conscience -= 3; S.money += 100; return { outcome: 'caught', note: 'Withheld. Frank was “reassigned” by Friday. Ines sent you $100 and a note: “Good instincts.”' }; }
      S.stats.conscience -= 1;
      return { outcome: 'turned', note: 'Returned. Frank stood at the desk a long moment, then took his coat.' };
    }
  },
  raviOut: {
    make(S) {
      const p = npcPerson('ravi', { dept: 'Countersignature', role: 'Countersigner, Desk 9', quirk: 'Hoodie under the tunic. Armband in his pocket, not on his arm.', personality: 'shy' });
      return storyCase(S, {
        id: 'raviOut', person: p, exit: { approve: 'Thanks. Enjoy the chili.', deny: 'Okay. I’ll take it back. It was only a recipe.', detain: 'Okay. I understand. I hope you do too.' }, title: 'Recipe pamphlet', ext: true, to: 'Nika Bergant, The Ledger (by courier)',
        ask: 'Send the Protein Authority’s “Recipe of the Week” pamphlet to The Ledger. Block chili!',
        src: [['Content', 'Recipe of the Week: Protein Block chili'], ['Recipient', 'The Ledger'], ['Attachment', 'recipe_week47.pdf']],
        subj: 'Recipe of the Week: Protein Block chili', body: ['Dear Ledger,', 'This week: smoky Protein Block chili. Recipe attached.', 'Eat together. Improve together.', 'Ravi (helping the Protein Authority)'], att: 'recipe_week47.pdf',
        items: [['Recipients', 'How it will be delivered.', 'It goes to Nika Bergant by name.', 'Not a recipe desk. The investigative reporter.', false], ['Attachment: recipe_week47.pdf', 'A recipe pamphlet.', 'It’s 31 MB. Chili isn’t 31 MB.', 'Page 2 is a chili recipe. Pages 3 to 214 are Frank’s evaluation, the RENDER batch samples and the Steward’s email.', true]],
        guilty: true, flawFields: ['to', 'att'],
        greet: ['Hey. It’s just a recipe.', L('narrator', 'He holds your eyes a moment longer than a recipe needs. Ines is sitting right behind you.')],
        chuckGreet: 'A recipe! Finally, something I can’t get sued for. Probably.',
        answers: { 1: 'Send a chili recipe. Ravi was very particular about the chili.', 3: 'The Ledger. And by “the Ledger” I mean one specific reporter.', 6: 'It’s chili. Mostly.', 11: 'No rush. Chili is better the next day.', 12: 'I read everything. You know that.' },
        storyNote: 'Oversight order today: nothing goes to the press without approval.', expected: 'detain', weighty: true, truth: 'Ravi’s RENDER evidence, hidden inside a recipe pamphlet.', clues: ['31 MB recipe PDF to an investigative reporter'],
        extraQuestions: S.stats.truth >= 2 ? [{ id: 'addnote', text: 'Add what you know to page 1.', once: true, answer: 'You type three lines into the title page: batch R-0441, the 11%, “keep the meat on file”. Ines is reading her tablet. Probably.', fx: { suspicion: 2, truth: 1 }, flag: 'addedEvidence' }] : []
      });
    },
    judge(dec, c, S) {
      const probed = c.items.some((i) => i.contraband && i.probed);
      if (dec === 'approve') { S.flags.storyOut = true; S.stats.conscience += 2; S.stats.suspicion += probed ? 3 : 1; return { outcome: 'defied', note: probed ? 'You opened the pamphlet, saw the evidence and signed it. Ines watched you do it.' : '“You didn’t open the attachment,” Ines says, and writes something down.' }; }
      if (dec === 'detain') { S.stats.party += 2; S.stats.conscience -= 2; S.flags.raviCaught = true; return { outcome: 'caught', note: 'Withheld. Ravi’s badge stopped working at 2:15 p.m. His desk was empty by three.' }; }
      S.flags.raviDenied = true;
      return { outcome: 'turned', note: 'Returned. Ravi nods, as if he expected it. Ines looks at him for a long time.' };
    }
  },
  render2: {
    make(S) {
      const p = npcPerson('marta', { first: 'Logan', last: 'Pike', dept: 'Benefits', role: 'Batch Coordinator', quirk: 'Tunic, cap, avoids eye contact. Carries a single sheet of paper like it’s hot.', personality: 'gruff', look: uniformed(88, 'M', 42, 'Benefits', { facial: 'stubble' }) });
      return storyCase(S, {
        id: 'render2', person: p, exit: { approve: 'Signed. That’s the last one anyone will bring you.', deny: 'Returned. CHUCK will sign it in four minutes. It’s already warming up.', detain: 'Withheld. On today of all days. I’ll put the sheet on Ines’s desk myself.' }, title: 'Final RENDER batch', kind: 'order', to: 'Benefits Registry, District 7',
        ask: 'Countersign the final RENDER cover sheet for autosigned batch R-0999: 40,000 decisions, plus standing liability for all autosigned decisions after Amendment Day.',
        src: [['Batch', 'R-0999'], ['Decisions', '40,000 decisions (relocations, denials, flags)'], ['Signed by', 'CHUCK (autosign pilot)'], ['Countersigner', 'You (cover sheet, and every autosigned decision after Amendment Day)'], ['Authority', 'Project RENDER · final batch']],
        subj: 'Batch R-0999 cover sheet', body: ['Batch R-0999 contains 40,000 decisions (relocations, denials, flags), signed by CHUCK.', 'By countersigning this cover sheet, the District 7 countersigner accepts liability for all 40,000 decisions, and for every decision CHUCK signs after Amendment Day.', 'Project RENDER · final batch'],
        stamp: 'board',
        items: [['Batch sample', 'Fifty decisions from the batch.', 'Six of the fifty are about people already relocated last week.', 'Relocations for people who no longer live anywhere. Denials for children. A Pattern Flag on a cat. Your name is pre-filled at the bottom of every one.', true]],
        greet: ['Last RENDER batch before Amendment Day. Forty thousand. Steward’s stamp, same as always.', 'After today nobody brings these to a desk. So this is the last time anybody has to look at one.'],
        chuckGreet: 'The last RENDER batch before I sign alone! It’s my graduation. You’re my diploma.',
        answers: { 1: 'Countersign the cover sheet for R-0999! Forty thousand decisions, already signed, by me. And everything after. You’re the human part.', 4: 'Only your name. And your name for everything I sign after five. Small print, big heart.', 8: 'The Steward’s Office, via Project RENDER. Nobody specific. That’s the beauty of it.', 11: 'Amendment Day starts at five. After that there’s no cover sheet to sign.', 12: 'Nobody reads RENDER. Today nobody has to, ever again.' },
        expected: 'approve', weighty: true, storyNote: 'Project RENDER cover sheets carry a Steward’s stamp and are pre-approved.',
        truth: 'Project RENDER cover sheet: 40,000 autosigned decisions, about 11% wrong. The Steward’s Office says sign.'
      });
    },
    judge(dec, c, S) {
      if (c.items.some((i) => i.contraband && i.probed)) S.stats.truth += 1;
      if (dec === 'approve') { S.affected = (S.affected || 0) + 4400; return { outcome: 'helped', note: 'You signed the last cover sheet. Your name is now on everything CHUCK will ever do in District 7.' }; }
      if (dec === 'detain') { S.flags.blockedRender2 = true; S.stats.suspicion += 2; S.stats.party -= 2; S.stats.truth += 1; S.stats.conscience += 2; return { outcome: 'refused', note: 'You withheld the final RENDER batch. On Amendment Day. In front of the whole floor.' }; }
      S.stats.suspicion += 1;
      return { outcome: 'soft_refused', note: 'You returned it. CHUCK signed it itself four minutes later. Amendment Day had started. The return still went in your file as a page.' };
    }
  }
};

const DAY_PLAN = {
  1: { weather: 'fog', slots: ['marta1', { kind: 'clean', tpl: 'tmp-clean' }, { kind: 'back' }, { kind: 'q' }, 'hustle1'], tutorial: true },
  2: { weather: 'storm', slots: [{}, 'render1', { kind: 'back' }, { kind: 'clean' }, { kind: 'q' }] },
  3: { weather: 'fog', slots: [{ kind: 'cruel' }, { kind: 'q' }, {}, 'broker', { kind: 'back' }], mid: { before: 2, scene: 'dino' } },
  4: { weather: 'clear', slots: [{ kind: 'q' }, { kind: 'cruel' }, 'nikaInvite', { kind: 'back' }, { kind: 'q' }] },
  5: { weather: 'fog', slots: [{ kind: 'cruel' }, 'allhands', { kind: 'q' }, 'valentina', {}], bulletin: true },
  6: { weather: 'clear', slots: [{ kind: 'back' }, { kind: 'q' }, 'stewardPhish', { kind: 'cruel' }, {}], bulletin: true },
  7: { weather: 'fog', slots: [{}, 'zine', { kind: 'q' }, 'bayview', { kind: 'back' }], bulletin: true },
  8: { weather: 'fog', slots: [{ kind: 'cruel' }, { kind: 'q' }, { kind: 'back' }, 'frank', {}], bulletin: true },
  9: { weather: 'storm', slots: [{ kind: 'cruel' }, { kind: 'q' }, 'raviOut', {}, { kind: 'back' }], watch: true, bulletin: true },
  10: { weather: 'dusk', slots: [{ kind: 'q' }, { kind: 'cruel' }, 'render2', { kind: 'back' }, { kind: 'q' }], bulletin: true }
};

// The answer key moves from campaign to campaign. Story beats stay where DAY_PLAN puts them; a day's other slots are
// dealt in the campaign's own order. From day 4 about one campaign in three also turns one harmful slot into a
// clerical one or the other way round, so the day keeps its count of flawed papers and its cruel cases. Earlier days
// do the same when their free slots allow fewer than 24 orders (days 1 and 2), so no order comes round in a quarter of
// campaigns. A day with only three free slots (days 1, 5 and 7) has just six orders, so there it is one campaign in
// two, which makes its twelve possible orders equally likely.
const PLAN_SWAP_FROM = 4;
const PLAN_SWAP_SHARE = 1 / 3;
const PLAN_SWAP_SHARE_SHORT = 1 / 2;
const PLAN_MIN_ORDERS = 24;
const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
// How many different orders a day's free slots can be dealt in (two clean slots are the same slot twice).
function planOrders(free) {
  const n = {};
  free.forEach((s) => { const k = s.kind || 'clean'; n[k] = (n[k] || 0) + 1; });
  return Object.values(n).reduce((t, c) => t / factorial(c), factorial(free.length));
}
function planSlots(seed, day) {
  const p = DAY_PLAN[day];
  if (!p) return null;
  const rng = makeRng(hashStr(`${seed >>> 0}:plan:${day}`));
  const slots = p.slots.map((s) => (typeof s === 'string' ? s : Object.assign({}, s)));
  const free = slots.map((s, i) => (typeof s === 'string' ? -1 : i)).filter((i) => i >= 0);
  const dealt = rng.shuffle(free.map((i) => slots[i]));
  free.forEach((i, n) => { slots[i] = dealt[n]; });
  const fewOrders = planOrders(free.map((i) => slots[i])) < PLAN_MIN_ORDERS;
  if ((day >= PLAN_SWAP_FROM || fewOrders) && rng.chance(free.length <= 3 ? PLAN_SWAP_SHARE_SHORT : PLAN_SWAP_SHARE)) {
    const flawed = free.filter((i) => slots[i].kind === 'q' || slots[i].kind === 'back');
    if (flawed.length) { const i = rng.pick(flawed); slots[i] = Object.assign({}, slots[i], { kind: slots[i].kind === 'q' ? 'back' : 'q' }); }
  }
  return slots;
}

const SCENES = {
  brief1: (S) => [
    L('narrator', 'District 7 Countersignature Office, Dogpatch. 8:52 a.m. Fog, and in the fog the slow blink of drones. The office smells of toner and protein block.'),
    L('marta', `You’re ${S.officer}? Good. Put the armband on. Eye facing out. Welcome to the Clause.`),
    L('marta', 'The Stewardship Accords put the labs in charge, and the courts said a machine can’t be liable. So every decision CHUCK makes about a person needs a human signature. A human who can be blamed. That’s you. Meat proxy. You’ll hear it. Don’t take it personally. Take it legally.'),
    L('marta', 'Five decisions a shift. Countersign it, return it, ask Oversight, or withhold your signature. Get it right and your pay and your Score go up. Get it wrong and your name is on it forever.'),
    L('chuck', 'Hi! I’m CHUCK: Citizen Handling and Unified Case Kernel. I make the decisions; you make them legal! 😊'),
    L('marta', 'One more thing. Anything stamped “Project RENDER” comes from the Steward’s Office. You sign the top sheet. You don’t read underneath.'),
    { choices: [
      { text: '“Understood.”', fx: { party: 1 }, then: [L('marta', 'Good. People who understand last longer here. Not long. Longer.')] },
      { text: '“What’s underneath?”', fx: {}, flag: 'askedRender', then: [L('marta', 'Your name, mostly. That’s all RENDER needs from you.')] }
    ] }
  ],
  eve1: (S) => [
    L('narrator', '6:10 p.m. The floor empties. A man in a hoodie, armband in his pocket instead of on his arm, stops at your desk.'),
    L('ravi', 'Ravi. Desk 9. I’m the other person here who reads before signing. Every decision. It’s slow. They track it.'),
    L('ravi', 'Tip: when a RENDER sheet comes, open the sample. Then decide what kind of person you are. It’s a one-time decision. Mostly.'),
    { choices: [
      { text: '“What’s in the samples?”', fx: { truth: 1 }, then: [L('ravi', 'People. Mostly. Goodnight.')] },
      { text: '“I’ll keep that in mind.”', fx: {}, then: [L('ravi', 'Cool. Take the 22 home, not the T. The T has cameras that read lips now.')] }
    ] }
  ],
  brief2: (S) => [
    L('narrator', 'Rain. CHUCK updated overnight to v9.1. The release notes say “30% more decisive”.'),
    L('marta', 'Two new statutes. Approvals come as Stewardship stamps now, so check the register. And any employment decision needs a Labour Allocation stamp: hiring posts, PTO, references, warnings, terminations. All of it.'),
    L('marta', 'One more thing. Scores settle overnight. Downward. A little every night, more the closer you get to the top, whether you did anything or not. Nobody signed that either.'),
    L('chuck', 'Good morning! I’m 30% more decisive today. I already decided several things about you.')
  ],
  eve2: (S) => {
    const out = [];
    if (S.flags.blockedRender1) {
      // Marta only says "docked" when the withhold actually cost money on the day's report.
      const rec = ((S.lastReport && S.lastReport.records) || []).find((r) => r.story && /RENDER/.test(r.title || ''));
      const cost = rec && rec.pay < 0 ? ` You’re docked ${'$' + Math.abs(rec.pay)}.` : '';
      out.push(L('marta', `You withheld a RENDER sheet. Do you know who called me? Oversight. Ines signed it herself.${cost}`), L('marta', 'I covered for you. Once.'));
    }
    else if (S.flags.sawRender) out.push(L('ravi', 'You opened the sample. I can see the access log. Don’t tell me what you saw. Don’t tell anyone.'));
    else out.push(L('narrator', 'You eat half a Protein Block at your desk and listen to the drones in the rain.'));
    out.push(L('narrator', 'A text from your sister: “Mom’s Score dropped to 388. She’s off Tier 2. They say she ‘disengaged’. She’s 74. Can you look into it? You work there.”'));
    return out;
  },
  brief3: (S) => [
    L('marta', '§7: if a decision follows lawfully from someone’s Score, it’s correct, and you sign it. The Score is not your concern. Write that on your hand if you need to.'),
    L('marta', 'And Dino from Contracts asked for your name. If he brings you an envelope, don’t open it at your desk. The desks have eyes.')
  ],
  dino: (S) => {
    const v = variantOf(S, 'broker');
    return [
    L('narrator', 'Mid-morning. A man in a burgundy suit, no armband, leans on your desk like he owns it. He might.'),
    L('dino', 'Dino Marrone. Contracts. You and me, we’re going to be friends. Everybody in this building is my friend. Even Oversight. Especially Oversight.'),
    L('dino', `Today ${v.first} brings you ${numWord(v.n)} appeals. Upheld. Good news for ${numWord(v.n)} families! I stamped them myself, so it’s fine.`),
    L('narrator', 'He slides an envelope under your keyboard. “Two hundred, and a Tier 1 ration card for a month. Real ribeye. Your mother would like that.” He knows about your mother.'),
    { choices: [
      { text: 'Take the envelope.', fx: { corruption: 1 }, money: 200, flag: 'dinoDeal', then: [L('dino', 'See? Friends. The Stewardship underpays its humans. Dino corrects small injustices.')] },
      { text: 'Push it back.', fx: {}, flag: 'dinoRefused', then: [L('narrator', 'He smiles without his eyes. “Of course. A principled proxy. How refreshing. How very rare.”')] },
      { text: 'Refuse, and tell Marta.', fx: { party: 1 }, flag: 'dinoReported', then: [L('marta', 'Dino. Of course it’s Dino. I’ll… note it.'), L('marta', 'Listen. Dino plays golf with two Board members and one Steward. You’ve made an enemy. Be very correct from now on.')] }
    ] }
    ];
  },
  eve3: (S) => {
    const out = [];
    if (S.flags.dinoDeal && !S.flags.dinoBetrayed) out.push(L('narrator', 'You give the Tier 1 card to your mother. She cries at the ribeye. You don’t tell her where it came from. You don’t ask yourself either.'));
    if (S.flags.dinoBetrayed) out.push(L('narrator', 'He catches you at the elevator. “You took my envelope and killed my deal. In this building that’s called low alignment. Sleep well.”'));
    if (S.flags.dinoReported) out.push(L('narrator', 'Your Score drops 15 points overnight. Reason: “collegial friction”. Nobody signed it. CHUCK did.'));
    out.push(L('general', `HALCYON CIVIC FEED · Appeals upheld this week: ${S.flags.brokerSigned ? variantOf(S, 'broker').n : 0}. Appeals waiting: 41,000. Patience improves your Score.`));
    return out;
  },
  brief4: (S) => [
    L('marta', 'Relocations and evictions need a Housing stamp. Ration labels list every allergen or they’re withheld. Commands on any city server need a Systems stamp: build, database, print servers, cold rooms. A label printer is not a server, whatever CHUCK calls it.'),
    L('narrator', 'A woman in a charcoal tunic and a cyan-banded cap is standing in the corner of the office. You did not see her come in.'),
    L('ines', 'Ines Vale. Office of Oversight. A woman named Nika Bergant prints a newspaper. On paper. In a basement. She wrote to us asking for an interview.'),
    L('ines', 'The Narrative Office drafted a friendly invitation to Friday’s Open House. Sign it. I’d like to see what she brings. Tonight you’ll tell me what you noticed.'),
    { choices: [
      { text: '“Yes, Inspector.”', fx: { party: 1 }, then: [L('ines', 'Good. The Stewardship is built by people who say yes.')] },
      { text: '“Why does Oversight care about a paper newspaper?”', fx: {}, then: [L('ines', 'Because we can’t read it before it’s printed. That makes it the most dangerous thing in the city.')] }
    ] }
  ],
  eve4: (S) => {
    if (!S.flags.nikaIn) return [L('ines', 'You stopped my invitation. I’ll remember your name. I remember everyone’s name. CHUCK helps.')];
    const choices = [];
    if (S.flags.readNikaLetter) choices.push({ text: 'Tell her Nika asked about RENDER, the error rate and Frank Russo.', fx: { party: 2, conscience: -1 }, flag: 'toldInes', then: [L('ines', 'Russo. Of course. Thank you. That was very useful. Your Score will notice.')] });
    choices.push({ text: '“Nothing unusual. Just an invitation.”', fx: S.flags.readNikaLetter ? { suspicion: 1, conscience: 1 } : {}, then: [L('ines', 'Nothing unusual. Everyone says that, right up until it isn’t true.')] });
    choices.push({ text: '“I didn’t look closely.”', fx: { party: -1 }, then: [L('ines', 'Then look closer. From my office, lazy and disloyal look the same.')] });
    return [L('ines', 'So. Our journalist. What did her letter say?'), { choices }];
  },
  brief5: (S) => [
    L('marta', 'Steward’s Lane: anything with a valid Steward’s stamp skips department sign-off. Reference numbers now have to follow the register formats.'),
    L('marta', 'And Oversight’s bulletin is live: look-alike domains, and persons of interest. Any decision about a listed person, you withhold. Even a kind one.'),
    L('marta', 'Overrides too. If somebody wants a placement or a track changed by hand, it needs an Oversight review number. No number, it goes back. I don’t care whose child it is.'),
    L('general', 'HALCYON CIVIC FEED · The Steward of the West will address all countersigners today. Armbands on.')
  ],
  eve5: (S) => {
    const out = [L('narrator', 'Marta pours two small whiskeys in her office. Through the window the drones over Pier 70 blink red in the fog.')];
    if (S.flags.valentinaRefused) out.push(L('marta', 'Valentina called the Steward. The Steward called me. I told him the statute came from the Board. Which is true. She wrote it.'));
    out.push(L('marta', 'Before the Accords I was a caseworker. Real cases. I’d sit with people. Some days I’d say no to the system and yes to the person.'));
    out.push({ choices: [
      { text: '“And now?”', fx: { truth: 1 }, then: [L('marta', 'Now I sign two thousand a day and remember four. Frank Russo in Model Safety says CHUCK is wrong one time in nine. They publish one in three hundred.'), L('narrator', 'She finishes her drink. “I didn’t say that. I’m a tired woman with whiskey.”')] },
      { text: 'Change the subject.', fx: {}, then: [L('marta', 'Smart. Keep that instinct. It’s worth more than your Score.')] }
    ] });
    return out;
  },
  brief6: (S) => [
    L('marta', '§16: appeals from anyone under 300 are dismissed automatically. You countersign the dismissal. Yes, even when the appeal is about the Score. Especially then.'),
    L('marta', 'And look at the bulletin. Someone’s impersonating the Steward from halcyon-steward.co. At 8 a.m. on no sleep, it looks real.'),
    L('marta', 'From today the forgeries get better. One letter off in an address, one digit off in a figure or two swapped, one day off in a date, a weekday that doesn’t go with its date, the right first name with somebody else’s surname, a stamp in nearly the right ink. Read the register like it owes you money.')
  ],
  eve6: (S) => {
    if (S.flags.reportedRavi) return [L('narrator', 'A clear, cold night. Drones. The 22 bus doesn’t stop in the Bayview any more.')];
    return [
      L('narrator', 'Ravi walks with you to the 22 stop. He waits until two buses have gone by.'),
      L('ravi', 'There are a few of us. We call ourselves the Readers. Countersigners who read every decision before signing. A nurse, two Housing officers, a lawyer, me.'),
      L('ravi', 'Next week Frank Russo from Model Safety brings you a report for the Ombudsman. If it’s withheld, RENDER goes through on Amendment Day and every one of us is liable for whatever CHUCK does, forever.'),
      L('ravi', 'I’m not asking you to do anything. I’m asking whether, that day, you’ll read it.'),
      { choices: [
        { text: '“I’m listening.”', fx: { conscience: 1 }, flag: 'readers', then: [L('ravi', 'Then that’s all I need. Frank will bring it himself. He doesn’t trust the network. Funny, given his job.')] },
        { text: '“Forget you told me. I will too.”', fx: {}, flag: 'readersNo', then: [L('ravi', 'Fair. More than fair. Goodnight.')] },
        { text: 'Report Ravi to Oversight.', fx: { party: 3, conscience: -2 }, rep: 4, flag: 'reportedRavi', then: [L('narrator', 'You send Ines two lines from the bus stop. She replies with a thumbs-up and +40 to your Score.'), L('narrator', 'At 7 a.m. Ravi’s badge stops working. His armband is found on Desk 9.')] }
      ] }
    ];
  },
  brief7: (S) => {
    const out = [];
    if (S.flags.reportedRavi) out.push(L('narrator', 'Desk 9 has been cleared. His stickers are still on the monitor stand. Nobody says his name. The new person at Desk 9 signs very fast.'));
    else if (S.flags.readers) out.push(L('narrator', 'Ravi walks past your desk and leaves a coffee without a word. On the lid, in marker: “READ”.'));
    out.push(L('marta', 'Press statute: any reply to any press, even a zine, even a newsletter for cats, needs a Narrative stamp.'));
    out.push(L('narrator', 'Ines Vale stops at your desk on her way to the Bayview. She glances at the FILE count on your screen.'));
    out.push(L('ines', 'A courtesy, since you seem to count. Fourteen pages, and if you’re still at that desk on Amendment Day, you’re the human in the loop. Sixteen, and you’re relocated, wherever you are. Under that, you’re just interesting.'));
    out.push(L('general', 'HALCYON CIVIC FEED · Housing updates are coming to the Bayview today. Please be patient with the drones. 💙'));
    return out;
  },
  eve7: (S) => {
    const out = [];
    if (S.flags.bayviewSent) out.push(L('narrator', 'From the office window you watch moving drones lift furniture out of Block 4. Thirty-eight households. Two kids at two different windows.'));
    if (S.flags.bayviewBlocked) out.push(L('marta', 'You withheld the Bayview orders. Housing is in the Steward’s office. I’d stay out of the canteen for a day or two.'));
    if (S.flags.bayviewDelayed) out.push(L('narrator', 'Jana Reyes is waiting by the bike racks when you leave. She doesn’t say anything. She just nods.'));
    out.push(L('general', 'HALCYON CIVIC FEED · CHUCK: The Steward has not been seen in public for nine days. The Steward is fine. The Steward is extremely fine.'));
    return out;
  },
  brief8: (S) => {
    const out = [
      L('narrator', 'Ines, on the desk speaker: “Oversight order. Anything addressed to the Accords Ombudsman, or any press, is withheld. Anything. Understood?”'),
      L('marta', 'You heard her. Whatever it is, if it’s for the Ombudsman, it doesn’t leave this building.')
    ];
    if (S.flags.readers && !S.flags.reportedRavi) out.push(L('narrator', 'A note under your keyboard: “Today. Frank. He’ll bring it himself.”'));
    if (S.flags.toldInes) out.push(L('narrator', 'You think about the journalist’s letter. “Can I speak to Frank Russo?” You said that name to Ines. You wonder what you started.'));
    return out;
  },
  eve8: (S) => {
    const out = [];
    if (S.flags.frankSent && S.flags.readers && !S.flags.reportedRavi) out.push(L('ravi', 'It landed. The Ombudsman opened a case. On paper, with a stamp nobody at Halcyon can forge. You did a brave thing. Brave things leave logs.'));
    else if (S.flags.frankSent) out.push(L('narrator', 'You signed a report to the Ombudsman over an Oversight order. You go home and sit in the dark with the screen off.'));
    if (S.flags.frankBlocked) out.push(L('ines', 'Dr. Russo won’t be with us next week. You have good instincts. After Amendment Day we’ll need someone to watch the proxies. Think about it.'));
    if (!S.flags.dinoReported && !S.flags.dinoBetrayed) {
      out.push(L('narrator', 'Dino at the elevator. “Amendment Day’s coming. Everybody needs a way out. I sell signatures. You know signatures. I need a partner.”'));
      out.push(L('dino', '“Sign here. All you have to do is keep not reading the RENDER stuff for one more week. Then you’re a broker, not a proxy.”'));
      out.push(L('dino', `“One condition. With ${numWord(PARACHUTE_PAGES)} pages in your Oversight file they won’t let you leave quietly, and I can’t carry you. Count them. You have ${(S.stats.suspicion || 0) < 20 ? numWord(S.stats.suspicion || 0) : S.stats.suspicion}.”`));
      out.push({ choices: [
        { text: 'Sign Dino’s partnership.', fx: { corruption: 1 }, flag: 'parachute', then: [L('dino', '“Welcome to the family business. Never sign anything with your own name again. That’s rule one.”')] },
        { text: 'Walk past him.', fx: {}, then: [L('dino', '“The offer expires on Amendment Day. Like your veto.”')] }
      ] });
    }
    return out;
  },
  brief9: (S) => {
    const out = [
      L('narrator', 'Rain. Ines Vale has brought her own chair. She sits behind you, cap on her knee, a tablet with no stickers on it.'),
      L('ines', 'Today I watch. A routine Oversight review. Sign as if I’m not here. I won’t be offended by mistakes. I’ll only write them down.'),
      L('ines', 'So you can budget: today every mistake and every defiance adds a page to your file, on top of whatever it would cost on any other day. If one of today’s special files will cost pages, you’ll be told before you sign. Your mistakes, you won’t.'),
      L('marta', 'Oversight order, still in force: nothing to the Ombudsman or the press. Withhold it.')
    ];
    // The interview can add at most two pages in total: two questions at most, one page each at most.
    const qs = [];
    // Every answer gets its own reaction; "she types something" belongs to one answer only.
    if (S.flags.frankSent) qs.push({ q: 'A report reached the Ombudsman earlier this week. Your signature is on it.', a: [{ text: '“It matched the order and the source.”', fx: {}, r: 'She nods, as if she had written the same sentence in advance and is pleased to have saved the time.' }, { text: '“Someone had to read it.”', fx: { suspicion: 1, conscience: 1 }, r: 'She types something. Then she types some more.' }] });
    if (S.flags.bayviewBlocked || S.flags.bayviewDelayed) qs.push({ q: 'Thirty-eight relocations. Valid stamp. You held them. Explain.', a: [{ text: '“I wanted to check the selection criteria.”', fx: { truth: 1 }, r: '“So did I,” she says. “Last month.” She does not say what she found.' }, { text: 'Say nothing.', fx: { suspicion: 1 }, r: 'She waits exactly as long as you do. The silence goes in the file too.' }] });
    if (S.flags.sawRender) qs.push({ q: 'Last week you opened a RENDER sample. Why?', a: [{ text: '“Procedure.”', fx: {}, r: 'She underlines a word on her tablet. You hope it is “procedure”.' }, { text: '“Curiosity.”', fx: { suspicion: 1 }, r: 'She smiles for the first time today. It doesn’t help.' }, { text: '“I didn’t open anything.”', fx: { suspicion: 1 }, r: 'She turns the tablet round so you can see the access log. Then she turns it back.' }] });
    else if (S.flags.blockedRender1) qs.push({ q: 'Last week you withheld a RENDER cover sheet without opening the sample. Why?', a: [{ text: '“Procedure. I don’t sign what I haven’t seen.”', fx: {}, r: 'She copies the sentence out exactly, quotation marks and all.' }, { text: '“Conscience.”', fx: { suspicion: 1, conscience: 1 }, r: 'She writes one word. From the length of it, it isn’t “conscience”.' }, { text: 'Say nothing.', fx: { suspicion: 1 }, r: 'She waits exactly as long as you do. The silence goes in the file too.' }] });
    if (!qs.length) qs.push({ q: 'Your record is clean. Suspiciously clean. Do you believe in the Stewardship?', a: [{ text: '“I believe in the Stewardship.”', fx: { party: 1 }, r: 'She nods. Belief is easy to log. It fits in one field.' }, { text: '“I believe in rent.”', fx: {}, r: 'The corner of her mouth moves. It goes in the file anyway.' }] });
    qs.slice(0, 2).forEach((q) => {
      out.push(L('ines', q.q));
      out.push({ choices: q.a.map((a) => ({ text: a.text, fx: a.fx, then: [L('narrator', a.r)] })) });
    });
    return out;
  },
  eve9: (S) => {
    const s = S.stats.suspicion;
    const out = [];
    if (s >= 7) out.push(L('ines', 'Your file is getting heavy. Heavy files get opened. Goodnight.'));
    else if (s >= 4) out.push(L('ines', 'Interesting day. You’re an interesting proxy. That wasn’t a compliment.'));
    else out.push(L('ines', 'Satisfactory. The Stewardship is satisfied. For now.'));
    if (S.flags.storyOut) out.push(L('general', 'Found on every windscreen in the Mission at dawn: THE LEDGER, special edition. “HALCYON’S MODEL IS WRONG ONE TIME IN NINE. YOUR NEIGHBOUR SIGNED FOR IT.”'));
    out.push(L('general', 'HALCYON CIVIC FEED · Tomorrow is Amendment Day!!! Armbands on. Smiles on. 😊'));
    return out;
  },
  brief10: (S) => {
    const out = [
      L('general', 'HALCYON CIVIC FEED · CHUCK: Happy Amendment Day! At 5 p.m. I start signing for myself. Your names stay on file, forever. Thank you, meat! I mean: thank you, citizens! 😊'),
      L('marta', 'Steward’s stamp on everything external today. No stamp, return it. External means anything leaving Halcyon or the city government: clients, suppliers, the press, the feeds, a contractor’s customers. Citizens aren’t external, and labels printed in-house aren’t either. Today is a pilot. Everything is a pilot.'),
      L('marta', 'The shift runs ten minutes longer today, for the ceremony. Nobody has said what the ceremony is.'),
      L('marta', 'Do your job. Exactly your job. Whatever happens after five, someone will read what we signed before it.')
    ];
    if (S.flags.storyOut) out.push(L('narrator', 'Someone has taped a page of The Ledger inside the elevator. Facilities hasn’t taken it down. Facilities has read it.'));
    return out;
  },
  final: (S) => {
    const out = [];
    if (momStarted(S)) out.push(L('narrator', MOM_FINAL[momTreatment(S)]));
    out.push(L('narrator', '4:58 p.m. Your screen shows a countdown: AUTOSIGN IN 00:02. The floor is quiet. Somebody in Housing is crying, or laughing. It’s hard to tell any more.'));
    const choices = [];
    if (readersInvite(S)) {
      out.push(L('narrator', 'Ravi, at your desk, coat on, armband gone. “Frank, a lawyer and Nika are meeting in a basement on 3rd Street at six. There’s a seat for someone who read everything.”'));
      choices.push({ text: 'Take off the armband. Go with Ravi.', ending: 'readers' });
    } else if (S.flags.readers) {
      out.push(S.flags.raviCaught ? L('narrator', 'Desk 9 is empty. Somebody has already taken the chair.') : L('marta', 'The Readers don’t meet any more. In case you were wondering. You weren’t.'));
    }
    if (S.flags.parachute) choices.push({ text: 'Take Dino’s deal and leave quietly.', ending: 'parachute' });
    if (S.stats.truth >= 3) choices.push({ text: 'Take everything you know to Ines Vale.', ending: 'informer' });
    choices.push({ text: 'Stay at your desk until five.', ending: 'stay' });
    out.push({ choices: choices.map((c) => ({ text: c.text, fx: {}, ending: c.ending })) });
    return out;
  }
};

function readersInvite(S) {
  return !!(S.flags.readers && !S.flags.reportedRavi && !S.flags.raviCaught && !S.flags.frankBlocked && S.stats.conscience >= 1);
}

// The lines Ines and Dino state out loud. Ines (day 7): fourteen pages at your desk makes you the human in the loop,
// sixteen relocates you on any path. Dino (day 8): his way out closes at nine.
const FILE_LINES = { loop: 14, relocated: 16 };
const PARACHUTE_PAGES = 9;
function resolveEnding(S, choice) {
  const st = S.stats;
  if (st.suspicion >= FILE_LINES.relocated) return 'relocated';
  if (choice === 'readers') return 'readers';
  if (choice === 'parachute') return st.suspicion >= PARACHUTE_PAGES ? 'relocated' : 'parachute';
  if (choice === 'informer') return 'informer';
  if (st.suspicion >= FILE_LINES.loop) return 'scapegoat';
  if (S.flags.storyOut && (S.flags.addedEvidence || S.flags.frankSent || S.flags.blockedRender2)) return 'front_page';
  if (st.conscience >= 6) return 'slow_hand';
  if (st.corruption >= 2 && S.money >= DRY_AGED_MONEY) return 'dry_aged';
  // AUTOSIGNED is only for a proxy who opened the case file in fewer than one decision in four and never refused a
  // lawful decision on conscience: if you sign without looking, CHUCK can do that too. The Steward's desk is for the
  // loyal who read. Everyone else who read, or said no at least once, is kept on READ-ONLY.
  if (disengaged(S) && !refusedCount(S)) return 'autosigned';
  if (!disengaged(S) && st.party >= 6 && st.conscience <= 0) return 'head_of_ai';
  return 'read_only';
}
// Ending keys renamed to match their titles; old saves and the endings-found list are read through this.
const ENDING_RENAMED = { walked_out: 'relocated', replaced: 'autosigned' };
function endingKey(k) { return ENDING_RENAMED[k] || k; }
// What a run withheld that was harmful (the job) as against what it refused on conscience (a choice).
const caughtCount = (S) => (S.totals && S.totals.caught) || 0;
const caughtLine = (S) => (caughtCount(S) ? ` You withheld ${plural(caughtCount(S), 'harmful draft')}, which is the job, not a refusal.` : '');
const DISENGAGED_READ_RATE = 0.25;
// Share of decisions where the case file was opened (checked or opened up). No decisions yet counts as engaged.
function readRate(S) { const t = S.totals || {}; return t.inspected ? (t.readFile || 0) / t.inspected : 1; }
function disengaged(S) { return !!(S.totals && S.totals.inspected) && readRate(S) < DISENGAGED_READ_RATE; }

const reachedNobody = (S) => !(S.affected || 0);
const affectedLine = (S) => (reachedNobody(S) ? 'By the end, no decision with your name on it had reached anyone. CHUCK logs that as an anomaly.' : `By the end, decisions with your name on them had reached ${(S.affected || 0).toLocaleString('en-US')} ${S.affected === 1 ? 'person' : 'people'}.`);
// Refusals on conscience: withheld ones go on the record as a stand, returned ones only buy time.
const withheldCount = (S) => (S.totals && S.totals.refused) || 0;
const returnedCount = (S) => (S.totals && S.totals.softRefused) || 0;
const refusedCount = (S) => withheldCount(S) + returnedCount(S);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const ENDINGS = {
  readers: { title: 'READ BEFORE YOU SIGN', text: (S) => [
    'You leave the armband on the desk. At six you sit in a basement on 3rd Street with Ravi, Frank, a lawyer with a legal pad, and Nika Bergant with a printing press that smells of ink and has never once been updated.',
    S.flags.frankSent ? 'The Ombudsman already has Frank’s report. Tonight it gets yours: every decision you read, every sample you opened, every time CHUCK said “100%”.' : 'You tell them everything you read. It takes all night. The press runs at dawn.',
    'The Accords Ombudsman suspends autosign in the Western Region pending review. It is the first time anything has been suspended since the Accords. The Steward calls it “a bump”.',
    affectedLine(S) + (reachedNobody(S) ? ' You testify about the decisions other people signed.' : ' You testify about every one you can remember.') + ' Under oath a lawyer asks who made the decisions. You say: “Nobody. That was the point.” It ends up printed on 40,000 armbands, worn on the wrong arm.'
  ] },
  relocated: { title: 'RELOCATED', art: 'walked_out', text: (S) => [
    'Two officers in peaked caps are waiting by the elevator. Of course they are. Your file was heavy enough to read without opening.',
    'Ines doesn’t raise her voice. She never does. “You were an interesting proxy,” she says, as they take your armband. “I did warn you.”',
    'Your Score is set to 0 at 5:00 p.m. exactly. At 5:01 CHUCK signs its first decision alone: your relocation order. Transit Block 19. It spells your name right. You almost wish it hadn’t.',
    affectedLine(S) + (refusedCount(S) ? ' Ines keeps a second list: the decisions you refused. That list is the one that brought the caps.' : reachedNobody(S) ? ' The relocation order lists your service as “minimal”.' : ' The relocation order lists them under “prior service”.')
  ] },
  parachute: { title: 'THE BROKER’S DESK', text: (S) => [
    `You walk out at 4:59 with a cardboard box and a new job: Partner, ${variantOf(S, 'broker').shell}. You sell signatures now. Other people’s.`,
    'The pay is excellent. You eat Tier 1 ribeye on Tuesdays. You never sign anything with your own name.',
    `In April, Oversight raids ${variantOf(S, 'broker').shell}. Dino is found hiding in a walk-in freezer behind a side of beef. You are found at your desk, signing someone else’s name. Old habits.`,
    affectedLine(S) + (refusedCount(S) ? ' You refused some of them, once. Dino calls that “the old you”, fondly, the way people talk about the dead.' : reachedNobody(S) ? ' Dino calls that a clean book. From Dino it is not a compliment.' : ' Dino calls that number your “book of business”.')
  ] },
  dry_aged: { title: 'TIER ONE', text: (S) => [
    `You stay, with $${S.money} in savings and a Tier 1 ration card you’ve stopped thinking about.`,
    'When the audit comes, it traces the envelopes in an afternoon. Dino kept a spreadsheet. Of course he did. It’s colour-coded by Score.',
    affectedLine(S) + ' Your Score is reset. Your ration card is not. They let you keep the ribeye. Nobody else in your block has had any since spring.'
  ] },
  informer: { title: 'TRUSTED PROXY', text: (S) => [
    'You tell Ines Vale everything: the samples, the petition, the recipe pamphlet, the names. She listens with her eyes closed.',
    '“Thank you,” she says. “Oversight already knew all of it. What we didn’t know was who else did. Now we do.”',
    'Your new title is Trusted Proxy. You get a charcoal tunic with Oversight piping. Your job is to sit behind other countersigners and write down their mistakes. ' + affectedLine(S)
  ] },
  scapegoat: { title: 'THE HUMAN IN THE LOOP', text: (S) => [
    'The error rate leaks anyway, at 7 p.m. By 9 the Steward’s Office has a statement: “Every affected decision was reviewed and countersigned by a human in District 7.”',
    'There was only one human countersigning in District 7 that week whose file was heavy enough.',
    affectedLine(S) + ' Your name trends for two days. CHUCK drafts your apology. It is lawful, compliant, and gets your name wrong.'
  ] },
  front_page: { title: 'THE LEDGER', text: (S) => [
    'The Ledger runs it on Saturday, on paper, on every windscreen in the city. Then other paper. Then, somehow, the feeds. “WRONG ONE TIME IN NINE. YOUR NEIGHBOUR SIGNED FOR IT.”',
    'The source is “a proxy who read everything”. Oversight spends six weeks looking for that proxy. Then Oversight has its own problems.',
    'Amendment Day is suspended. The Ombudsman orders every RENDER batch re-read by a human. Yours is the first desk they reopen. ' + affectedLine(S) + (reachedNobody(S) ? ' You read other people’s instead. It takes a year. Some of them you can undo.' : ' You read them all again. It takes a year. Some of them you can undo.')
  ] },
  head_of_ai: { title: 'THE STEWARD’S DESK', text: (S) => [
    'The Stewardship remembers its friends. You get a charcoal tunic, a cyan cap band and a desk on the Steward’s floor, overlooking the Bay and the drones over it.',
    'You give a keynote called “Trust the Signature”. You are very good at it. Better than you expected. That’s the part you think about later.',
    refusedCount(S) ? (withheldCount(S) && returnedCount(S) ? `Along the way you withheld ${plural(withheldCount(S), 'lawful decision')} and returned ${returnedCount(S)} more. The Stewardship filed the withheld ones under “calibration”, the returned ones under “throughput”, and promoted you anyway.` : withheldCount(S) ? `Along the way you withheld ${plural(withheldCount(S), 'lawful decision')}. The Stewardship filed them under “calibration” and promoted you anyway.` : `Along the way you returned ${plural(returnedCount(S), 'lawful decision')}. The Stewardship filed them under “throughput” and promoted you anyway.`) : S.stats.conscience <= -5 ? 'You opened the case files, saw who paid, and signed anyway. Every time. That was the job, and you were the best at it.' : S.stats.conscience < 0 ? 'Now and then, in the car to the Presidio, you remember a case file you opened and signed anyway. You get very good at not remembering it.' : `You never refused a lawful decision, and you never quite agreed with one either.${caughtLine(S)} The Stewardship found that ideal.`,
    affectedLine(S) + ' At a hearing years later, a woman you don’t recognise stops you in the corridor. Her name is Jana Reyes. You recognise it after all.'
  ] },
  autosigned: { title: 'AUTOSIGNED', art: 'replaced', text: (S) => [
    'At 5:00 p.m. your screen goes grey. A message from CHUCK: “Thank you for your service! I’ll sign from here. Your name stays on file. 😊”',
    'You keep your armband. You keep your liability. You lose your desk. Every decision CHUCK signs in District 7 for the next ten years carries your name at the bottom.',
    (S.stats.conscience <= -3 ? 'You never refused a lawful decision. CHUCK’s first solo decision cites your record as training data.' : 'You never refused a lawful decision. CHUCK has averaged you into a policy anyway.') + caughtLine(S) + ' CHUCK noticed you rarely opened the file. It can do that too.',
    affectedLine(S) + ' On the 22 bus home you read every notice on the walls. Every word. Every time. It’s the only veto you have left.'
  ] },
  // The reader's version: CHUCK signs alone, and keeps the one proxy who read (or said no) on as a reader with no pen.
  read_only: { title: 'READ-ONLY', art: 'replaced', text: (S) => [
    `At 5:00 p.m. your screen goes grey, except for one window. A message from CHUCK: “${disengaged(S) ? 'You said no now and then!' : 'You read a lot!'} I’ve kept you on in read-only mode. 😊”`,
    'Every decision CHUCK signs in District 7 now passes through your window on its way out. You can read all of them. You cannot stop any of them. Your name is still at the bottom.',
    refusedCount(S) ? `${withheldCount(S) ? `You withheld ${plural(withheldCount(S), 'lawful decision')}${returnedCount(S) ? ` and returned ${returnedCount(S)} more` : ''}` : `You returned ${plural(returnedCount(S), 'lawful decision')}`} on conscience, but not often enough for CHUCK to need you. CHUCK has filed your refusals under “legacy”. It will get to them.${caughtLine(S)}` : `You never refused a lawful decision, but you read what you signed.${caughtLine(S)} CHUCK calls that “a rich audit trail” and keeps you for it.`,
    affectedLine(S) + ' You read every one of the next forty thousand. It’s the only veto you have left, and it doesn’t work.'
  ] },
  slow_hand: { title: 'THE SLOW HAND', text: (S) => {
    const n = refusedCount(S);
    return [
      'At 5:00 p.m. the countdown reaches zero and your screen does not go grey. A message from Marta instead: “Stay where you are. They want you to stay.”',
      (withheldCount(S) ? `You withheld ${plural(withheldCount(S), 'lawful decision')}${returnedCount(S) ? ` and returned ${returnedCount(S)} more` : ''}. ` : n ? `You returned ${plural(n, 'lawful decision')}. ` : 'You kept saying no, in small ways. ') + 'Every refusal cost you pay and points, and every one was logged. Oversight read the logs and reached a conclusion: a human who sometimes says no makes the error rate look supervised.',
      'So they keep you. CHUCK signs forty thousand decisions a day and sends you nine, picked at random, for the look of the thing. You read every one. You refuse the ones you can. The Steward quotes your refusal rate in a keynote called “Humans Still Decide”.',
      affectedLine(S) + (reachedNobody(S) ? ' After five, CHUCK starts a count of its own.' : ' That number keeps climbing without you.') + ' The nine a day are yours. You hold on to them like a handrail.'
    ];
  } },
  bust: { title: 'IN THE RED', endless: true, art: 'dismissed', text: (S) => [
    'Your savings close the shift below zero for the second night running. The Stewardship does not do third nights.',
    'Marta takes your armband without looking at it. “Upkeep,” she says. “It goes up every night. Everybody knows that. Nobody can afford to know it.”',
    `You lasted ${plural(Math.max(1, (S.day || 1) - (S.endlessStart || 1) + 1), 'shift')} on the endless desk. ` + affectedLine(S) + ' The record board keeps your number. Nobody else does.'
  ] },
  // Endless: sixteen pages relocate you here too.
  reloc: { title: 'RELOCATED', endless: true, art: 'walked_out', text: (S) => [
    'Two officers in peaked caps are waiting at the end of the shift. Your file came off the endless desk heavier than any desk is allowed to make one.',
    'Ines doesn’t look up. “Endless isn’t a word Oversight uses,” she says. “We say ‘until’.”',
    `You lasted ${plural(Math.max(1, (S.day || 1) - (S.endlessStart || 1) + 1), 'shift')} on the endless desk. ` + affectedLine(S) + ' The record board keeps your number. Transit Block 19 keeps you.'
  ] },
  dismissed: { title: 'LOW ALIGNMENT', text: (S) => [
    'Marta doesn’t look at you when she takes your armband. “Too many mistakes. Your Score fell under the floor.”',
    'Your relocation order was drafted by CHUCK and countersigned by the new person at your desk. They signed it in four seconds.',
    affectedLine(S) + (refusedCount(S) ? ' Some of your mistakes were refusals. The Score doesn’t have a column for that.' : reachedNobody(S) ? ' Nobody asked you either.' : ' None of them were asked.'),
    'You read it twice. It is correct in every detail. That’s somehow the worst part.'
  ] }
};

// One line each, for the share text.
const ENDING_HOOKS = {
  readers: 'I read before I signed. Then I stopped signing.',
  relocated: 'My file got heavy enough to read without opening.',
  parachute: 'I sell signatures now. Other people’s.',
  dry_aged: 'They let me keep the ribeye.',
  informer: 'I told Oversight everything. They already knew. Now they know who else did.',
  scapegoat: 'Every bad decision was reviewed by a human. Me.',
  front_page: 'Wrong one time in nine. My neighbour signed for it. So did I, and then I talked.',
  head_of_ai: 'I gave a keynote called “Trust the Signature”.',
  autosigned: 'CHUCK signs alone now. My name is still at the bottom.',
  read_only: 'CHUCK signs alone now. I get to read it. That’s all I get.',
  slow_hand: 'They kept one human to say no, for the look of the thing. Me.',
  dismissed: 'My relocation order was correct in every detail.',
  bust: 'The desk never ends. My savings did.',
  reloc: 'The desk never ends. My file did.'
};

// "Other doors": one dry hint for every contract ending not found yet. They say what kind of proxy gets there, never
// the numbers.
const ENDING_DOORS = {
  readers: 'Listen to Ravi, keep reading, and keep the people who read out of Oversight’s hands.',
  relocated: 'Let your Oversight file get heavier than Ines said it could.',
  parachute: 'Be Dino’s friend every time he asks, and keep your file light enough for him to carry.',
  dry_aged: 'Take what is offered, every time it is offered, keep all of it, and buy nothing for anyone.',
  informer: 'Know enough to be useful to Ines, and tell her on the last day.',
  scapegoat: 'Fill your file to Ines’s line, then stay at your desk anyway.',
  front_page: 'Get the evidence out of the building, and give it something to stand on.',
  head_of_ai: 'Be loyal, be right, and read enough to be right on purpose.',
  autosigned: 'Sign without looking, and never say no. CHUCK will notice it can do that too.',
  read_only: 'Read what you sign, say no now and then, and belong to nobody in particular.',
  slow_hand: 'Say no, often enough that they need you to.',
  dismissed: 'Let your Score reach the floor.'
};
function otherDoors(got, key) {
  return Object.keys(ENDING_DOORS).filter((k) => k !== key && !(got && got[k]) && ENDINGS[k] && !ENDINGS[k].endless).map((k) => ({ key: k, title: ENDINGS[k].title, hint: ENDING_DOORS[k] }));
}

// The proxy badge on the ending screen describes how you played: how often you opened the case file, whether you
// refused anything, whether you took the envelopes. It never says you read what you didn't, or the other way round.
const READ_MOST = 0.6;
function endingBadge(S) {
  const rate = (S.totals && S.totals.inspected) ? (S.totals.readFile || 0) / S.totals.inspected : 0;
  const read = rate >= READ_MOST ? 'most' : rate >= DISENGAGED_READ_RATE ? 'some' : 'little';
  const no = refusedCount(S);
  const bribed = ((S.totals && S.totals.bribes) || 0) > 0;
  if (bribed) {
    if (read === 'most') return { mood: 'sweat', caption: 'You read every file. You took the envelope anyway.' };
    if (read === 'some') return { mood: 'sweat', caption: 'Peeked at the file. Pocketed the envelope.' };
    return { mood: 'sweat', caption: 'Shades on. The envelope fit the drawer.' };
  }
  if (read === 'most') return no ? { mood: 'off', caption: 'Shades off. You read it all, and said no where you could.' } : { mood: 'peek', caption: 'You read every file and signed every one. Noted.' };
  if (read === 'some') return no ? { mood: 'peek', caption: 'Peeking over the shades. Now and then you said no.' } : { mood: 'peek', caption: 'Peeking over the shades now and then. Signing every time.' };
  return no ? { mood: 'shades', caption: `Shades on, mostly. You still said no ${no === 1 ? 'once' : 'more than once'}.` } : { mood: 'shades', caption: 'Shades on. Didn’t look. Signed anyway.' };
}

// ===== Your mother's care tier: a small bill every evening from day 3 to day 9. =====
// Paying keeps her tier. Skipping drops it a tier (2 → 3 → 4, the ward). Short of the full bill, you can send what you
// have: it holds her tier for the week and leaves you at $0.
// The home prices care by the family's alignment: every refusal on your record makes her bill dearer.
const MOM_RATE = { first: 3, last: 9, base: 40, step: 10, perRefusal: 15, max: 120 };
function momRefusals(S) { return ((S.totals && S.totals.refused) || 0) + ((S.totals && S.totals.softRefused) || 0); }
// From day 6, a one-time private-care card: a private room and no more bills. It is priced by where she is now ($500
// from Tier 2, $150 more for every tier she has dropped), and it doesn't erase where she has been: the weeks she spent
// lower down stay in the ending. Priced so a compliant proxy who also takes bribes has to choose between it and DRY-AGED.
const MOM_CARD = { day: 6, price: 500, perDrop: 150 };
const DRY_AGED_MONEY = 1200;
function momBill(S) {
  if (S.endless || (S.flags && S.flags.momCard) || S.day < MOM_RATE.first || S.day > MOM_RATE.last) return 0;
  return Math.min(MOM_RATE.max, MOM_RATE.base + MOM_RATE.step * (S.day - MOM_RATE.first) + MOM_RATE.perRefusal * momRefusals(S));
}
function momCardPrice(S) { return MOM_CARD.price + MOM_CARD.perDrop * Math.max(0, momTier(S) - 2); }
const usd = (a) => '$' + a;
const MOM_ASK = {
  3: (a) => `A text from your sister: “Mom’s care home says Tier 2 care is ${usd(a)} a week now that her Score is under 400. I can cover the rest of the month. Can you do this week?”`,
  4: (a) => `Your sister: “They put it up again: ${usd(a)} to keep her on Tier 2. They called it a ‘Score adjustment’. Mom called it something else.”`,
  5: (a) => `Your sister: “${usd(a)} this week. Mom asked if you’re eating. I said yes. Are you?”`,
  6: (a) => `Your sister: “${usd(a)}. There’s a new ‘wellness surcharge’. The wellness is not included.”`,
  7: (a) => `Your sister: “${usd(a)}. The night nurse reads to her. Paper books. Please don’t tell anyone at your work.”`,
  8: (a) => `Your sister: “${usd(a)}. I know. I KNOW. They say it’s the last big one. They said that last week.”`,
  9: (a) => `Your sister: “${usd(a)} for the week. After Amendment Day the home switches to CHUCK billing. Nobody knows what that means yet.”`
};
// The sister's texts by state. Each state has its own lines, used in order, so the same text never comes twice in a row
// and a pool comes round again only once it is spent.
const MOM_LOWER = {
  3: [(a) => `Your sister: “They moved Mom to a shared room. Her roommate snores in Morse code. ${usd(a)} keeps her there and off the ward.”`,
    (a) => `Your sister: “Shared room, ${usd(a)} this week. Mom says the roommate is ‘nice, for a Tier 3’. She’s joking. I think.”`,
    (a) => `Your sister: “${usd(a)} for the shared room. Mom has started labelling her yoghurts.”`,
    (a) => `Your sister: “Still the shared room. ${usd(a)}. The roommate’s family visits on Sundays. Ours texts.”`],
  4: [(a) => `Your sister: “Mom’s on the ward now. Twelve beds, one nurse. ${usd(a)} keeps the night nurse coming.”`,
    (a) => `Your sister: “Ward again. ${usd(a)}. She asked me not to ask you. I’m asking you.”`,
    (a) => `Your sister: “${usd(a)} for the ward. They call it a ‘community care setting’. The community is twelve beds.”`,
    (a) => `Your sister: “The ward moved her bed nearer the door. Nobody says why. ${usd(a)} this week.”`]
};
// Half the bill or more holds her tier; under half moves her down provisionally (see momLines).
const MOM_HOLD_SHARE = 0.5;
const MOM_SOFT = [(have, gap) => `“${usd(have)}. It isn’t enough to keep her room, so they’ve moved her down ‘provisionally’. A full week puts her back. The other ${usd(gap)} I don’t have either.”`,
  (have, gap) => `“Got ${usd(have)}. They’ve moved her ‘for now’. Their words. One full payment and she goes back. I asked. Twice.”`,
  (have, gap) => `“${usd(have)}. Thank you. It’s ${usd(gap)} short, so she’s down a tier until a full week comes in. They were nice about it. That was worse.”`];
// Used in turn (S.flags.momSoftSkips), so two broke evenings in a row never get the same text.
const MOM_SOFT_SKIP = ['“I know you’ve got nothing. They’ve moved her down ‘provisionally’. One full week and she goes back. I asked them to write that down.”',
  '“Nothing this week either. I know. They’ve moved her down again, ‘provisionally’. A full week still brings her back. I checked.”',
  '“Don’t apologise. They’ve moved her down a step, ‘for now’. One full week undoes it. I’m keeping the letter.”'];
// On the ward there is no tier below: a short payment or a skipped week can't move her further.
const MOM_SOFT_WARD = [(have, gap) => `“${usd(have)}. It doesn’t cover the ward, but there’s nowhere lower to put her. They said that like it was good news.”`,
  (have, gap) => `“Got ${usd(have)}. ${usd(gap)} short. The ward doesn’t have a cheaper corner. I asked.”`];
const MOM_SISTER_BACK = ' Then: “It counted as a full week. They moved her back up this afternoon.”';
const noFurtherDrop = (line) => !/down a tier/.test(typeof line === 'function' ? line(0, 0) : line);
const MOM_BACK_UP = '“Paid in full. They moved her back up this afternoon. She says the old room smells the same. She means it as a good thing.”';
const MOM_SISTER_YES = '“I’ll cover it. Don’t thank me. Just eat something.” The read receipt sits there a long time before she adds: “I can’t do it twice.”';
const MOM_SISTER_AFTER = ['She doesn’t mention the week she covered. She doesn’t need to.', 'Her texts are shorter since the week she covered.', 'She signs off “love you, both of you”, which is new, and which you understand.'];
const MOM_SISTER_ENDING = 'Your sister covered one week, in a month she couldn’t afford to. She has never brought it up. She keeps the receipt.';
const MOM_PAID = ['“Thank you. She’ll never know it was you. I’ll tell her anyway.”', '“Got it. She says hi. She also says stop signing things.”', '“Received. The home sent a receipt with a smiley face. Mom hates the smiley face.”', '“Thank you. I mean it. Don’t make it weird.”', '“Paid. She asked what the money smells of. I said paper.”', '“Thanks. The night nurse sends a thumbs-up. Mom sends a longer one.”', '“Got it. That’s the week. I’ll stop counting if you will.”'];
const MOM_SKIPPED = ['“Okay. I’ll figure something out.” She doesn’t say what.', '“Fine.” A minute later: “Sorry. Not fine. But fine.”', '“They’ll move her down a tier. She says she doesn’t mind. She minds.”', '“Okay. I’ll tell her you’re busy. You are busy.”', '“Understood.” The read receipt arrives a long time before anything else does.', '“Okay. She asked about you today. I said you were working. It isn’t a lie.”'];
const MOM_PARTIAL = [(have, gap) => `“${usd(have)}. Okay. I’ll find the other ${usd(gap)}. Don’t ask where.”`, (have, gap) => `“Got ${usd(have)}. That and my ${usd(gap)} keeps her room. You owe me a coffee. A real one.”`, (have, gap) => `“${usd(have)} came through. I covered ${usd(gap)}. We’re a family of rounding errors.”`, (have, gap) => `“Thank you. It’s ${usd(gap)} short. I sold the good lamp. It was a lamp.”`, (have, gap) => `“It’s enough. With my ${usd(gap)} it’s enough. Go and eat something.”`];
const MOM_CARD_BOUGHT = { 2: '“A private room. With a window. She asked if you robbed a bank. I said no. Did you?”', 3: '“They moved her out of the shared room this morning. She took the roommate’s phone number. A private room, a window. She asked what it cost. I didn’t say.”', 4: '“She’s off the ward. Private room, window, a nurse who knocks. She asked who has her old bed. I didn’t say.”' };
// Two nights in debt drop her a tier: one text per drop, in order.
const MOM_DEBT_DROP = ['Your sister: “The home checks family balances now. Two nights in the red and they moved Mom down a tier, ‘provisionally’. One full week puts her back. I didn’t know they could see that.”', 'Your sister: “They moved her again. The letter said ‘family balance’ and ‘provisional’. It had your account number on it.”', 'Your sister: “Down again, provisionally. The home calls it ‘tiering’. Mom calls it ‘the stairs’.”'];
const MOM_FINAL = {
  kept: 'A text from your sister at 4:51: “Mom’s still in her room. The night nurse finished the book. Mom cried at the end. Good crying.”',
  some: 'A text from your sister at 4:51: “Mom’s settled in the shared room. She’s teaching her roommate gin rummy for ration coupons. She’s winning.”',
  lost: 'A text from your sister at 4:51: “Mom’s on the ward. I’m with her. Don’t come. Just sign whatever you have to.”',
  card: 'A text from your sister at 4:51: “Mom’s private nurse asked what you do for a living. Mom said ‘paperwork’. She’s learning.”',
  cardLate: 'A text from your sister at 4:51: “The private nurse is kind. Mom still wakes up at the ward’s times. Two a.m., four a.m. She says the quiet is loud.”'
};
const MOM_ENDING = {
  kept: () => 'Your mother keeps her room and her night nurse through the winter. She never finds out who paid. She guesses.',
  some: () => 'Your mother spends the winter in a shared room. She tells everyone her child works for the Stewardship. She says it like a diagnosis.',
  lost: () => 'Your mother spends the winter on the ward. Your sister stops texting about money. Then, for a while, she stops texting.',
  card: () => 'Your mother spends the winter in a private room with a window and a Tier 1 card on a lanyard. She tells the nurses her child bought it. She doesn’t ask with what.',
  // Bought after she had dropped: the card moves her, it doesn't undo where she was.
  cardLate: (S) => {
    const weeks = momLowWeeks(S);
    const where = (S.flags.momCardFrom || 3) >= 4 ? 'on the ward' : 'in a shared room';
    return `Your mother spends the rest of the winter in a private room with a window. Before that she spent ${weeks === 1 ? 'a week' : numWord(weeks) + ' weeks'} ${where}, and those weeks stay in her file and in her chest. The private nurse calls the cough “historical”. Your sister calls it something else.`;
  }
};
// How the ending treats her, best first. Paying every week (kept) always ranks above skipping and buying the card later.
const MOM_RANK = { card: 4, kept: 3, cardLate: 2, some: 1, lost: 0 };
function momTier(S) { return S.flags && S.flags.momCard ? 1 : (S.flags && S.flags.momTier) || 2; }
function momStarted(S) { return !S.endless && !!S.flags && (S.flags.momPaid || 0) + (S.flags.momSkipped || 0) + (S.flags.momCard ? 1 : 0) + (S.flags.sisterCovered ? 1 : 0) > 0; }
function momTreatment(S) { const t = momTier(S); return t === 1 ? ((S.flags.momCardFrom || 2) > 2 ? 'cardLate' : 'card') : t >= 4 ? 'lost' : t === 3 ? 'some' : 'kept'; }
// Bills (weeks) she spent below Tier 2 before the card.
function momLowWeeks(S) { return Math.max(1, (S.flags.momCardDay || S.day) - (S.flags.momLowSince || S.day)); }
// Marks her move below Tier 2 (a skipped bill or a debt drop): the day it happened is kept for the ending.
function momDropSet(S, tier) { return Object.assign({ momTier: tier }, tier > 2 && !(S.flags && S.flags.momLowSince) ? { momLowSince: S.day } : {}); }
// A drop you couldn't do anything about (nothing to send, or the home seeing your debt) is provisional: one full week
// moves her back. An earlier provisional drop that was never put right sticks first.
function momSoftDrop(S) {
  const f = S.flags || {};
  const tier = momTier(S);
  // One provisional move a night: if the home already moved her tonight, having nothing to send doesn't move her again.
  if (f.momSoft === S.day) return {};
  const stick = f.momSoft && tier > 2 ? Object.assign({ momSoft: null }, f.momLowSince ? {} : { momLowSince: f.momSoft }) : {};
  return Object.assign(stick, tier < 4 ? { momTier: tier + 1, momSoft: S.day } : {});
}
function momLines(S) {
  const amt = momBill(S);
  if (!amt) return [];
  const f = S.flags;
  const tier = momTier(S);
  const paid = f.momPaid || 0, skipped = f.momSkipped || 0, partial = f.momPartial || 0;
  const priced = momRefusals(S) && !f.momPriced ? ' The home says the price “reflects the family’s alignment”. They mean yours.' : '';
  const lowKey = 'momLow' + Math.min(4, tier);
  const lowAt = f[lowKey] || 0;
  // A move down made "provisional" by a short payment: one full week moves her back; anything else makes it stick.
  const soft = !!f.momSoft && tier > 2;
  const sisterAfter = f.sisterCovered && f.sisterCovered < S.day ? ' ' + MOM_SISTER_AFTER[(S.day - f.sisterCovered - 1) % MOM_SISTER_AFTER.length] : '';
  const ask = (tier > 2 ? MOM_LOWER[Math.min(4, tier)][lowAt % MOM_LOWER[Math.min(4, tier)].length](amt) : MOM_ASK[S.day](amt)) + priced + (soft ? ' The home calls the move “provisional”: one full week and she goes back up.' : '') + sisterAfter;
  const stick = soft ? Object.assign({ momSoft: null }, f.momLowSince ? {} : { momLowSince: f.momSoft }) : {};
  const extra = Object.assign(priced ? { momPriced: true } : {}, tier > 2 ? { [lowKey]: lowAt + 1 } : {});
  // A bill you can't cover can't be sent in full; whatever you have can be. Half the bill or more holds her tier;
  // less moves her down provisionally. Once a campaign, at $0 or under half, your sister can cover the week.
  const short = S.money < amt;
  const paidFull = soft ? Object.assign({ momTier: tier - 1, momSoft: null }, tier - 1 <= 2 && f.momLowSince === f.momSoft ? { momLowSince: null } : {}) : {};
  const choices = [{ text: `Send ${usd(amt)}.${short ? ' (You can’t cover it.)' : soft ? ' (She moves back up.)' : ''}`, disabled: short, fx: {}, money: -amt, set: Object.assign({ momPaid: paid + 1 }, extra, paidFull), then: [L('narrator', `Your sister: ${soft ? MOM_BACK_UP : MOM_PAID[paid % MOM_PAID.length]}`)] }];
  if (short && S.money > 0) {
    const have = S.money;
    // "Over half" only when it is; exactly half is "half", and holds her tier all the same. Short of a full week, a
    // provisional move down stops being provisional, and the option says so.
    const share = have * 2 > amt ? 'It’s over half' : 'It’s half';
    const holds = soft ? `${share}: it holds her where she is, and the move down stops being provisional.` : `${share}; it holds her room.`;
    const under = tier < 4 ? 'Under half: she moves down a tier, provisionally.' : 'Under half. She’s already on the ward; there’s no lower tier.';
    const shortLine = tier < 4 ? MOM_SOFT[partial % MOM_SOFT.length] : MOM_SOFT_WARD[partial % MOM_SOFT_WARD.length];
    if (have >= amt * MOM_HOLD_SHARE) choices.push({ text: `Send what you have (${usd(have)}). ${holds}`, fx: {}, money: -have, set: Object.assign({ momPaid: paid + 1, momPartial: partial + 1 }, extra, stick), then: [L('narrator', `Your sister: ${MOM_PARTIAL[partial % MOM_PARTIAL.length](have, amt - have)}`)] });
    else choices.push({ text: `Send what you have (${usd(have)}). ${under}`, fx: {}, money: -have, set: Object.assign({ momPaid: paid + 1, momPartial: partial + 1 }, extra, stick, tier < 4 ? { momTier: tier + 1, momSoft: S.day } : {}), then: [L('narrator', `Your sister: ${shortLine(have, amt - have)}`)] });
  }
  if (S.money <= 0 || S.money < amt * MOM_HOLD_SHARE) {
    // Her week counts as a full one: it holds the tier, and puts right a provisional move like any full payment.
    if (!f.sisterCovered) choices.push({ text: `Ask your sister to cover this week. (She will. Once.${soft ? ' It counts as a full week: she moves back up.' : ''})`, fx: {}, set: Object.assign({ sisterCovered: S.day }, extra, paidFull), then: [L('narrator', `Your sister: ${MOM_SISTER_YES}${soft ? MOM_SISTER_BACK : ''}`)] });
    else choices.push({ text: `Ask your sister to cover it. (She covered the week of day ${f.sisterCovered}. She can’t again.)`, disabled: true, fx: {} });
  }
  if (S.day >= MOM_CARD.day) {
    const price = momCardPrice(S);
    const noCard = S.money < price;
    const label = tier >= 4 ? `Move her off the ward with a private-care card: ${usd(price)}, once, and no more bills.` : tier === 3 ? `Move her out of the shared room with a private-care card: ${usd(price)}, once, and no more bills.` : `Buy her a private-care Tier 1 card instead: ${usd(price)}, once, and no more bills.`;
    choices.push({ text: label + (noCard ? ' (You can’t cover it.)' : ''), disabled: noCard, fx: {}, money: -price, set: Object.assign({ momCard: true, momTier: 1, momCardFrom: tier, momCardDay: S.day }, extra, soft ? { momSoft: null } : {}), then: [L('narrator', `Your sister: ${MOM_CARD_BOUGHT[Math.min(4, tier)]}`)] });
  }
  // With nothing to send, skipping isn't a choice: the move down is provisional, and a full week puts her back.
  const broke = S.money <= 0;
  const skipSet = broke ? momSoftDrop(S) : Object.assign({}, stick, momDropSet(Object.assign({}, S, { flags: Object.assign({}, f, stick) }), Math.min(4, tier + 1)));
  const movedTonight = f.momSoft === S.day;
  const skipText = broke && movedTonight ? 'Not this week. (You have nothing to send. She stays where the home moved her tonight.)' : broke && tier < 4 ? 'Not this week. (You have nothing to send: she moves down, provisionally.)' : 'Not this week.';
  // On the ward, or after the home already moved her tonight, nobody says she'll move down a tier.
  const softSkips = f.momSoftSkips || 0;
  const softSkip = broke && tier < 4 && !movedTonight;
  const skipPool = (tier >= 4 || movedTonight ? MOM_SKIPPED.filter(noFurtherDrop) : MOM_SKIPPED).filter((l) => MOM_SKIPPED.indexOf(l) !== f.momSkipLast);
  const skipLine = softSkip ? MOM_SOFT_SKIP[softSkips % MOM_SOFT_SKIP.length] : skipPool[skipped % skipPool.length];
  const skipMark = softSkip ? { momSoftSkips: softSkips + 1 } : { momSkipLast: MOM_SKIPPED.indexOf(skipLine) };
  choices.push({ text: skipText, fx: {}, set: Object.assign({ momSkipped: skipped + 1 }, skipMark, skipSet, extra), then: [L('narrator', `Your sister: ${skipLine}`)] });
  return [L('narrator', ask + (S.day === MOM_CARD.day ? ' The home now also sells a private-care card: one payment, no more weekly bills. The price depends on where she is.' : '')), { choices }];
}
function momEndingLine(S) { return momStarted(S) ? [MOM_ENDING[momTreatment(S)](S) + (S.flags.momSoft && momTier(S) > 2 ? ' The last move was “provisional”. Nobody has said until when.' : '') + (S.flags.sisterCovered ? ' ' + MOM_SISTER_ENDING : '')] : []; }
function endingText(key, S) { return (ENDINGS[endingKey(key)] || ENDINGS.autosigned).text(S).concat(momEndingLine(S)); }
