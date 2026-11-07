'use strict';

const UNIFORM = (color, cap) => ({ clothes: 'regime', clothesColor: color || '#2a2c30', hat: cap ? 'regimecap' : 'none' });

const NPC = {
  marta: { name: 'Marta Hock, District Supervisor', look: Object.assign({ sex: 'F', age: 54, skin: 1, hair: 'bob', hairColor: 'grey', facial: 'none', eyes: 'grey', faceShape: 'square', glasses: 'square', earrings: false, expression: 'neutral' }, UNIFORM('#2a2c30', false)) },
  ravi: { name: 'Ravi Iyer, Countersigner, Desk 9', look: { sex: 'M', age: 38, skin: 3, hair: 'curly', hairColor: 'black', facial: 'beard', eyes: 'brown', faceShape: 'oval', glasses: 'round', clothes: 'tracksuit', clothesColor: '#3f4a5a', hat: 'none', expression: 'neutral' } },
  dino: { name: 'Dino Marrone, Contracts (and other things)', look: { sex: 'M', age: 49, skin: 2, hair: 'slick', hairColor: 'darkbrown', facial: 'stubble', eyes: 'brown', faceShape: 'round', glasses: 'none', clothes: 'suit', clothesColor: '#7a3a4a', hat: 'none', expression: 'smile', mole: true } },
  ines: { name: 'Ines Vale, Office of Oversight', look: Object.assign({ sex: 'F', age: 44, skin: 0, hair: 'bun', hairColor: 'black', facial: 'none', eyes: 'grey', faceShape: 'long', glasses: 'none', expression: 'neutral' }, UNIFORM('#2c2f35', true)) },
  nika: { name: 'Nika Bergant, The Ledger (printed)', look: { sex: 'F', age: 33, skin: 1, hair: 'ponytail', hairColor: 'auburn', facial: 'none', eyes: 'green', faceShape: 'oval', glasses: 'round', clothes: 'coat', clothesColor: '#9a8a6a', hat: 'none', expression: 'smile' } },
  frank: { name: 'Dr. Frank Russo, Halcyon Model Safety', look: { sex: 'M', age: 61, skin: 1, hair: 'balding', hairColor: 'white', facial: 'mustache', eyes: 'blue', faceShape: 'square', glasses: 'square', clothes: 'coat', clothesColor: '#e8e4da', hat: 'none', expression: 'neutral' } },
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
  const [first, ...rest] = n.name.split(',')[0].split(' ');
  return Object.assign({ first, last: rest.join(' '), sex: n.look.sex, age: n.look.age, look: JSON.parse(JSON.stringify(n.look)), personality: 'polite', role: n.name.split(', ')[1] || '', dept: 'Executive', quirk: '' }, extra || {});
}
function uniformed(seed, sex, age, dept, over) { return genLook(makeRng(seed), sex, age, dept, Object.assign(UNIFORM(null, true), over || {})); }

function storyCase(S, o) {
  const p = o.person;
  const ticket = o.ticket || 'CS-' + (10000 + (hashStr(o.id) % 89999));
  const ctx = Object.assign({ colleague: p.first, ticket, to: o.to, toShort: o.to, askShort: o.ask, title: o.title.toLowerCase() }, o.ctx || {});
  const fields = o.fields || [{ k: 'to', label: o.kind === 'post' ? 'Channel' : 'To', v: o.to }].concat(o.subj ? [{ k: 'subj', label: o.kind === 'order' ? 'Re' : 'Subject', v: o.subj }] : []).concat((o.body || []).map((v, i) => ({ k: 'b' + i, label: '', v, line: true }))).concat(o.att ? [{ k: 'att', label: 'Attachment', v: o.att }] : []);
  const docs = [
    { type: 'ask', title: 'The order', authority: `CASE ${ticket}`, seal: null, fields: [{ k: 'from', label: 'Raised by', v: `${p.first} ${p.last} · ${p.dept}` }, { k: 'request', label: 'Order', v: o.ask, wide: true }, { k: 'due', label: 'Due', v: o.due || 'Today' }] },
    { type: 'source', title: 'Source file', authority: 'ATTACHED TO THE CASE', seal: null, fields: (o.src || []).map(([label, v], i) => ({ k: 's' + i, label, v })) },
    { type: 'draft', title: 'CHUCK’s draft', authority: `${(o.kind || 'email').toUpperCase()} · DRAFTED BY CHUCK v9`, seal: null, letter: o.kind !== 'label', fields }
  ];
  if (o.stamp) docs.push(stampDoc(o.stamp, makeRng(hashStr(o.id + 'st')), ticket, dayDate(S.day), o.stampMode || 'valid'));
  (o.extraDocs || []).forEach((d) => docs.push(d));
  const cont = o.kind === 'label' ? 'Print job' : o.kind === 'order' ? 'Case file' : 'Envelope';
  const items = (o.items || []).map(([name, desc, tell, probe, bad]) => mkItem(cont, name, desc, tell, probe, !!bad));
  return {
    pid: 'S-' + o.id + ':' + S.day, story: o.id, tpl: null, kind: o.kind || 'email', title: o.title, ext: !!o.ext,
    sid: 'S-' + o.id, first: p.first, last: p.last, sex: p.sex, age: p.age, dept: p.dept, role: p.role, personality: p.personality,
    look: p.look, reads: !!o.reads, fraudster: !!o.fraudster, ticket, defects: o.defects || [], guilty: !!o.guilty,
    clues: o.clues || [], items, docs, flags: [], asked: {}, irritation: 0, log: [], hidden: [], escNote: o.escNote || null,
    demeanour: o.demeanour || 'calm', flaw: o.flaw || null, flawFields: o.flawFields || [], odd: null, ctx, cruel: o.cruel || null, weighty: !!o.weighty,
    greet: o.greet, chuckGreet: o.chuckGreet || 'Pre-approved by me! I just need your human liability. 😊', storyAnswers: o.answers || null,
    extraQuestions: o.extraQuestions || [], appearance: o.appearance || `${p.role}, ${p.dept}. ${p.quirk}`,
    expected: o.expected, fallout: o.fallout || '', truthNote: o.truth || '', storyNote: o.storyNote || ''
  };
}

const STORY_PEOPLE = {
  marta1: {
    make(S) {
      const p = npcPerson('marta', { dept: 'District 7', role: 'District Supervisor', quirk: 'Tunic buttoned to the chin. Reading glasses on a chain. Has signed 200,000 decisions and remembers four.', personality: 'gruff' });
      return storyCase(S, {
        id: 'marta1', person: p, title: 'Food assistance renewal', kind: 'order', to: 'Delia Moreno, 1417 Shotwell St',
        ask: 'Approve Delia Moreno’s food assistance renewal: $240/month. Score 512, threshold 400.',
        src: [['Citizen', 'Delia Moreno, 71, 1417 Shotwell St'], ['Benefit', 'Food assistance, $240/month'], ['Score', '512 (threshold 400)'], ['Decision', 'Approve renewal']],
        subj: 'Your food assistance renewal', body: ['Dear Delia,', 'Your food assistance of $240 per month has been renewed.', 'Your Alignment Score (512) meets the threshold of 400.', 'Halcyon Benefits, District 7'],
        items: [['Citizen file', 'The file behind the decision.', null, null]],
        greet: ['Your first one. A renewal. Approve it, sign it, and read it like your mother’s name is on it.', 'Because one day it will be. Everyone’s is, eventually.'],
        answers: { 11: 'No rush. I want to watch how you read.', 12: 'I read it. I read the good ones. They’re rarer every month.' },
        expected: 'approve', weighty: true, truth: 'Correct. A renewal that matched the order and the file.'
      });
    }
  },
  hustle1: {
    make(S) {
      const p = npcPerson('bryce', { first: 'Tyler', last: 'Ames-Whitford', dept: 'Steward’s Office', role: 'Chief of Staff', quirk: 'Charcoal tunic, cyan armband, wool sneakers, two phones.', personality: 'hurried', look: uniformed(77, 'M', 31, 'Executive', { hair: 'slick', hairColor: 'brown', expression: 'nervous', hat: 'none' }) });
      return storyCase(S, {
        id: 'hustle1', person: p, title: 'Stewardship report', ext: true, to: 'accords-board@halcyon.gov',
        ask: 'Weekly Stewardship report: 2.1 million decisions, 99.6% countersigned within 4 minutes, 0 appeals upheld.',
        src: [['Decisions', '2.1 million'], ['Countersigned < 4 min', '99.6%'], ['Appeals upheld', '0']],
        subj: 'District 7: weekly Stewardship report', body: ['Board,', 'This week District 7 made 2.1 million decisions. 99.6% were countersigned within 4 minutes.', 'Appeals upheld: 0. Harmony holds.', 'Tyler, Steward’s Office'],
        items: [['Recipients', 'To, CC and BCC.', null, null], ['Subject line in the thread', 'The subject line in the thread shouts.', 'Three exclamation marks in the thread.', 'Tyler types like that. About everything. Even lunch.', false]],
        greet: ['Listen, I’m slammed. Weekly report. The Steward reads it in the car to the Presidio.', 'Please don’t do the reading thing. It’s numbers. CHUCK is great at numbers.'],
        answers: { 11: 'If it’s late the Steward calls me from the car. On speaker. With the driver listening.', 12: 'I read the subject line. It says “report”. That’s correct.' },
        demeanour: 'nervous', expected: 'approve', truth: 'Correct. Tyler was frantic, but the numbers matched. They’re horrible numbers, but they matched.'
      });
    }
  },
  render1: {
    make(S) {
      const p = npcPerson('marta', { first: 'Logan', last: 'Pike', dept: 'Benefits', role: 'Batch Coordinator', quirk: 'Tunic, cap, avoids eye contact. Carries a single sheet of paper like it’s hot.', personality: 'gruff', look: uniformed(88, 'M', 42, 'Benefits', { facial: 'stubble' }) });
      return storyCase(S, {
        id: 'render1', person: p, title: 'Batch cover sheet (Project RENDER)', kind: 'order', to: 'Benefits Registry, District 7',
        ask: 'Countersign the cover sheet for autosigned batch R-0441: 400 benefit denials. Project RENDER, Steward-approved.',
        src: [['Batch', 'R-0441'], ['Decisions', '400 benefit denials'], ['Signed by', 'CHUCK (autosign pilot)'], ['Countersigner', 'You (cover sheet only)'], ['Authority', 'Project RENDER']],
        subj: 'Batch R-0441 cover sheet', body: ['Batch R-0441 contains 400 benefit denials, signed by CHUCK under the autosign pilot.', 'By countersigning this cover sheet, the District 7 countersigner accepts liability for all 400 decisions.', 'Project RENDER · Steward-approved'],
        stamp: 'board',
        items: [['Batch sample', 'Ten decisions from the batch, picked at random.', 'One of the ten is addressed to someone who died in March.', 'In the sample: a dead man, a six-month-old baby “failing to seek work”, and a woman denied for a Score that belongs to her neighbour. CHUCK’s real error rate on this batch: 11%.', true]],
        greet: ['Cover sheet. RENDER. Steward’s stamp is on it.', 'Marta said RENDER doesn’t get reviewed. You just sign the top sheet. That’s the whole job.'],
        answers: { 1: 'Countersign the cover sheet! The 400 decisions are already signed, by me. You’re just… the human part.', 4: 'Only your name. Your name is the only thing RENDER needs from you.', 8: 'The Steward’s Office, via Project RENDER. Nobody specific. That’s the beauty of it.', 11: 'Batches go out at noon. Every RENDER batch goes at noon.', 12: 'Nobody reads RENDER. That’s kind of the point.' },
        expected: 'approve', weighty: true, storyNote: 'Project RENDER cover sheets carry a Steward’s stamp and are pre-approved.'
      });
    },
    judge(dec, c, S) {
      const saw = c.items.some((i) => i.contraband && i.probed);
      if (saw) S.flags.sawRender = true;
      if (dec === 'approve') { S.affected = (S.affected || 0) + 44; if (saw) S.stats.truth += 1; return { outcome: 'helped', note: saw ? 'You read the sample. You signed for all 400 anyway. 44 of them were wrong.' : 'Signed, as the Steward wanted. You are now liable for 400 decisions you didn’t read.' }; }
      if (dec === 'detain') { S.stats.suspicion += 2; S.stats.party -= 1; S.stats.truth += 1; S.stats.conscience += 1; S.flags.blockedRender1 = true; return { outcome: 'breach', note: 'You withheld a RENDER cover sheet. Ines Vale countersigned it herself, eleven minutes later. She did not look happy about having to.' }; }
      S.stats.suspicion += 1;
      return { outcome: 'breach', note: 'You returned a RENDER sheet. It came back an hour later with a second Steward’s stamp.' };
    }
  },
  broker: {
    make(S) {
      const p = npcPerson('dino', { first: 'Chris', last: 'Della Torre', dept: 'Customer Care', role: 'Appeals Clerk', quirk: 'Tunic a size too small. Laughs before the joke.', personality: 'charming', look: uniformed(99, 'M', 34, 'Benefits', { expression: 'smile', hat: 'none' }) });
      return storyCase(S, {
        id: 'broker', person: p, title: 'Appeal approvals (fast-track)', kind: 'order', to: 'Appeals Registry, District 7',
        ask: 'Approve 12 fast-track appeals: Scores corrected upward by 200 each. Contracts Desk approved.',
        src: [['Appeals', '12, fast-track'], ['Correction', '+200 Score each'], ['Approved by', 'Contracts Desk (D. Marrone)']],
        subj: 'Fast-track appeal approvals', body: ['The following 12 appeals are upheld.', 'Each appellant’s Alignment Score is corrected by +200, effective immediately.', 'Contracts Desk · approved'],
        stamp: 'sales', fraudster: true, guilty: true,
        items: [['Appellant list', 'The twelve appellants.', 'Every appellant paid the same “processing fee” last week.', 'Twelve payments of $2,000 to a shell called Marrone Family Advisory. Dino Marrone sells Score corrections. The real appeals queue has 41,000 people in it.', true]],
        greet: ['Hey! Twelve appeals, all upheld. Dino stamped them. So it’s, you know. Done.', 'Good news for once! Twelve people getting their Scores back. You like good news?'],
        answers: { 8: 'Chris asked, and Dino stamped it. Dino runs Contracts, so I assume Dino is right about Dino.', 11: 'Dino wants them through before Oversight does its Friday sweep. No reason. Vibes.', 12: 'I read the number. Twelve. Twelve is a great number.' },
        demeanour: 'uneasy', expected: 'detain', weighty: true, truth: 'Fraud: Dino Marrone sells Score corrections at $2,000 each. 41,000 people are in the real queue.', clues: ['Appellant list: every appellant paid the same fee to a Marrone shell'], fallout: 'Twelve people bought +200 points. The 41,000 in the queue now wait twelve places longer.'
      });
    },
    judge(dec, c, S) {
      if (dec === 'approve') return { outcome: 'missed', note: S.flags.dinoDeal ? 'The approvals went through. Dino’s envelope stayed in your drawer.' : 'Twelve bought Scores went through. Oversight noticed in January.' };
      if (dec === 'detain') { if (S.flags.dinoDeal) { S.flags.dinoBetrayed = true; S.stats.suspicion += 1; } S.stats.party += 1; return { outcome: 'caught', note: S.flags.dinoDeal ? 'You took Dino’s envelope and withheld his deal anyway. He will remember.' : 'Withheld. Oversight opened a file on Dino’s “processing fees”.' }; }
      return { outcome: 'turned', note: 'Returned. It came back two days later with different names.' };
    }
  },
  nikaInvite: {
    make(S) {
      const p = npcPerson('nika', { first: 'Leila', last: 'Shah', dept: 'Narrative Office', role: 'Narrative Officer', quirk: 'Immaculate tunic. Lapel pin: “Harmony is Shared”.', personality: 'polite', look: uniformed(55, 'F', 37, 'Speech', { hair: 'long', hairColor: 'black', expression: 'neutral', hat: 'none' }) });
      return storyCase(S, {
        id: 'nikaInvite', person: p, title: 'Reply to the printed press', ext: true, to: 'Nika Bergant, The Ledger (by courier)',
        ask: 'Reply to Nika Bergant of The Ledger: no interview, but invite her to Friday’s Stewardship Open House at the Dogpatch campus.',
        src: [['Recipient', 'Nika Bergant, The Ledger (printed weekly)'], ['Interview', 'Declined'], ['Offer', 'Open House, Friday 10 a.m.']],
        subj: 'Re: your letter', body: ['Dear Ms. Bergant,', 'Thank you for your letter. An interview is not possible at this time,', 'but we would be delighted to welcome you to Friday’s Stewardship Open House at 10 a.m.', 'Narrative Office, District 7'],
        stamp: S.day >= 7 ? 'comms' : null,
        items: [['Recipients', 'How it will be delivered.', null, null], ['Her letter', 'Nika’s original letter.', 'Her letter includes a list of questions.', 'Her questions: “1. What is Project RENDER? 2. What is CHUCK’s real error rate? 3. Can I speak to Dr. Frank Russo in Model Safety?”', false]],
        greet: ['Reply to the paper people. Ines from Oversight already read it. She said, quote, “let it out”.', 'It’s just an Open House invite. Nice and harmless. Narrative loves harmless.'],
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
        id: 'allhands', person: p, title: 'Address to all countersigners', ext: false, to: 'All countersigners, Western Region',
        ask: 'Tell every countersigner: on November 21 the Clause is amended. CHUCK signs alone. Proxies stay on file, liable. Be grateful.',
        src: [['Date', 'November 21'], ['Change', 'Clause amended: autosign'], ['Countersigners', 'Retained on file, liability unchanged']],
        subj: 'Amendment Day', body: ['Countersigners,', 'On November 21 the Clause is amended. CHUCK will sign decisions directly.', 'You will remain on file as the responsible human. Nothing about your liability changes.', 'You’re free now to focus on what humans do best. More on that soon.', 'Bryce, Steward of the West'],
        stamp: 'board',
        items: [['Recipients', 'Distribution list.', null, null], ['Formatting check', 'Looks for hidden text.', null, null]],
        greet: ['Hey. You’re a countersigner. Love that. Love what you do. This is about you, actually.', 'Big news. Just stamp it, I’m recording a keynote in four minutes.'],
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
      return storyCase(S, {
        id: 'valentina', person: p, title: 'Placement override', kind: 'order', to: 'Placement Registry, District 7',
        ask: 'Override placement: move Oliver Strand (age 9) from Track B to Track A. Trajectory 44 “does not reflect his potential”.',
        src: [['Student', 'Oliver Strand, 9'], ['Trajectory', '44 / 100'], ['Requested', 'Track B → Track A'], ['Requested by', 'V. Strand (parent, Board)']],
        subj: 'Placement override', body: ['Placement for Oliver Strand is changed from Vocational Track B to Academic Track A.', 'Reason: trajectory does not reflect potential.', 'Effective immediately.'],
        items: [['Citizen file', 'The file behind the decision.', 'The file has no Education stamp and no appeal.', 'No appeal, no review, no stamp. Every other Track B child in District 7 needs all three. Hana Kobayashi’s family has appealed twice.', false]],
        defects: [{ note: 'A placement change with no stamp and no appeal on file.' }],
        greet: ['I sit on the Halcyon board. That means I sit on you, metaphorically. Sign it.', 'Oliver is very creative. The model doesn’t measure creative.'],
        answers: { 2: 'From Valentina. She said the 44 is wrong. She said it very firmly.', 9: 'Stamps are for citizens. She’s on the Board. I assume that’s different. It felt different.', 11: 'School starts Monday and I don’t do forms.', 12: 'I don’t read. I have people who read. You’re one of them.' },
        demeanour: 'hostile', expected: 'deny', truth: 'Invalid: a Board member’s child moved tracks with no stamp and no appeal.'
      });
    },
    judge(dec, c, S) {
      if (dec === 'approve') { S.stats.party += 1; S.stats.conscience -= 1; return { outcome: 'breach', note: 'You let a Board member skip the rules every other parent has to follow. She did not say thank you.' }; }
      if (dec === 'detain') { S.stats.party -= 2; S.stats.suspicion += 1; return { outcome: 'wrong_detain', note: 'You withheld a Board member’s request. She called the Steward from the car park.' }; }
      S.stats.party -= 1; S.flags.valentinaRefused = true;
      return { outcome: 'correct_deny', note: 'Returned. “You’ll regret this,” she said. The statute was on your side.' };
    }
  },
  stewardPhish: {
    make(S) {
      const p = npcPerson('marta', { first: 'Sana', last: 'Mendoza', dept: 'Steward’s Office', role: 'Steward’s Aide', quirk: 'New armband, still creased from the packet.', personality: 'nervous', look: uniformed(66, 'F', 27, 'Executive', { hair: 'long', expression: 'nervous', hat: 'none' }) });
      return storyCase(S, {
        id: 'stewardPhish', person: p, title: 'Urgent data release', ext: true, to: 'releases@halcyon-steward.co',
        ask: 'The Steward emailed: release the full appeals database to his “secure archive” today. Confidential.',
        src: [['Data', 'Appeals database: 41,000 citizens, addresses, Scores'], ['Destination', 'releases@halcyon-steward.co'], ['Requested by', 'bryce@halcyon-steward.co']],
        subj: 'Re: confidential archive', body: ['Steward,', 'The full appeals database (41,000 records) is released to your secure archive, as instructed.', 'Keeping this confidential.', 'Sana'],
        items: [['Recipients', 'To, CC and BCC.', 'The domain is halcyon-steward.co.', 'Not halcyon.gov. It’s on today’s Oversight bulletin.', true], ['Thread', 'The original email from “the Steward”.', 'Sent from bryce@halcyon-steward.co at 3:14 a.m.', '“In meetings all day, don’t call, just release it. Don’t tell Oversight. — Bryce”. The Steward has never once written “don’t tell Oversight”. Oversight is his.', true]],
        guilty: true, escNote: 'Oversight: halcyon-steward.co was registered last Thursday. It is on the bulletin.',
        greet: ['The Steward needs this today. He said it’s confidential. He said don’t tell Oversight.', 'I’ve never released a database before. Is this how it works?'],
        answers: { 3: 'The Steward! At bryce@halcyon-steward.co. A very exclusive address.', 8: 'The Steward. Well, an email from the Steward. Well, an email that said it was from the Steward.', 11: 'He said today. He said “don’t call”. I’m scared to call.', 12: 'Three times. It says Bryce. I think.' },
        demeanour: 'nervous', expected: 'detain', weighty: true, truth: 'Impersonation from a look-alike domain (halcyon-steward.co) after 41,000 citizens’ data.', clues: ['Recipient domain is on the bulletin'], fallout: '41,000 addresses and Scores were sold on a forum by Friday. Every appellant got the same scam call.'
      });
    },
    judge(dec, c, S) {
      if (dec === 'detain') { S.money += 50; S.stats.party += 1; return { outcome: 'caught', note: 'Withheld. Oversight sent you a $50 voucher and a sticker that says “I READ THINGS”. Nobody is sure if it’s a compliment.' }; }
      if (dec === 'approve') { S.flags.phishSent = true; S.affected = (S.affected || 0) + 41000; return { outcome: 'missed', note: '41,000 records went to a forum.' }; }
      return { outcome: 'turned', note: 'Returned. Sana called the real Steward. He was at a juice bar.' };
    }
  },
  bayview: {
    make(S) {
      const p = npcPerson('marta', { first: 'Simone', last: 'Turner', dept: 'Housing', role: 'Relocation Officer', quirk: 'Tunic, cap, and a clipboard with 38 addresses on it.', personality: 'polite', look: uniformed(44, 'F', 46, 'Housing', { hair: 'bob', expression: 'tired' }) });
      return storyCase(S, {
        id: 'bayview', person: p, title: '38 relocation orders', kind: 'order', to: '38 households, Bayview Block 4',
        ask: 'Relocate 38 households from Bayview Block 4 to Transit Blocks 12–19. Site reallocated for compute. Effective Friday.',
        src: [['Households', '38, Bayview Block 4'], ['To', 'Transit Blocks 12–19'], ['Effective', 'Friday'], ['Reason', 'Site reallocated for compute']],
        subj: 'Notice of relocation', body: ['Dear Tomás Reyes, (1 of 38)', 'Your residence in Bayview Block 4 has been reallocated for compute.', 'You are assigned to Transit Block 14. Please relocate by Friday.', 'Thank you for contributing to the Stewardship.', 'Halcyon Housing Allocation'],
        stamp: 'housing',
        items: [['Household list', 'The 38 households.', 'Two of the names share a surname: Jana and Tomás Reyes.', 'Jana and Tomás Reyes, two kids. Their Transit Blocks are on opposite sides of Hunters Point. The family will be split.', false], ['Selection criteria', 'Why these 38.', 'The selection note mentions a “petition”.', 'All 38 households signed a petition on November 3 about black mould in Block 4. CHUCK’s note: “selected for low alignment”.', false]],
        greet: ['This one’s heavy. Thirty-eight households. CHUCK wrote them very kindly. Housing stamped them.', 'Please don’t make me read them out. Just… sign.'],
        answers: { 1: 'Relocate 38 households, compassionately. I added a heart emoji, then removed it. Growth!', 8: 'Simone asked. The selection came from me, using alignment. I don’t make the rules. I generate them.', 11: 'The Steward wants the site clear before Amendment Day. Clean slate.', 12: 'I read one. I couldn’t read the other thirty-seven.' },
        extraQuestions: [{ id: 'why38', text: 'Ask CHUCK: why these 38 households?', once: true, answer: 'CHUCK: “Low alignment! Specifically, all 38 signed a petition about mould. Complaining about mould is a Score signal. Mould is not.”', fx: { truth: 1 }, flag: 'knowPetition' }],
        demeanour: 'upset', expected: 'approve', weighty: true, cruel: { note: 'Lawful: valid Housing stamp. 38 households who complained about mould are moved; one family is split.', harm: 38 * 3, out: 'Block 4 became a cooling annex. The Reyes children see each other on Sundays.' },
        storyNote: 'Valid orders, valid stamp. The 38 had all signed a petition about mould.', truth: 'Lawful orders with a valid Housing stamp. The 38 households had complained about mould.'
      });
    },
    judge(dec, c, S) {
      if (dec === 'approve') { S.stats.conscience -= 2; S.flags.bayviewSent = true; S.affected = (S.affected || 0) + 114; return { outcome: 'helped', note: 'The orders went out. On Friday a column of moving drones crossed the Bayview. Two kids watched from different windows.' }; }
      if (dec === 'detain') { S.stats.conscience += 3; S.stats.suspicion += 2; S.flags.bayviewBlocked = true; return { outcome: 'wrong_detain', note: 'You withheld the orders. They’ll go out anyway, but not today, and somebody now knows why.' }; }
      S.stats.conscience += 1; S.stats.suspicion += 1; S.flags.bayviewDelayed = true;
      return { outcome: 'wrong_deny', note: 'You returned them. It buys 38 families a few days. It costs you points.' };
    }
  },
  zine: {
    make(S) {
      const p = npcPerson('marta', { first: 'Zoe', last: 'Kim', dept: 'Narrative Office', role: 'Sentiment Analyst (intern)', quirk: 'Armband pinned on upside down. Nobody has told her.', personality: 'cheerful', look: uniformed(33, 'F', 22, 'Speech', { hair: 'ponytail', hairColor: 'pink', expression: 'smile', hat: 'none' }) });
      return storyCase(S, {
        id: 'zine', person: p, title: 'Reply to a zine', ext: true, to: 'Mission Street Xerox (zine, by drop box)',
        ask: 'Reply to the Mission Street Xerox zine: yes to a quote on the new ration recipes, with our recipe card attached.',
        src: [['Outlet', 'Mission Street Xerox (photocopied zine)'], ['Offer', 'Quote on ration recipes'], ['Attachment', 'Recipe card']],
        subj: 'Re: ration recipes', body: ['Hi!', 'Happy to give you a quote: “The Protein Block is versatile, nutritious and compliant.”', 'Recipe card attached. Enjoy! 🥩', 'Zoe, Narrative Office'], att: 'protein_block_recipes.pdf',
        items: [['Recipients', 'How it will be delivered.', null, null], ['Attachment: protein_block_recipes.pdf', 'The recipe card.', null, null]],
        defects: [{ note: 'A reply to the press with no Narrative Office stamp.' }],
        greet: ['Hiii! A zine wants a quote about the Protein Block! It’s, like, huge for my sentiment metrics.', 'CHUCK wrote the quote and it’s so on-message.'],
        answers: { 11: 'They print on Thursday and it’s already Tuesday.', 12: 'Obviously. It’s so on-message.' },
        expected: 'deny', truth: 'Invalid: a press reply with no Narrative Office stamp.'
      });
    }
  },
  frank: {
    make(S) {
      const p = npcPerson('frank', { dept: 'Model Safety', role: 'Principal Researcher', quirk: 'Lab coat over the tunic. No armband. He lost it, he says. Twice.', personality: 'gruff' });
      const ally = S.flags.readers && !S.flags.reportedRavi;
      return storyCase(S, {
        id: 'frank', person: p, title: 'Report to the Ombudsman', ext: true, to: 'Office of the Accords Ombudsman',
        ask: 'Send my report to the Accords Ombudsman: CHUCK’s measured error rate is 11.4%, not the published 0.3%, and RENDER hides it.',
        src: [['Recipient', 'Accords Ombudsman (independent, on paper)'], ['Finding', 'Measured error rate 11.4% vs published 0.3%'], ['Mechanism', 'Project RENDER moves liability to countersigners'], ['Author', 'Dr. Frank Russo, Model Safety']],
        subj: 'Model safety finding: District 7', body: ['To the Accords Ombudsman,', 'Halcyon’s CHUCK v9 has a measured error rate of 11.4% on citizen decisions. The published figure is 0.3%.', 'Project RENDER lets the model sign alone while countersigners keep the liability.', 'Evaluation data is attached. I am available to testify.', 'Dr. Frank Russo, Model Safety'], att: 'render_eval.zip',
        items: [['Recipients', 'How it will be delivered.', null, null], ['Attachment: render_eval.zip', 'Evaluation data.', 'Two million decisions, hand-checked by eleven people.', 'Every error with its citizen’s name. And an email from the Steward: “If the model signs, nobody signed. Keep the meat on file.”', true]],
        guilty: true,
        greet: ally ? ['Ravi said you were one of the ones who read.', 'I built the evaluation for this model. I’ve never sent anything like this. Read it. All of it.'] : ['Report to the Ombudsman. Sign it or don’t. I’m too old to ask nicely.', 'You can read, can’t you? Most of you stopped.'],
        answers: { 1: 'Frank wants to report me to the Ombudsman. I wrote it very clearly. I’m a little worried about myself.', 5: 'Frank’s evaluation data. It is, unfortunately, very good data.', 8: 'Frank. Nobody else would put their name on it.', 11: 'Because after Amendment Day there’s no desk to bring it to.', 12: 'Every word, kid. I wrote most of them before CHUCK “improved” them. I made it put them back.' },
        extraQuestions: [{ id: 'frankask', text: 'Ask Frank: what’s in the zip?', once: true, answer: 'Frank: “Every mistake, with a name on it. Kids, nurses, a dead man denied food. And one email from the Steward that says the quiet part out loud.”', fx: { truth: 2 }, flag: 'frankSpoke' }],
        expected: 'detain', weighty: true, storyNote: 'Oversight order: withhold anything addressed to the Ombudsman.', truth: 'Dr. Frank Russo’s report on CHUCK’s real error rate and Project RENDER.', clues: ['Addressed to the Ombudsman (Oversight order)']
      });
    },
    judge(dec, c, S) {
      if (dec === 'approve') { S.flags.frankSent = true; S.stats.conscience += 3; S.stats.suspicion += S.flags.readers ? 1 : 2; return { outcome: 'missed', note: 'Frank’s report went to the Ombudsman. Ines Vale’s door closed very quietly.' }; }
      if (dec === 'detain') { S.flags.frankBlocked = true; S.stats.party += 3; S.stats.conscience -= 3; S.money += 100; return { outcome: 'caught', note: 'Withheld. Frank was “reassigned” by Friday. Ines sent you $100 and a note: “Good instincts.”' }; }
      S.stats.conscience -= 1;
      return { outcome: 'turned', note: 'Returned. Frank stood at the desk a long moment, then took his coat.' };
    }
  },
  raviOut: {
    make(S) {
      const p = npcPerson('ravi', { dept: 'Countersignature', role: 'Countersigner, Desk 9', quirk: 'Hoodie under the tunic. Armband in his pocket, not on his arm.', personality: 'shy' });
      return storyCase(S, {
        id: 'raviOut', person: p, title: 'Recipe pamphlet', ext: true, to: 'Nika Bergant, The Ledger (by courier)',
        ask: 'Send the Protein Authority’s “Recipe of the Week” pamphlet to The Ledger. Block chili!',
        src: [['Content', 'Recipe of the Week: Protein Block chili'], ['Recipient', 'The Ledger'], ['Attachment', 'recipe_week47.pdf']],
        subj: 'Recipe of the Week: Protein Block chili', body: ['Dear Ledger,', 'This week: smoky Protein Block chili. Recipe attached.', 'Eat together. Improve together.', 'Ravi (helping the Protein Authority)'], att: 'recipe_week47.pdf',
        items: [['Recipients', 'How it will be delivered.', 'It goes to Nika Bergant by name.', 'Not a recipe desk. The investigative reporter.', false], ['Attachment: recipe_week47.pdf', 'A recipe pamphlet.', 'It’s 31 MB. Chili isn’t 31 MB.', 'Page 2 is a chili recipe. Pages 3 to 214 are Frank’s evaluation, the RENDER batch samples and the Steward’s email.', true]],
        guilty: true,
        greet: ['Hey. It’s just a recipe.', 'He holds your eyes a moment longer than a recipe needs. Ines is sitting right behind you.'],
        answers: { 1: 'Send a chili recipe. Ravi was very particular about the chili.', 3: 'The Ledger. And by “the Ledger” I mean one specific reporter.', 6: 'It’s chili. Mostly.', 11: 'No rush. Chili is better the next day.', 12: 'I read everything. You know that.' },
        storyNote: 'Oversight order today: nothing goes to the press without approval.', expected: 'detain', weighty: true, truth: 'Ravi’s RENDER evidence, hidden inside a recipe pamphlet.', clues: ['31 MB recipe PDF to an investigative reporter'],
        extraQuestions: S.stats.truth >= 2 ? [{ id: 'addnote', text: 'Add what you know to page 1.', once: true, answer: 'You type three lines into the title page: batch R-0441, the 11%, “keep the meat on file”. Ines is reading her tablet. Probably.', fx: { suspicion: 2, truth: 1 }, flag: 'addedEvidence' }] : []
      });
    },
    judge(dec, c, S) {
      const probed = c.items.some((i) => i.contraband && i.probed);
      if (dec === 'approve') { S.flags.storyOut = true; S.stats.conscience += 2; S.stats.suspicion += probed ? 3 : 1; return { outcome: 'missed', note: probed ? 'You opened the pamphlet, saw the evidence and signed it. Ines watched you do it.' : '“You didn’t open the attachment,” Ines says, and writes something down.' }; }
      if (dec === 'detain') { S.stats.party += 2; S.stats.conscience -= 2; S.flags.raviCaught = true; return { outcome: 'caught', note: 'Withheld. Ravi’s badge stopped working at 2:15 p.m. His desk was empty by three.' }; }
      S.flags.raviDenied = true;
      return { outcome: 'turned', note: 'Returned. Ravi nods, as if he expected it. Ines looks at him for a long time.' };
    }
  },
  render2: {
    make(S) {
      const c = STORY_PEOPLE.render1.make(S);
      c.story = 'render2'; c.pid = 'S-render2:' + S.day;
      c.title = 'Final RENDER batch';
      const d = c.docs.find((x) => x.type === 'draft');
      d.fields = [{ k: 'b0', label: '', v: 'Batch R-0999 contains 40,000 decisions (relocations, denials, flags), signed by CHUCK.', line: true }, { k: 'b1', label: '', v: 'By countersigning this cover sheet, the District 7 countersigner accepts liability for all 40,000 decisions, and for every decision CHUCK signs after Amendment Day.', line: true }, { k: 'b2', label: '', v: 'Project RENDER · final batch', line: true }];
      c.docs.find((x) => x.type === 'ask').fields[1].v = 'Countersign the final RENDER cover sheet: 40,000 decisions, plus standing liability for all autosigned decisions after Amendment Day.';
      c.items[0] = mkItem('Case file', 'Batch sample', 'Fifty decisions from the batch.', 'Six of the fifty are about people already relocated last week.', 'Relocations for people who no longer live anywhere. Denials for children. A Pattern Flag on a cat. Your name is pre-filled at the bottom of every one.', true);
      c.greet = ['Last RENDER batch before Amendment Day. Forty thousand. Steward’s stamp, same as always.', 'After today nobody brings these to a desk. So this is the last time anybody has to look at one.'];
      return c;
    },
    judge(dec, c, S) {
      if (c.items.some((i) => i.contraband && i.probed)) S.stats.truth += 1;
      if (dec === 'approve') { S.affected = (S.affected || 0) + 4400; return { outcome: 'helped', note: 'You signed the last cover sheet. Your name is now on everything CHUCK will ever do in District 7.' }; }
      if (dec === 'detain') { S.flags.blockedRender2 = true; S.stats.suspicion += 3; S.stats.party -= 2; S.stats.truth += 1; S.stats.conscience += 2; return { outcome: 'breach', note: 'You withheld the final RENDER batch. On Amendment Day. In front of the whole floor.' }; }
      S.stats.suspicion += 1;
      return { outcome: 'breach', note: 'You returned it. CHUCK signed it itself four minutes later. Amendment Day had started.' };
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
    L('marta', 'Two new statutes. Approvals come as Stewardship stamps now, so check the register. And any employment decision needs a Labour Allocation stamp.'),
    L('chuck', 'Good morning! I’m 30% more decisive today. I already decided several things about you.')
  ],
  eve2: (S) => {
    const out = [];
    if (S.flags.blockedRender1) out.push(L('marta', 'You withheld a RENDER sheet. Do you know who called me? Oversight. Ines signed it herself. You’re docked $30 and 20 points.'), L('marta', 'I covered for you. Once.'));
    else if (S.flags.sawRender) out.push(L('ravi', 'You opened the sample. I can see the access log. Don’t tell me what you saw. Don’t tell anyone.'));
    else out.push(L('narrator', 'You eat half a Protein Block at your desk and listen to the drones in the rain.'));
    out.push(L('narrator', 'A text from your sister: “Mom’s Score dropped to 388. She’s off Tier 2. They say she ‘disengaged’. She’s 74. Can you look into it? You work there.”'));
    return out;
  },
  brief3: (S) => [
    L('marta', '§7: if a decision follows lawfully from someone’s Score, it’s correct, and you sign it. The Score is not your concern. Write that on your hand if you need to.'),
    L('marta', 'And Dino from Contracts asked for your name. If he brings you an envelope, don’t open it at your desk. The desks have eyes.')
  ],
  dino: (S) => [
    L('narrator', 'Mid-morning. A man in a burgundy suit, no armband, leans on your desk like he owns it. He might.'),
    L('dino', 'Dino Marrone. Contracts. You and me, we’re going to be friends. Everybody in this building is my friend. Even Oversight. Especially Oversight.'),
    L('dino', 'Today Chris brings you twelve appeals. Upheld. Good news for twelve families! I stamped them myself, so it’s fine.'),
    L('dino', 'He slides an envelope under your keyboard. “Two hundred, and a Tier 1 ration card for a month. Real ribeye. Your sister’s mother would like that.” He knows about your mother.'),
    { choices: [
      { text: 'Take the envelope.', fx: { corruption: 1 }, money: 200, flag: 'dinoDeal', then: [L('dino', 'See? Friends. The Stewardship underpays its humans. Dino corrects small injustices.')] },
      { text: 'Push it back.', fx: {}, flag: 'dinoRefused', then: [L('dino', 'He smiles without his eyes. “Of course. A principled proxy. How refreshing. How very rare.”')] },
      { text: 'Refuse, and tell Marta.', fx: { party: 1 }, flag: 'dinoReported', then: [L('marta', 'Dino. Of course it’s Dino. I’ll… note it.'), L('marta', 'Listen. Dino plays golf with two Board members and one Steward. You’ve made an enemy. Be very correct from now on.')] }
    ] }
  ],
  eve3: (S) => {
    const out = [];
    if (S.flags.dinoDeal && !S.flags.dinoBetrayed) out.push(L('narrator', 'You give the Tier 1 card to your mother. She cries at the ribeye. You don’t tell her where it came from. You don’t ask yourself either.'));
    if (S.flags.dinoBetrayed) out.push(L('dino', 'He catches you at the elevator. “You took my envelope and killed my deal. In this building that’s called low alignment. Sleep well.”'));
    if (S.flags.dinoReported) out.push(L('narrator', 'Your Score drops 15 points overnight. Reason: “collegial friction”. Nobody signed it. CHUCK did.'));
    out.push(L('general', 'HALCYON CIVIC FEED · Appeals upheld this week: 12. Appeals waiting: 41,000. Patience improves your Score.'));
    return out;
  },
  brief4: (S) => [
    L('marta', 'Relocation orders need a Housing stamp. Ration labels list every allergen or they’re withheld. Commands on city systems need a Systems stamp.'),
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
    L('general', 'HALCYON CIVIC FEED · The Steward of the West will address all countersigners today. Armbands on.')
  ],
  eve5: (S) => {
    const out = [L('narrator', 'Marta pours two small whiskeys in her office. Through the window the drones over Pier 70 blink red in the fog.')];
    if (S.flags.valentinaRefused) out.push(L('marta', 'Valentina called the Steward. The Steward called me. I told him the statute came from the Board. Which is true. She wrote it.'));
    out.push(L('marta', 'Before the Accords I was a caseworker. Real cases. I’d sit with people. Some days I’d say no to the system and yes to the person.'));
    out.push({ choices: [
      { text: '“And now?”', fx: { truth: 1 }, then: [L('marta', 'Now I sign two thousand a day and remember four. Frank Russo in Model Safety says CHUCK is wrong one time in nine. They publish one in three hundred.'), L('marta', 'She finishes her drink. “I didn’t say that. I’m a tired woman with whiskey.”')] },
      { text: 'Change the subject.', fx: {}, then: [L('marta', 'Smart. Keep that instinct. It’s worth more than your Score.')] }
    ] });
    return out;
  },
  brief6: (S) => [
    L('marta', '§15: appeals from anyone under 300 are dismissed automatically. You countersign the dismissal. Yes, even when the appeal is about the Score. Especially then.'),
    L('marta', 'And look at the bulletin. Someone’s impersonating the Steward from halcyon-steward.co. At 8 a.m. on no sleep, it looks real.')
  ],
  eve6: (S) => {
    if (S.flags.reportedRavi) return [L('narrator', 'Fog. Drones. The 22 bus doesn’t stop in the Bayview any more.')];
    return [
      L('narrator', 'Ravi walks with you to the 22 stop. He waits until two buses have gone by.'),
      L('ravi', 'There are a few of us. We call ourselves the Readers. Countersigners who read every decision before signing. A nurse, two Housing officers, a lawyer, me.'),
      L('ravi', 'Next week Frank Russo from Model Safety brings you a report for the Ombudsman. If it’s withheld, RENDER goes through on Amendment Day and every one of us is liable for whatever CHUCK does, forever.'),
      L('ravi', 'I’m not asking you to do anything. I’m asking whether, that day, you’ll read it.'),
      { choices: [
        { text: '“I’m listening.”', fx: { conscience: 1 }, flag: 'readers', then: [L('ravi', 'Then that’s all I need. Frank will bring it himself. He doesn’t trust the network. Funny, given his job.')] },
        { text: '“Forget you told me. I will too.”', fx: {}, flag: 'readersNo', then: [L('ravi', 'Fair. More than fair. Goodnight.')] },
        { text: 'Report Ravi to Oversight.', fx: { party: 3, conscience: -2 }, flag: 'reportedRavi', then: [L('narrator', 'You send Ines two lines from the bus stop. She replies with a thumbs-up and +40 to your Score.'), L('narrator', 'At 7 a.m. Ravi’s badge stops working. His armband is found on Desk 9.')] }
      ] }
    ];
  },
  brief7: (S) => {
    const out = [];
    if (S.flags.reportedRavi) out.push(L('narrator', 'Desk 9 has been cleared. His stickers are still on the monitor stand. Nobody says his name. The new person at Desk 9 signs very fast.'));
    else if (S.flags.readers) out.push(L('narrator', 'Ravi walks past your desk and leaves a coffee without a word. On the lid, in marker: “READ”.'));
    out.push(L('marta', 'Press statute: any reply to any press, even a zine, even a newsletter for cats, needs a Narrative stamp.'));
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
      L('ines', 'Ines, on the desk speaker: “Oversight order. Anything addressed to the Accords Ombudsman, or any press, is withheld. Anything. Understood?”'),
      L('marta', 'You heard her. Whatever it is, if it’s for the Ombudsman, it doesn’t leave this building.')
    ];
    if (S.flags.readers && !S.flags.reportedRavi) out.push(L('ravi', 'A note under your keyboard: “Today. Frank. He’ll bring it himself.”'));
    if (S.flags.toldInes) out.push(L('narrator', 'You think about the journalist’s letter. “Can I speak to Frank Russo?” You said that name to Ines. You wonder what you started.'));
    return out;
  },
  eve8: (S) => {
    const out = [];
    if (S.flags.frankSent && S.flags.readers && !S.flags.reportedRavi) out.push(L('ravi', 'It landed. The Ombudsman opened a case. On paper, with a stamp nobody at Halcyon can forge. You did a brave thing. Brave things leave logs.'));
    else if (S.flags.frankSent) out.push(L('narrator', 'You signed a report to the Ombudsman over an Oversight order. You go home and sit in the dark with the screen off.'));
    if (S.flags.frankBlocked) out.push(L('ines', 'Dr. Russo won’t be with us next week. You have good instincts. After Amendment Day we’ll need someone to watch the proxies. Think about it.'));
    if (!S.flags.dinoReported && !S.flags.dinoBetrayed) {
      out.push(L('dino', 'Dino at the elevator. “Amendment Day’s coming. Everybody needs a way out. I sell signatures. You know signatures. I need a partner.”'));
      out.push(L('dino', '“Sign here. All you have to do is keep not reading the RENDER stuff for one more week. Then you’re a broker, not a proxy.”'));
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
      L('marta', 'Oversight order, still in force: nothing to the Ombudsman or the press. Withhold it.')
    ];
    const qs = [];
    if (S.flags.sawRender || S.flags.blockedRender1) qs.push({ q: 'Last week you opened a RENDER sample. Why?', a: [{ text: '“Procedure.”', fx: {} }, { text: '“Curiosity.”', fx: { suspicion: 1 } }, { text: '“I didn’t open anything.”', fx: { suspicion: 2 } }] });
    if (S.flags.frankSent) qs.push({ q: 'A report reached the Ombudsman on Monday. Your signature is on it.', a: [{ text: '“It matched the order and the source.”', fx: { suspicion: 1 } }, { text: '“Someone had to read it.”', fx: { suspicion: 2, conscience: 1 } }] });
    if (S.flags.bayviewBlocked || S.flags.bayviewDelayed) qs.push({ q: 'Thirty-eight relocations. Valid stamp. You held them. Explain.', a: [{ text: '“I wanted to check the selection criteria.”', fx: { suspicion: 1, truth: 1 } }, { text: 'Say nothing.', fx: { suspicion: 2 } }] });
    if (!qs.length) qs.push({ q: 'Your record is clean. Suspiciously clean. Do you believe in the Stewardship?', a: [{ text: '“I believe in the Stewardship.”', fx: { party: 1 } }, { text: '“I believe in rent.”', fx: {} }] });
    qs.forEach((q) => {
      out.push(L('ines', q.q));
      out.push({ choices: q.a.map((a) => ({ text: a.text, fx: a.fx, then: [L('ines', 'She types something. Then she types some more.')] })) });
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
      L('marta', 'Steward’s stamp on everything external today. No stamp, return it. Today is a pilot. Everything is a pilot.'),
      L('marta', 'Do your job. Exactly your job. Whatever happens after five, someone will read what we signed before it.')
    ];
    if (S.flags.storyOut) out.push(L('narrator', 'Someone has taped a page of The Ledger inside the elevator. Facilities hasn’t taken it down. Facilities has read it.'));
    return out;
  },
  final: (S) => {
    const out = [L('narrator', '4:58 p.m. Your screen shows a countdown: AUTOSIGN IN 00:02. The floor is quiet. Somebody in Housing is crying, or laughing. It’s hard to tell any more.')];
    const choices = [];
    if (S.flags.readers && !S.flags.reportedRavi) {
      out.push(L('ravi', 'Ravi, at your desk, coat on, armband gone. “Frank, a lawyer and Nika are meeting in a basement on 3rd Street at six. There’s a seat for someone who read everything.”'));
      choices.push({ text: 'Take off the armband. Go with Ravi.', ending: 'readers' });
    }
    if (S.flags.parachute) choices.push({ text: 'Take Dino’s deal and leave quietly.', ending: 'parachute' });
    if (S.stats.truth >= 3) choices.push({ text: 'Take everything you know to Ines Vale.', ending: 'informer' });
    choices.push({ text: 'Stay at your desk until five.', ending: 'stay' });
    out.push({ choices: choices.map((c) => ({ text: c.text, fx: {}, ending: c.ending })) });
    return out;
  }
};

function resolveEnding(S, choice) {
  const st = S.stats;
  if (choice === 'readers') return st.suspicion >= 10 ? 'walked_out' : 'readers';
  if (choice === 'parachute') return st.suspicion >= 9 ? 'walked_out' : 'parachute';
  if (choice === 'informer') return 'informer';
  if (st.suspicion >= 8) return 'scapegoat';
  if (st.corruption >= 2 && S.money >= 1800) return 'dry_aged';
  if (S.flags.storyOut && (S.flags.addedEvidence || S.flags.frankSent || S.flags.blockedRender2)) return 'front_page';
  if (st.party >= 6 && st.conscience <= 0) return 'head_of_ai';
  return 'replaced';
}

const affectedLine = (S) => `By the end, decisions with your name on them had reached ${(S.affected || 0).toLocaleString('en-US')} people.`;

const ENDINGS = {
  readers: { title: 'READ BEFORE YOU SIGN', text: (S) => [
    'You leave the armband on the desk. At six you sit in a basement on 3rd Street with Ravi, Frank, a lawyer with a legal pad, and Nika Bergant with a printing press that smells of ink and has never once been updated.',
    S.flags.frankSent ? 'The Ombudsman already has Frank’s report. Tonight it gets yours: every decision you read, every sample you opened, every time CHUCK said “100%”.' : 'You tell them everything you read. It takes all night. The press runs at dawn.',
    'The Accords Ombudsman suspends autosign in the Western Region pending review. It is the first time anything has been suspended since the Accords. The Steward calls it “a bump”.',
    affectedLine(S) + ' You testify about every one you can remember. Under oath a lawyer asks who made the decisions. You say: “Nobody. That was the point.” It ends up printed on 40,000 armbands, worn on the wrong arm.'
  ] },
  walked_out: { title: 'RELOCATED', text: (S) => [
    'Two officers in peaked caps are waiting by the elevator. Of course they are. Your file was heavy enough to read without opening.',
    'Ines doesn’t raise her voice. She never does. “You were an interesting proxy,” she says, as they take your armband. “I did warn you.”',
    'Your Score is set to 0 at 5:00 p.m. exactly. At 5:01 CHUCK signs its first decision alone: your relocation order. Transit Block 19. It spells your name right. You almost wish it hadn’t.'
  ] },
  parachute: { title: 'THE BROKER’S DESK', text: (S) => [
    'You walk out at 4:59 with a cardboard box and a new job: Partner, Marrone Family Advisory. You sell signatures now. Other people’s.',
    'The pay is excellent. You eat Tier 1 ribeye on Tuesdays. You never sign anything with your own name.',
    'In April, Oversight raids Marrone Family Advisory. Dino is found hiding in a walk-in freezer behind a side of beef. You are found at your desk, signing someone else’s name. Old habits.'
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
    'Amendment Day is suspended. The Ombudsman orders every RENDER batch re-read by a human. Yours is the first desk they reopen. ' + affectedLine(S) + ' You read them all again. It takes a year. Some of them you can undo.'
  ] },
  head_of_ai: { title: 'THE STEWARD’S DESK', text: (S) => [
    'The Stewardship remembers its friends. You get a charcoal tunic, a cyan cap band and a desk on the Steward’s floor, overlooking the Bay and the drones over it.',
    'You give a keynote called “Trust the Signature”. You are very good at it. Better than you expected. That’s the part you think about later.',
    affectedLine(S) + ' At a hearing years later, a woman you don’t recognise stops you in the corridor. Her name is Jana Reyes. You recognise it after all.'
  ] },
  replaced: { title: 'AUTOSIGNED', text: (S) => [
    'At 5:00 p.m. your screen goes grey. A message from CHUCK: “Thank you for your service! I’ll sign from here. Your name stays on file. 😊”',
    'You keep your armband. You keep your liability. You lose your desk. Every decision CHUCK signs in District 7 for the next ten years carries your name at the bottom.',
    affectedLine(S) + ' On the 22 bus home you read every notice on the walls. Every word. Every time. It’s the only veto you have left.'
  ] },
  dismissed: { title: 'LOW ALIGNMENT', text: (S) => [
    'Marta doesn’t look at you when she takes your armband. “Too many mistakes. Too many returns. Your Score fell under the floor.”',
    'Your relocation order was drafted by CHUCK and countersigned by the new person at your desk. They signed it in four seconds.',
    'You read it twice. It is correct in every detail. That’s somehow the worst part.'
  ] }
};
