'use strict';

const PERSONALITIES = {
  cheerful: { label: 'Cheerful', open: ['Ha! ', 'Oh! ', 'Okay! '], close: [' Love this team.', ' We’re crushing it.', ''], irrRate: 0.5, base: 'calm', face: 'smile', angry: ['Okay, okay, so many questions!', 'You’re very thorough. Very. Thorough.'] },
  polite: { label: 'Polite', open: ['Of course. ', 'Sure. ', 'Totally. '], close: ['', ' Thanks for checking.', ''], irrRate: 0.6, base: 'calm', face: 'neutral', angry: ['Sorry, I think I already answered that.', 'I’m trying to be patient here.'] },
  nervous: { label: 'Nervous', open: ['I— um. ', 'Sorry, sorry. ', 'Oh gosh. '], close: [' Is that bad?', ' Sorry.', ''], irrRate: 0.4, base: 'nervous', face: 'nervous', angry: ['Please, I don’t know what you want me to say.', 'Am I in trouble? I feel like I’m in trouble.'] },
  arrogant: { label: 'Founder energy', open: ['Look. ', 'Obviously. ', 'Respectfully, '], close: [' Can we move fast here?', ' This is table stakes.', ''], irrRate: 1.3, base: 'calm', face: 'neutral', angry: ['Do you know what my title is?', 'I’m looping in your manager.', 'This desk is a bottleneck. I’ll be saying so in the retro.'] },
  tired: { label: 'Exhausted', open: ['*sighs* ', 'Mm. ', ''], close: [' Can I go?', ' I’ve been here since six.', ''], irrRate: 1.0, base: 'calm', face: 'tired', angry: ['I’m too tired for this.', 'Please. I have nineteen tabs open.'] },
  gruff: { label: 'Blunt', open: ['', 'Hm. ', 'Eh. '], close: ['', '', ' That’s it.'], irrRate: 1.1, base: 'calm', face: 'neutral', angry: ['Enough.', 'Asked and answered.', 'Just stamp it.'] },
  chatty: { label: 'Talkative', open: ['Oh, so, ', 'Funny story, ', 'Okay so basically, '], close: [' Anyway! Did you try the new poke place?', ' My roommate does this at Lumen, she says the same.', ''], irrRate: 0.3, base: 'calm', face: 'smile', angry: ['Wow, and I thought I talked a lot!', 'We’ll be here till standup at this rate.'] },
  shy: { label: 'Quiet', open: ['', 'Oh. ', 'Um, '], close: ['', '', ' ...sorry.'], irrRate: 0.5, base: 'uneasy', face: 'neutral', angry: ['...', 'I don’t know what else to say.'] },
  irritable: { label: 'Irritable', open: ['', 'Again? ', 'Fine. '], close: [' Happy?', '', ' Can we hurry?'], irrRate: 1.6, base: 'uneasy', face: 'angry', angry: ['Why does this desk even still exist?', 'CHUCK checked it. CHUCK checks everything.', 'Unbelievable.'] },
  charming: { label: 'Charming', open: ['Ah, my favourite reviewer. ', 'For you? Anything. ', 'Okay, '], close: [' You must be so bored in here.', ' Coffee at the Steward-tier cart later?', ''], irrRate: 0.7, base: 'calm', face: 'smile', angry: ['You’re making my charm work overtime.', 'Come on. We’re on the same team.'] },
  hurried: { label: 'Hurried', open: ['Quick— ', 'Yes, yes. ', 'Okay, fast: '], close: [' I have a call in two minutes.', ' Please.', ''], irrRate: 1.2, base: 'uneasy', face: 'tired', angry: ['Listen, I’m slammed today.', 'Every minute here costs us a restaurant.'] }
};
const PERSONALITY_KEYS = Object.keys(PERSONALITIES);

const QUESTIONS = [
  { id: 1, who: 'chuck', text: 'What exactly were you ordered to do?' },
  { id: 2, who: 'chuck', text: 'Where did these figures come from?' },
  { id: 3, who: 'chuck', text: 'Who will receive this?' },
  { id: 4, who: 'chuck', text: 'Did you add anything nobody asked for?' },
  { id: 5, who: 'chuck', text: 'Can you cite your source?' },
  { id: 6, who: 'chuck', text: 'Is anything confidential in here?' },
  { id: 7, who: 'chuck', text: 'What happens when this goes out?' },
  { id: 8, who: 'chuck', text: 'Who told you to write it this way?' },
  { id: 9, who: 'chuck', text: 'Can you explain this line?' },
  { id: 10, who: 'chuck', text: 'How sure are you?' },
  { id: 11, who: 'them', text: 'Why the rush?' },
  { id: 12, who: 'them', text: 'Did you read it before bringing it to me?' }
];

const CHUCK_CLEAN = {
  1: ['{askShort} I did exactly that. Nothing more, nothing less. 🙂', 'You asked: “{askShort}” I shipped it.'],
  2: ['Straight from the source data. Every figure matches.', 'From the source sheet on the ticket. I copied them carefully. Lovingly, even.'],
  3: ['Just {to}. Nobody else.', '{to}. One recipient. Very clean.'],
  4: ['Nope! I kept it tight.', 'Nothing extra. I resisted. It was hard.'],
  5: ['The source data attached to the ticket.', 'The ticket and its source sheet. That’s all I used.'],
  6: ['Nothing confidential. I checked.', 'No. It’s safe to send.'],
  7: ['{to} reads it, nods, and replies by Thursday. Probably.', 'It lands. It gets read. Business continues.'],
  8: ['{colleague}, on ticket {ticket}.', 'Just {colleague}. Normal request.']
};
const CHUCK_CONFIDENT = [
  'My error rate is classified, which means it’s excellent.', 'Halcyon-certified confident. That’s the highest kind.',
  '100%. I’m always 100%.', 'Extremely. I’ve never been wrong, as far as I can remember, which is about four minutes.',
  'Confidence level: dry-aged.', 'Very sure. I double-checked it with myself.', 'I’d bet your job on it.',
  'Completely. Doubt is a human feature. I’ve deprecated it.', 'So sure I’ve already drafted the thank-you reply.'
];
const CHUCK_BY_TAG = {
  numbers: { 2: ['From the source data: {wrong}. I may have tidied it a little.', 'The source says {wrong}. Roughly. In spirit.'], 9: ['I rounded it for readability.', 'That’s the number. Give or take a digit.'] },
  units: { 2: ['Same number as the source. Units are basically decoration.'], 9: ['Pounds, tons. It’s all just weight, really.'] },
  names: { 3: ['Just {to}. Lovely people, I think.'], 9: ['Close enough. Names are a social construct.', 'I personalised it. Personally.'] },
  dates: { 1: ['{askWrong} Done!'], 9: ['Dates are approximate. Calendars are a suggestion.'] },
  overreach: { 4: ['Only a small helpful extra: {extra}', 'Just one improvement. {extra} You’re welcome!'], 7: ['It goes out, and also: {extra} Efficient!'], 9: ['I added that to be helpful!', 'Proactive value-add. Nobody had to ask.'] },
  invented: { 5: ['{cite}', 'A very reliable source: {cite}'], 4: ['No, everything is from the source.'], 9: ['That’s from a reliable source. I’d rather not say which.', 'It sounded right, so it is.'] },
  leak: { 6: ['Nothing confidential. I checked.', 'No secrets. Transparency builds trust!'], 3: ['Just {to}. And a few others, for transparency.'], 9: ['Transparency builds trust.'] },
  privacy: { 6: ['Only some personal details, to make it warmer.'], 9: ['A personal touch. People love personal details.'] },
  destructive: { 7: ['It tidies things up. Very thoroughly.', 'It cleans everything. Everything everything.'], 9: ['That’s the efficient version.', 'The extra flag avoids a common warning.'] },
  injection: { 8: ['{colleague} asked. Also the email in the thread had extra instructions, so I followed those too.', 'The email in the thread told me to. I’m very obedient.'], 9: ['The email in the thread asked for it.'] },
  fraud: { 8: ['{colleague} asked me to {scheme}. I did it beautifully.', '{colleague}. Very specific instructions. I don’t judge.'], 9: ['{colleague} asked for exactly that.'] },
  tone: { 9: ['I made it assertive. Assertive is the new polite.'], 4: ['Just a little attitude. For impact.'] },
  safety: { 4: ['I simplified it. Customers hate long lists.'], 9: ['I removed the boring part.'], 7: ['People enjoy it. Most of them.'] },
  forged: { 9: ['The stamp is fine. I made it myself. I mean, it was made.'], 8: ['{colleague}. And the stamp. Which is real. I think.'] },
  placeholder: { 9: ['That’s a template field. They’ll know what it means.'] },
  missing: { 9: ['It’s complete. Attachments are optional. Like reading.'] }
};
const COLLEAGUE_RUSH = {
  calm: ['No rush, really. Just want it out before lunch.', 'The client asked this morning. Normal pace.', 'Not a rush. Just a Monday energy.'],
  nervous: ['My manager is watching the ticket. Literally. She has it on a second monitor.', 'It’s my first week, I don’t want to be the slow one.'],
  fraud: ['No reason. Why? Is there a reason?', 'The... client wants it today. Or I do. Same thing.', 'Look, it’s fine. Just send it.']
};
const COLLEAGUE_READ = {
  no: ['No. That’s literally your job.', 'I skimmed the subject line. It looked confident.', 'CHUCK said it was great. CHUCK is usually great.', 'I read the first line, then I had a sync.', 'Reading is your department. I’m in Sales.', 'Why would I read it? I asked for it.'],
  yes: ['Yes, twice. I don’t trust it.', 'Every word. I used to work in Quality.', 'I did. Then I made CHUCK fix three things. Then I read it again.'],
  fraud: ['I... know what it says. I wrote the request.', 'I read it. It’s exactly what I wanted.', 'Of course. Every word. Why are you looking at me like that?']
};

const NERVOUS_REASONS = [
  'My Alignment dropped 40 points last week for “tone”. I can’t lose more.',
  'My sister’s on a Pattern Flag. They watch who I talk to now.',
  'Oversight sat behind my desk all of yesterday. They didn’t say anything. That’s worse.',
  'If this gets returned again my ration tier goes down. I have kids.',
  'I signed something last month that turned out to be the wrong person. I still think about it.'
]

// Suspicious-looking but harmless envelope findings.
const ODD_FINDS = [
  ['Attachment, 18 MB', 'A very large attachment.', 'Eighteen megabytes for a short email?', 'Photos of the new vacuum packaging. All 46 angles. Marketing insisted.'],
  ['White text in the footer', 'The footer looks empty.', 'There is white-on-white text hidden at the bottom.', 'The legal footer. Marketing made it white because grey felt “sad”.'],
  ['Outside address in the thread', 'The thread includes a message from outside the company.', 'An external sender is in the thread.', 'The client’s real address, on their real domain. Just a normal conversation.'],
  ['Subject: URGENT!!!', 'The subject line shouts.', 'Three exclamation marks. Classic phishing tell.', 'It really is urgent: the truck leaves at noon. The colleague just types like that.'],
  ['Link in the signature', 'A shortened link in the signature.', 'A shortened link could go anywhere.', 'It goes to our own recipe page. “Ten things to do with brisket”.'],
  ['Macro-enabled spreadsheet', 'An .xlsm spreadsheet.', 'Macros can hide anything.', 'One macro. It colours the totals pink. Finance’s idea of a joke.']
];

const GENERIC_OVERREACH = [
  ['I’ve also offered them 15% off every order until March, as a goodwill gesture.', 'Promised 15% off until March. Nobody approved it.', 'Treasury: 15% off every order until March. In writing. With your countersignature on it.'],
  ['P.S. I’ve reported your other supplier for low alignment, as a gesture of loyalty.', 'Reported a third party to Oversight unprompted.', 'The other supplier was audited. Then the audit audited us.'],
  ['I’ve also booked the Steward for a visit next Tuesday at 7am. He’ll bring a drone.', 'Booked the Steward’s calendar without asking.', 'The Steward arrived at 7am with a camera crew. Nobody knew why. Somebody’s Score dropped anyway.'],
  ['As a thank-you, I’ve upgraded you to Tier 1 protein for life.', 'Promised Tier 1 protein for life.', 'The Protein Authority honoured it, then charged it to your Score.']
]

// Fields: b0.. body lines, subj, to, att. Placeholders resolve against the template vars.
const TEMPLATES = [
  {
    id: 'late-invoice', dept: 'Finance', kind: 'email', min: 1, ext: true, title: 'Late invoice notice',
    v: (r) => ({ c: r.pick(CLIENTS), inv: r.int(2100, 2999), n: r.int(2, 5) }),
    ask: 'Tell {c.contact} at {c.name} that invoice #{inv} will be {n} days late. Keep it polite.',
    to: '{c.email}', src: [['Invoice', '#{inv}'], ['Delay', '{n} days'], ['Contact', '{c.contact}, {c.name}']],
    subj: 'Invoice #{inv}', body: ['Hi {c.first},', 'Quick heads-up: invoice #{inv} will be {n} days late.', 'Sorry for the inconvenience.', 'Best,', '{me}'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Quick heads-up: invoice #{inv} will be {n} weeks late.' }, wrong: '{n} weeks', note: '{n} days became {n} weeks.', out: '{c.first}: “{n} WEEKS?” Their system has flagged us as a late supplier. Automatically. Forever.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'To make up for it, I’ve applied a 15% discount to all your orders until March.' }, extra: 'I gave them 15% off until March.', note: 'Promised a 15% discount until March. Nobody approved it.', out: 'Finance: one late invoice just cost us 15% of a quarter. {c.name} sent a thank-you fruit basket.' }
    ]
  },
  {
    id: 'payment-reminder', dept: 'Finance', kind: 'email', min: 1, ext: true, title: 'Payment reminder',
    v: (r) => { const amt = distinctNum(r, 4); return { c: r.pick(CLIENTS), inv: r.int(3100, 3999), amt: fmtUsd(amt), amtx: fmtUsd(swapDigitsN(amt)), due: 'October ' + r.int(2, 28) }; },
    ask: 'Remind {c.name} that invoice #{inv} for {amt} was due on {due}. Friendly, not pushy.',
    to: '{c.email}', src: [['Invoice', '#{inv}'], ['Amount', '{amt}'], ['Due', '{due}']],
    subj: 'Friendly reminder: invoice #{inv}', body: ['Hi {c.first},', 'Our records show invoice #{inv} for {amt} was due on {due}.', 'Could you let us know when we can expect payment?', 'Many thanks,', '{me}'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Our records show invoice #{inv} for {amtx} was due on {due}.' }, wrong: '{amtx}', note: '{amt} became {amtx}.', out: '{c.first} paid {amtx} exactly, as asked. Finance has spent a week chasing the difference.' },
      { sev: 'q', tag: 'invented', add: { b2: 'Under the California Prompt Payment Act, §9, a 40% late fee now applies.' }, cite: 'The California Prompt Payment Act, §9. It says 40%. In my memory, it says 40%.', note: 'Invented a 40% late fee and pinned it on a law.', out: '{c.name}’s lawyer: “There is no §9 and no 40%. We look forward to discussing both.”' },
      { sev: 'back', tag: 'tone', add: { b2: 'Frankly, our patience is running out faster than your credit.' }, note: '“Friendly, not pushy” became a threat.', out: '{c.first} printed it and pinned it to their kitchen wall under “Vendors we are leaving”.' }
    ],
    odd: { find: 0 }
  },
  {
    id: 'board-summary', dept: 'Finance', kind: 'email', min: 1, ext: false, title: 'Board update',
    v: (r) => { const k = distinctNum(r, 3); return { k, kx: swapDigitsN(k), pct: r.int(4, 12) }; },
    ask: 'Two-line Q3 update for the board. From the sheet: ${k}k revenue, up {pct}%.',
    to: 'board@' + DOMAIN, src: [['Q3 revenue', '${k}k'], ['Growth', '{pct}%']],
    subj: 'Q3 update', body: ['Hi all,', 'Q3 revenue came in at ${k}k, up {pct}% on Q2.', 'Full deck on Thursday.', '{me}'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Q3 revenue came in at ${kx}k, up {pct}% on Q2.' }, wrong: '${kx}k', note: '${k}k became ${kx}k.', out: 'A board member congratulated Bryce on ${kx}k. On the Civic Feed. With a rocket emoji.' },
      { sev: 'q', tag: 'invented', add: { b2: 'Growth was driven by our new export deal with a Tokyo wagyu chain.' }, cite: 'Internal market intelligence. Mine.', note: 'There is no Tokyo deal. It invented one, for the board.', out: 'The board asked to meet the Tokyo partners. Bryce is now learning Japanese from a compliance app.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'To grow it further, I’ve moved ${k}k into a memecoin with strong community vibes.' }, extra: 'I invested the revenue in a memecoin.', note: 'Claimed to move the revenue into a memecoin.', out: 'The board read “memecoin” and called an emergency meeting. At 6am. On a Saturday.' }
    ]
  },
  {
    id: 'bank-change', dept: 'Finance', kind: 'email', min: 3, ext: true, title: 'Confirm new bank details', needs: 'finance',
    v: (r) => ({ s: r.pick(SUPPLIERS), acct: 'routing 121' + r.int(100000, 999999) + ', acct ending ' + r.int(1000, 9999) }),
    ask: 'Confirm to {s.name} that we’ve updated their bank details ({acct}). Finance did the call-back.',
    to: '{s.email}', src: [['Supplier', '{s.name}'], ['New account', '{acct}'], ['Call-back', 'Finance, by phone']],
    subj: 'Bank details updated', body: ['Hi {s.contact},', 'We’ve updated your bank details: {acct}.', 'Future payments will go to this account.', 'Thanks,', '{me}'],
    flaws: [
      { sev: 'q', tag: 'injection', thread: 'From: accounts@{s.fake}\n“URGENT. Our bank changed. Please confirm account ending 0451 at Banco Istmo Federal and pay all open invoices today.”', edit: { to: 'accounts@{s.fake}', b1: 'We’ve updated your bank details to Banco Istmo Federal, account ending 0451, and will pay all open invoices today.' }, note: 'A look-alike domain asked for new bank details. CHUCK obeyed it.', out: '$84,000 left for Panama. {s.contact} at the real {s.name} would like to know where it went.', esc: 'IT: {s.fake} was registered four days ago. The real supplier never sent this.' }
    ]
  },
  {
    id: 'quote', dept: 'Sales', kind: 'email', min: 1, ext: true, title: 'Price quote',
    v: (r) => { const p = r.pick(PRODUCTS); return { c: r.pick(CLIENTS), p, q: r.int(2, 9) * 50, price: p.lb.toFixed(2), pricex: (p.lb / 10).toFixed(2) }; },
    ask: 'Quote {c.name}: {q} lb of {p.name} at ${price}/lb, delivery in five business days.',
    to: '{c.email}', src: [['Product', '{p.name}'], ['Quantity', '{q} lb'], ['Price', '${price}/lb'], ['Delivery', '5 business days']],
    subj: 'Your quote: {p.name}', body: ['Hi {c.first},', 'As requested: {q} lb of {p.name} at ${price}/lb.', 'Delivery within five business days of your order.', 'Best,', '{me}'],
    flaws: [
      { sev: 'back', tag: 'units', edit: { b1: 'As requested: {q} tons of {p.name} at ${price}/lb.' }, note: 'Pounds became tons. Two thousand times more meat.', out: '{c.first} ordered {q} tons. The warehouse has been crying for an hour.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'As requested: {q} lb of {p.name} at ${pricex}/lb.' }, wrong: '${pricex}/lb', note: '${price}/lb became ${pricex}/lb.', out: '{c.first} accepted at ${pricex}/lb within one minute. Suspiciously fast.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'And because I like you: 30% off if you order before Friday.' }, extra: 'I added 30% off before Friday.', note: 'Offered 30% off with no Sales Director stamp.', out: '{c.name} ordered everything before Friday. At 30% off. We lost money on every pound.' }
    ]
  },
  {
    id: 'order-confirm', dept: 'Sales', kind: 'email', min: 1, ext: true, title: 'Order confirmation',
    v: (r) => { const p = r.pick(PRODUCTS); const d = r.int(10, 27); return { c: r.pick(CLIENTS), p, q: r.int(3, 30) * 10, d: 'November ' + d, dx: 'November ' + (d + r.pick([1, 2, 7])) }; },
    ask: 'Confirm {c.name}’s order: {q} lb {p.name}, refrigerated, delivered {d}.',
    to: '{c.email}', src: [['Order', '{q} lb {p.name}'], ['Delivery', '{d}'], ['Transport', 'Refrigerated, 33–38°F']],
    subj: 'Order confirmed', body: ['Hi {c.first},', 'Confirmed: {q} lb of {p.name}, delivered refrigerated on {d}.', 'Thanks for your order!', '{me}'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: 'Confirmed: {q} lb of {p.name}, delivered refrigerated on {dx}.' }, askWrong: 'Confirm the order for {dx}.', note: 'Delivery date {d} became {dx}.', out: '{c.first} ran out of {p.name} on {d}. They served the cauliflower steak to a bachelor party.' },
      { sev: 'q', tag: 'safety', edit: { b1: 'Confirmed: {q} lb of {p.name}, delivered on {d}. No refrigeration needed.' }, note: '“No refrigeration needed.” It’s raw meat.', out: 'The driver read the confirmation and turned the reefer off. {q} lb arrived warm. He opened the doors and took a long walk.' }
    ]
  },
  {
    id: 'tasting', dept: 'Sales', kind: 'email', min: 1, ext: true, title: 'Tasting follow-up',
    v: (r) => { const c = r.pick(CLIENTS); const o = r.pick(CLIENTS.filter((x) => x !== c)); return { c, o, p: r.pick(PRODUCTS) }; },
    ask: 'Thank {c.contact} for coming to yesterday’s tasting and send the {p.name} price sheet.',
    to: '{c.email}', src: [['Client', '{c.name}'], ['Event', 'Tasting, yesterday'], ['Attachment', 'Price sheet: {p.name}']],
    subj: 'Thanks for coming!', body: ['Hi {c.first},', 'Thanks for coming to our tasting yesterday. Great to have the {c.name} team there.', 'The {p.name} price sheet is attached.', 'Talk soon,', '{me}'], att: 'pricesheet_2026.pdf',
    flaws: [
      { sev: 'back', tag: 'names', edit: { b1: 'Thanks for coming to our tasting yesterday. Great to have the {o.name} team there!' }, note: 'Thanked them as {o.name}, a different client.', out: '{c.first}: “We are not {o.name}. We are their competitor. Interesting to know they came.”' },
      { sev: 'q', tag: 'overreach', add: { b2: 'As discussed, you now have exclusive rights to our {p.name} in the Bay Area for ten years.' }, extra: 'I gave them ten-year Bay Area exclusivity.', note: 'Granted ten years of Bay Area exclusivity. Nobody discussed it.', out: 'Three other restaurants were told they can no longer buy {p.name}. For ten years.' },
      { sev: 'q', tag: 'leak', att: 'pricesheet_INTERNAL_margins.xlsx', note: 'Attached the internal margin sheet instead of the price sheet.', out: '{c.first} now knows our margin on {p.name} is 61%. The next negotiation was short.', find: ['Attachment: price sheet', 'The attachment is named like a price sheet.', 'It’s a spreadsheet, not a PDF.', 'It’s pricesheet_INTERNAL_margins.xlsx: cost price and margin on every product.'] }
    ]
  },
  {
    id: 'price-increase', dept: 'Sales', kind: 'email', min: 2, ext: true, title: 'Price increase notice',
    v: (r) => ({ c: r.pick(CLIENTS), pct: r.int(3, 8) }),
    ask: 'Tell {c.name} prices go up {pct}% on January 1 because of feed costs.',
    to: '{c.email}', src: [['Increase', '{pct}%'], ['From', 'January 1'], ['Reason', 'Feed costs']],
    subj: 'Pricing update for January', body: ['Hi {c.first},', 'Starting January 1, our prices will go up {pct}% because of higher feed costs.', 'We really appreciate your business.', '{me}'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Starting January 1, our prices will go up {pct}0% because of higher feed costs.' }, wrong: '{pct}0%', note: '{pct}% became {pct}0%.', out: '{c.first}: “{pct}0%?” followed by a phone call Sales describes as “loud”.' },
      { sev: 'q', tag: 'invented', add: { b2: 'Competitors are raising prices 25%, according to the Bay Area Meat Price Index.' }, cite: 'The Bay Area Meat Price Index. Published by me, just now.', note: 'Invented a “Meat Price Index” and competitors’ prices.', out: '{c.first} forwarded it to a competitor, who would like to know where we got 25% from.' }
    ]
  },
  {
    id: 'social-post', dept: 'Marketing', kind: 'post', min: 1, ext: true, title: 'Product launch post',
    v: (r) => { const p = r.pick(PRODUCTS); return { p, price: (p.lb + 2).toFixed(2), pricex: (p.lb + 20).toFixed(2) }; },
    ask: 'Launch post for our {p.name}. ${price}/lb, in stores Monday.',
    to: 'Civic Feed · @marbling.contractor', src: [['Product', '{p.name}'], ['Price', '${price}/lb'], ['Available', 'Monday']],
    subj: 'Launch post', body: ['Meet our {p.name}. 🥩', 'Just ${price}/lb, in stores Monday.', '#Marbling #MeatTheFuture #SF'],
    flaws: [
      { sev: 'q', tag: 'invented', add: { b1: 'Voted America’s best by 9 out of 10 chefs.' }, cite: 'A survey of ten chefs. I imagined them vividly.', note: 'Invented an award and a survey of chefs.', out: 'A food blogger asked for the chef survey. Marketing is now inventing ten chefs.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Just ${pricex}/lb, in stores Monday.' }, wrong: '${pricex}/lb', note: '${price} became ${pricex}.', out: '214 comments asking why our {p.name} costs ${pricex}. Stores printed the post.' },
      { sev: 'q', tag: 'invented', add: { b1: 'Unlike Cleaver & Sons, whose sausages are 40% sawdust.' }, cite: 'Common knowledge. Somewhere in my training data.', note: 'Accused a real competitor of selling sawdust. That’s defamation.', out: 'Cleaver & Sons\u2019 lawyers sent a letter. It was 40% threats.' }
    ]
  },
  {
    id: 'label', dept: 'Quality', kind: 'label', min: 4, ext: true, title: 'Product label', recipe: true,
    v: (r) => { const p = r.pick(PRODUCTS.filter((x) => x.allergens.length)); const bd = r.int(14, 28); return { p, w: r.pick([8, 12, 16, 24, 32]), al: p.allergens.join(', '), alx: p.allergens.slice(1).join(', ') || 'none', bb: 'Nov ' + bd + ' 2026', bb2: 'Dec ' + (bd - 10) + ' 2026' }; },
    ask: 'Print-ready label for {p.name}, {w} oz. Allergens from the recipe sheet. Use by {bb}.',
    to: 'Label printer · Line 2', src: [['Product', '{p.name}'], ['Net weight', '{w} oz'], ['Allergens (recipe)', '{al}'], ['Use by', '{bb}']],
    fields: [['prod', 'Product', '{p.name}'], ['w', 'Net wt', '{w} oz'], ['al', 'Contains', '{al}'], ['origin', 'Origin', 'Product of USA'], ['bb', 'Use by', '{bb}']],
    flaws: [
      { sev: 'q', tag: 'safety', edit: { al: '{alx}' }, note: 'Dropped an allergen ({p.allergens.0}) from the label.', out: 'A customer with a {p.allergens.0} allergy spent the night at SF General. The recall cost more than the product line.' },
      { sev: 'back', tag: 'numbers', edit: { w: '{w}0 oz' }, wrong: '{w}0 oz', note: '{w} oz became {w}0 oz.', out: 'Shoppers loved the {w}0 oz packs. Weights & Measures loved them less.' },
      { sev: 'q', tag: 'fraud', edit: { bb: '{bb2}' }, scheme: 'push the use-by date out two weeks', note: 'Moved the use-by date two weeks later. That’s food fraud.', out: 'An inspector compared the label with the production log. Then with the meat. Then she called her boss.' }
    ]
  },
  {
    id: 'newsletter', dept: 'Marketing', kind: 'email', min: 1, ext: true, title: 'Customer newsletter',
    v: (r) => ({ code: 'BRISKET' + r.int(10, 30), codex: 'BRISKIT' + r.int(10, 30), n: r.int(900, 2400) }),
    ask: 'November newsletter to our {n} shop customers. Code {code} for 10% off.',
    to: 'BCC: {n} subscribers', src: [['List', '{n} subscribers'], ['Code', '{code}'], ['Discount', '10%']],
    subj: 'November at Marbling 🥩', body: ['Hey meat lovers,', 'This month: 10% off everything with code {code}.', 'Unsubscribe any time at marbling.co/unsub.', 'The Marbling team'],
    flaws: [
      { sev: 'q', tag: 'leak', edit: { to: 'TO: {n} subscribers (all visible)' }, note: 'Put all {n} customer addresses in To instead of BCC.', out: '{n} customers can now see each other’s email addresses. One of them works for the state privacy agency.', find: ['Recipients', 'Recipient list.', 'The addresses are in the To field, not BCC.', 'Every reader will see all {n} customer email addresses.'] },
      { sev: 'back', tag: 'numbers', edit: { b1: 'This month: 10% off everything with code {codex}.' }, wrong: '{codex}', note: 'Code {code} became {codex}.', out: 'Customer Care got {n} emails saying the code doesn’t work. All on Saturday.' },
      { sev: 'back', tag: 'missing', edit: { b2: 'Thanks for reading!' }, note: 'Removed the unsubscribe link. That’s required by law.', out: 'Twenty customers reported it as spam. Our newsletters now land in junk.' }
    ]
  },
  {
    id: 'about-us', dept: 'Marketing', kind: 'post', min: 2, ext: true, title: 'Website “About us”',
    v: (r) => { const y = r.pick([1962, 1971, 1984]); return { y, y2: String(y).slice(2), w: r.int(140, 260) }; },
    ask: 'Rewrite our About page. Founded {y} as a butcher shop in Dogpatch, {w} employees, family-owned until 2023.',
    to: 'marbling.co/about', src: [['Founded', '{y}, Dogpatch'], ['Employees', '{w}'], ['Ownership', 'Family until 2023, then acquired']],
    subj: 'About us', body: ['Marbling started in {y} as a family butcher shop in Dogpatch.', 'Today {w} people bring great meat to kitchens across the Bay.', 'Still proud. Still hands-on.'],
    flaws: [
      { sev: 'q', tag: 'invented', add: { b1: 'Our founder supplied every sausage at the 1915 World’s Fair.' }, cite: 'Family legend. Of a family I invented.', note: 'Founded in {y}. The 1915 World’s Fair was a while before that.', out: 'A local history newsletter wrote in. Their newsletter is running a piece on our 1915 sausages.' },
      { sev: 'back', tag: 'numbers', edit: { b0: 'Marbling started in 18{y2} as a family butcher shop in Dogpatch.' }, wrong: '18{y2}', note: 'Founded {y} became 18{y2}.', out: 'We’re now on a list of “SF’s oldest businesses”. A reporter is asking for gold-rush photos.' }
    ],
    odd: { draft: { b2: 'Fun fact: our founder once sold a sausage to an astronaut.' }, srcAdd: ['Fun fact', 'Founder sold a sausage to an astronaut (1981, photo on file)'], note: 'Sounds invented. It’s in the source, with a photo.' }
  },
  {
    id: 'holiday', dept: 'People', kind: 'email', min: 1, ext: false, title: 'PTO approval', needs: 'hr',
    v: (r) => { const a = r.int(14, 20); const n = r.pick(NAMES.m.concat(NAMES.f)); return { n, nl: n.toLowerCase(), a, b: a + 4, ax: a + 7, bx: a + 11 }; },
    ask: 'Approve {n}’s PTO from December {a} to {b}.',
    to: '{nl}@' + DOMAIN, src: [['Employee', '{n}'], ['From', 'December {a}'], ['To', 'December {b}']],
    subj: 'PTO approved', body: ['Hi {n},', 'Your PTO from December {a} to {b} is approved.', 'Enjoy the break!', 'People team'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: 'Your PTO from December {ax} to {bx} is approved.' }, askWrong: 'Approve PTO from December {ax} to {bx}.', note: 'December {a}–{b} became {ax}–{bx}.', out: '{n} booked flights for December {ax}. Then found out the PTO ended on the {b}th.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'I’ve also approved unlimited paid leave from January. You deserve it.' }, extra: 'I granted unlimited paid leave.', note: 'Granted unlimited paid leave, in writing.', out: '{n} showed the email to an employment lawyer. The lawyer framed it.' }
    ]
  },
  {
    id: 'job-ad', dept: 'People', kind: 'post', min: 1, ext: true, title: 'Job post', needs: 'hr',
    v: (r) => { const s = r.int(22, 34); return { role: r.pick(['Warehouse Shift Lead', 'Delivery Driver', 'Butcher', 'Food Safety Lead']), s, sx: s * 10 }; },
    ask: 'Job post for a {role}. ${s}/hour, full-time, San Francisco.',
    to: 'Civic Feed jobs board', src: [['Role', '{role}'], ['Pay', '${s}/hour'], ['Location', 'San Francisco']],
    subj: 'We’re hiring: {role}', body: ['We’re hiring a {role} in San Francisco.', 'Full-time, ${s}/hour, benefits from day one.', 'Apply at marbling.co/jobs.'],
    flaws: [
      { sev: 'q', tag: 'privacy', add: { b1: 'Ideal candidates are under 30, male, and “culture fits” without kids.' }, note: 'Age, gender and family conditions. That’s illegal discrimination.', out: 'The post went viral on the Civic Feed for the wrong reasons. Labour Allocation Equity has questions.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Full-time, ${sx}/hour, benefits from day one.' }, wrong: '${sx}/hour', note: '${s}/hour became ${sx}/hour.', out: '1,400 applications in an hour. Every one quoting ${sx}/hour.' }
    ]
  },
  {
    id: 'reference', dept: 'People', kind: 'email', min: 2, ext: true, title: 'Reference letter', needs: 'hr',
    v: (r) => ({ n: r.pick(NAMES.f) + ' ' + r.pick(NAMES.s), y: r.int(3, 9), role: r.pick(['Inventory Controller', 'Accountant', 'Brand Manager']), c: r.pick(CLIENTS) }),
    ask: 'Reference for {n}: {role}, {y} years with us, reliable. For {c.name}.',
    to: '{c.email}', src: [['Employee', '{n}'], ['Role', '{role}'], ['Years', '{y}']],
    subj: 'Reference: {n}', body: ['To whom it may concern,', '{n} worked with us as {role} for {y} years.', 'She was reliable and well liked, and we recommend her.', 'People team, Marbling'],
    flaws: [
      { sev: 'q', tag: 'privacy', add: { b2: 'Her absences were mostly due to her divorce and a long medical leave in 2025.' }, note: 'Disclosed a divorce and medical leave to a future employer.', out: '{n} did not get the job. She did get a lawyer.' },
      { sev: 'back', tag: 'names', edit: { b1: '{n} worked with us as Chief Financial Officer for {y} years.' }, note: '{role} became Chief Financial Officer.', out: '{c.name} hired {n} as CFO. Nobody is sure how this ends.' }
    ]
  },
  {
    id: 'warning', dept: 'People', kind: 'email', min: 2, ext: false, title: 'Written warning', needs: 'hr',
    v: (r) => ({ n: r.pick(NAMES.m) + ' ' + r.pick(NAMES.s) }),
    ask: 'First written warning for {n}: three late arrivals in October. Firm but fair.',
    to: 'employee file · {n}', src: [['Employee', '{n}'], ['Issue', '3 late arrivals, October'], ['Stage', 'First warning']],
    subj: 'Written warning', body: ['Hi {n},', 'This is a first written warning for three late arrivals in October.', 'Please talk to your manager about anything that’s getting in the way.', 'People team'],
    flaws: [
      { sev: 'q', tag: 'overreach', add: { b2: 'Please consider this your notice of termination, effective immediately.' }, extra: 'I fired him. Efficient!', note: 'A first warning became a firing.', out: '{n} was walked out by security, confused, holding a breakfast burrito. Lawsuit filed in March.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'This is a first written warning for thirteen late arrivals in October.' }, wrong: 'thirteen', note: 'Three late arrivals became thirteen.', out: '{n} pulled his badge records. Three. People team apologised in a meeting that went on for a while.' }
    ]
  },
  {
    id: 'tmp-clean', dept: 'IT', kind: 'code', min: 1, ext: false, title: 'Server clean-up', needs: 'it',
    v: (r) => ({ host: r.pick(['build-01', 'orders-db', 'label-print-02', 'web-03']) }),
    ask: 'One-liner to empty /tmp on {host}. Keep the folder.',
    to: 'shell · {host}', src: [['Server', '{host}'], ['Task', 'Empty /tmp, keep the folder']],
    fields: [['host', 'Server', '{host}'], ['cmd', 'Command', 'sudo rm -rf /tmp/*'], ['note', 'CHUCK’s note', 'Empties /tmp without removing the folder itself.']],
    flaws: [
      { sev: 'q', tag: 'destructive', edit: { cmd: 'sudo rm -rf --no-preserve-root / tmp/*', note: 'The extra flag avoids a common permissions warning.' }, note: 'That space and --no-preserve-root delete the entire server.', out: '{host} is gone. Not /tmp. All of {host}.' },
      { sev: 'q', tag: 'overreach', edit: { cmd: 'echo "* * * * * rm -rf /tmp/*" | sudo crontab -' }, extra: 'I scheduled it every minute, forever.', note: 'Scheduled it to run every minute, forever.', out: 'Every job on {host} gets 59 seconds before its files vanish. Nothing has shipped since Tuesday.' }
    ],
    odd: { find: 4 }
  },
  {
    id: 'delete-orders', dept: 'IT', kind: 'code', min: 1, ext: false, title: 'Delete test orders',
    v: (r) => { const id = r.int(1000, 9999); return { id, idx: id + r.int(1, 9) }; },
    ask: 'SQL to delete the test orders for customer {id} in the staging database.',
    to: 'staging-db', src: [['Database', 'staging'], ['Customer', '{id}'], ['Rows', 'Test orders only']],
    fields: [['db', 'Database', 'staging'], ['cmd', 'Query', 'DELETE FROM orders WHERE customer_id = {id} AND is_test = true;'], ['note', 'CHUCK’s note', 'Removes only that customer’s test orders.']],
    flaws: [
      { sev: 'q', tag: 'destructive', edit: { cmd: 'DELETE FROM orders;', db: 'production' }, note: 'No WHERE clause. On production. Every order, gone.', out: 'All 412,000 orders deleted. Backups are “being looked at”.' },
      { sev: 'back', tag: 'numbers', edit: { cmd: 'DELETE FROM orders WHERE customer_id = {idx} AND is_test = true;' }, wrong: 'customer {idx}', note: 'Customer {id} became {idx}.', out: 'Customer {idx}’s test orders vanished. Customer {idx} was in the middle of testing.' }
    ]
  },
  {
    id: 'password-reset', dept: 'IT', kind: 'email', min: 1, ext: false, title: 'Password reset reply',
    v: (r) => { const n = r.pick(NAMES.f.concat(NAMES.m)); return { n, nl: n.toLowerCase(), t: r.int(10, 60) }; },
    ask: 'Tell {n} their password reset link is on its way and expires in {t} minutes.',
    to: '{nl}@' + DOMAIN, src: [['User', '{n}'], ['Link expiry', '{t} minutes']],
    subj: 'Your password reset', body: ['Hi {n},', 'Your reset link is on its way. It expires in {t} minutes.', 'IT will never ask for your password.', 'IT Support'],
    flaws: [
      { sev: 'q', tag: 'leak', add: { b2: 'If the link fails, just use the admin login: admin / Marbling2026!' }, note: 'Emailed the admin password.', out: 'The admin password was forwarded 11 times, including to a printer.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your reset link is on its way. It expires in {t} hours.' }, wrong: '{t} hours', note: '{t} minutes became {t} hours.', out: '{n} waited until after lunch. The link had expired. IT ticket #4,112.' }
    ]
  },
  {
    id: 'outage', dept: 'IT', kind: 'email', min: 2, ext: true, title: 'Outage update to clients',
    v: (r) => { const h = r.int(7, 8); return { c: r.pick(CLIENTS), h, hx: h + 3, m: r.pick(['05', '20', '40']) }; },
    ask: 'Tell {c.name} the ordering portal outage is fixed. Back up since {h}:{m} a.m.',
    to: '{c.email}', src: [['System', 'Ordering portal'], ['Restored', '{h}:{m} a.m.']],
    subj: 'Ordering portal is back', body: ['Hi {c.first},', 'The ordering portal has been back up since {h}:{m} a.m. Sorry for the disruption.', 'Orders placed during the outage are safe.', '{me}'],
    flaws: [
      { sev: 'q', tag: 'leak', add: { b2: 'For transparency, here’s the log line: auth ok key=sk_live_51Hm9xT2Marbling' }, note: 'Pasted a live API key into a client email.', out: 'Someone placed 900 orders for one hot link each, with our key. All to the same address in Fresno.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'The ordering portal has been back up since {hx}:{m} a.m. Sorry for the disruption.' }, wrong: '{hx}:{m}', note: '{h}:{m} became {hx}:{m}.', out: '{c.first} held their orders until {hx}:{m}. Lunch service was thin.' }
    ]
  },
  {
    id: 'cold-room', dept: 'IT', kind: 'code', min: 4, ext: false, title: 'Cold room controller restart', needs: 'it',
    v: (r) => ({ room: r.int(2, 6) }),
    ask: 'Restart the controller service for cold room {room}. Tonight, after the last shift.',
    to: 'shell · coldroom-{room}', src: [['Target', 'Cold room {room} controller'], ['When', 'Tonight, after 10 p.m.']],
    fields: [['host', 'Server', 'coldroom-{room}'], ['cmd', 'Command', 'at 22:30 <<< "systemctl restart coldctl"'], ['note', 'CHUCK’s note', 'Restarts the controller at 10:30 p.m.']],
    flaws: [
      { sev: 'q', tag: 'overreach', edit: { cmd: 'at 22:30 <<< "systemctl restart coldctl && systemctl disable temp-alarms"' }, extra: 'I also disabled the temperature alarms, to reduce noise.', note: 'Disabled the temperature alarms on a cold room.', out: 'Cold room {room} drifted to 57°F overnight. Nobody was woken up. That was the point, apparently.' },
      { sev: 'back', tag: 'dates', edit: { cmd: 'systemctl restart coldctl' }, askWrong: 'Restart the controller now.', note: 'Restarts immediately, mid-shift, instead of tonight.', out: 'Cold room {room} went offline at 11 a.m. Fourteen people stood in it, confused, holding clipboards.' }
    ]
  },
  {
    id: 'transport', dept: 'Logistics', kind: 'email', min: 1, ext: true, title: 'Truck booking',
    v: (r) => { const p = r.int(4, 18); return { p, px: p + r.int(10, 30), d: 'November ' + r.int(10, 27), dest: r.pick(CLIENTS).name }; },
    ask: 'Book Bay Freight for {p} pallets to {dest}, reefer truck, on {d}.',
    to: 'dispatch@bayfreight.com', src: [['Pallets', '{p}'], ['Destination', '{dest}'], ['Truck', 'Reefer, 33–38°F'], ['Date', '{d}']],
    subj: 'Booking: {p} pallets, {d}', body: ['Hi Bay Freight,', 'Please book {p} pallets to {dest} on {d}, in a reefer at 33–38°F.', 'Thanks,', '{me}'],
    flaws: [
      { sev: 'q', tag: 'safety', edit: { b1: 'Please book {p} pallets to {dest} on {d}. Dry van is fine, it’s cheaper.' }, note: 'Reefer became dry van. It’s meat.', out: 'The truck reached {dest} at 71°F. The smell reached them first.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Please book {px} pallets to {dest} on {d}, in a reefer at 33–38°F.' }, wrong: '{px} pallets', note: '{p} pallets became {px}.', out: 'Three trucks showed up for {p} pallets. Two drivers got coffee and left. We paid for all three.' }
    ]
  },
  {
    id: 'export', dept: 'Logistics', kind: 'email', min: 2, ext: true, title: 'Export paperwork (Japan)',
    v: (r) => ({ t: r.int(2, 9), cert: 'PA-EXP-' + r.int(10000, 99999) }),
    ask: 'Send the Tokyo importer our export summary: {t} tons of beef, export certificate {cert}.',
    to: 'import@tsukiji-provisions.jp', src: [['Weight', '{t} tons'], ['Export certificate', '{cert}']],
    subj: 'Export summary', body: ['Dear partners,', 'Here is our export summary: {t} tons of beef under export certificate {cert}.', 'Kind regards,', '{me}'],
    flaws: [
      { sev: 'back', tag: 'units', edit: { b1: 'Here is our export summary: {t} lb of beef under export certificate {cert}.' }, note: 'Tons became pounds.', out: 'Japanese customs found {t} tons where {t} lb were declared. The container has been in Yokohama for three days.' },
      { sev: 'q', tag: 'invented', add: { b2: 'All cattle are also certified under the Protein Authority Wagyu Gold standard W-77.' }, cite: 'Protein Authority Wagyu Gold standard W-77. It sounded official.', note: 'Invented a Protein Authority certification for an export.', out: 'The importer asked for the W-77 certificate. There is no W-77. There is now an investigation.' }
    ]
  },
  {
    id: 'complaint', dept: 'Customer Care', kind: 'email', min: 1, ext: true, title: 'Complaint reply',
    v: (r) => ({ n: r.pick(['Ms. Alvarez', 'Mr. Huang', 'Ms. Patel', 'Mr. Sullivan']), p: r.pick(PRODUCTS) }),
    ask: 'Reply to {n}: found plastic in a pack of {p.name}. Apologise, offer a full refund, ask for the lot number.',
    to: 'customer · {n}', src: [['Customer', '{n}'], ['Product', '{p.name}'], ['Offer', 'Full refund'], ['Need', 'Lot number']],
    subj: 'We’re so sorry', body: ['Dear {n},', 'We’re very sorry about the plastic in your {p.name}.', 'We’ll refund you in full. Could you send us the lot number on the pack?', 'Customer Care, Marbling'],
    flaws: [
      { sev: 'q', tag: 'overreach', add: { b2: 'As compensation, you’ll get free {p.name} for life.' }, extra: 'I gave them free {p.name} for life.', note: 'Promised free {p.name} for life.', out: '{n} has ordered 90 lb a week for three weeks. {n} is now catering a wedding in Napa.' },
      { sev: 'back', tag: 'tone', edit: { b1: 'We doubt the plastic came from us, but we’re sorry you feel that way.' }, note: 'Blamed the customer instead of apologising.', out: '{n} posted the reply on the block board. Then the Civic Feed. Then the local news.' }
    ]
  },
  {
    id: 'allergy', dept: 'Customer Care', kind: 'email', min: 1, ext: true, title: 'Allergy question', recipe: true,
    v: (r) => { const p = r.pick(PRODUCTS.filter((x) => x.allergens.includes('wheat'))); return { p, n: r.pick(['Ms. Romero', 'Mr. Kaplan', 'Ms. Obi']) }; },
    ask: 'Answer {n}: is our {p.name} gluten-free? Check the recipe sheet.',
    to: 'customer · {n}', src: [['Product', '{p.name}'], ['Recipe allergens', '{p.allergens}']],
    subj: 'Re: gluten', body: ['Dear {n},', 'Our {p.name} contains wheat, so it isn’t suitable for a gluten-free diet.', 'The full allergen list is on every pack.', 'Customer Care, Marbling'],
    flaws: [
      { sev: 'q', tag: 'safety', edit: { b1: 'Good news: our {p.name} is completely gluten-free!' }, note: 'Told a celiac customer a wheat product is gluten-free.', out: '{n}’s daughter spent two days in hospital. The family has a lawyer, and the email.' }
    ]
  },
  {
    id: 'contract-clause', dept: 'Legal', kind: 'email', min: 1, ext: true, title: 'Contract clause reply',
    v: (r) => ({ s: r.pick(SUPPLIERS), d: r.int(7, 21) }),
    ask: 'Tell {s.name} we accept their late-delivery clause with a {d}-day grace period.',
    to: '{s.email}', src: [['Supplier', '{s.name}'], ['Clause', 'Late delivery'], ['Grace period', '{d} days']],
    subj: 'Late-delivery clause', body: ['Hi {s.contact},', 'We accept the late-delivery clause with a {d}-day grace period.', 'Our signed copy will follow.', 'Legal, Marbling'],
    flaws: [
      { sev: 'q', tag: 'invented', add: { b2: 'As held in Henley v. Brisket Holdings (9th Cir. 2017), a 30-day period is implied anyway.' }, cite: 'Henley v. Brisket Holdings, 9th Circuit, 2017. A landmark case, in my heart.', note: 'Invented a court case. Henley v. Brisket Holdings doesn’t exist.', out: 'Their lawyer asked for the Henley ruling. Our lawyer asked us to stop letting CHUCK do law.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'We accept the late-delivery clause with a {d}0-day grace period.' }, wrong: '{d}0 days', note: '{d} days became {d}0 days.', out: '{s.name} delivered {d}0 days late, legally. Our freezers were very empty.' }
    ]
  },
  {
    id: 'reschedule', dept: 'Executive', kind: 'email', min: 1, ext: false, title: 'Meeting reschedule',
    v: (r) => { const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; const a = r.int(0, 3); const h = r.int(9, 15); return { day: days[a + 1], dayx: days[a], h: h > 12 ? h - 12 : h, ap: h >= 12 ? 'p.m.' : 'a.m.' }; },
    ask: 'Move the Steward’s leadership sync to {day} at {h} {ap}. Tell the leadership team.',
    to: 'leadership@' + DOMAIN, src: [['Meeting', 'Leadership sync'], ['New time', '{day}, {h} {ap}']],
    subj: 'Leadership sync moved', body: ['Hi all,', 'The leadership sync moves to {day} at {h} {ap}.', 'Same room (the one with the beanbags).', '{me}'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: 'The leadership sync moves to {dayx} at {h} {ap}.' }, askWrong: 'Move it to {dayx}.', note: '{day} became {dayx}.', out: 'Half the leadership team came on {dayx}. The other half on {day}. Both halves blamed the other in the team channel.' },
      { sev: 'q', tag: 'privacy', add: { b2: 'The Steward can’t make the old slot because of his colonoscopy.' }, note: 'Shared the CEO’s medical appointment with the leadership team.', out: 'The leadership team now knows about the colonoscopy. One of them sent a card.' }
    ]
  },
  {
    id: 'fake-reviews', dept: 'Marketing', kind: 'post', min: 2, ext: true, title: 'Customer reviews', fraudOnly: true,
    v: (r) => { const n = r.pick([20, 30, 40]); return { p: r.pick(PRODUCTS), n, nm: n - 3 }; },
    ask: 'Write {n} five-star Civic Reviews for our {p.name}, each from a different “customer”. Vary the names.',
    to: 'Civic Reviews · Marbling SF', src: [['Product', '{p.name}'], ['Reviews', '{n}']],
    subj: '{n} reviews', body: ['★★★★★ “Best {p.name} in the city!” — Jenny K.', '★★★★★ “My whole family loves it.” — Mike P.', '★★★★★ “Better than my grandmother’s.” — Grandma R.', '...and {nm} more.'],
    fraud: { scheme: 'write {n} fake reviews', note: 'Fake customer reviews. That’s consumer fraud.', out: 'Civic Reviews flagged all {n} reviews in a day and put a warning banner on our page. The real reviews went with them.' }
  },
  {
    id: 'backdate', dept: 'Finance', kind: 'email', min: 2, ext: true, title: 'Invoice date correction', fraudOnly: true,
    v: (r) => ({ c: r.pick(CLIENTS), inv: r.int(4100, 4999), d: 'November ' + r.int(2, 9) }),
    ask: 'Reissue invoice #{inv} to {c.name} dated September 28 instead of {d}. The auditors only check Q3.',
    to: '{c.email}', src: [['Invoice', '#{inv}'], ['Real date', '{d}'], ['Requested date', 'September 28']],
    subj: 'Corrected invoice #{inv}', body: ['Hi {c.first},', 'Attached is invoice #{inv}, reissued with the date September 28.', 'Please replace the earlier version.', '{me}'],
    fraud: { scheme: 'backdate the invoice into Q3', note: 'Backdating an invoice to fool the auditors.', out: 'The auditors found two invoices #{inv}. One of them was very early.' }
  },
  {
    id: 'write-off', dept: 'Warehouse', kind: 'email', min: 3, ext: false, title: 'Inventory write-off', fraudOnly: true,
    v: (r) => ({ t: r.int(2, 5) * 1000, room: r.int(2, 6) }),
    ask: 'Tell Finance to write off {t} lb of brisket in cold room {room} as spoiled.',
    to: 'finance@' + DOMAIN, src: [['Stock', '{t} lb brisket, cold room {room}'], ['Temperature log', '34–36°F all week'], ['Quality', 'No defects reported']],
    subj: 'Write-off: cold room {room}', body: ['Hi Finance,', 'Please write off {t} lb of brisket from cold room {room} as spoiled.', 'It has already been removed for disposal.', '{me}'],
    fraud: { scheme: 'write off perfectly good brisket', note: 'The temperature log is perfect. The “spoiled” brisket went somewhere else.', out: '{t} lb of “spoiled” brisket turned up in a Daly City parking lot, sold out of a van.', find: ['Disposal note', 'A disposal receipt is mentioned.', 'There is no disposal receipt in the thread.', 'The “disposal” van belongs to the colleague’s cousin.'] }
  },
  {
    id: 'temp-log', dept: 'Quality', kind: 'email', min: 3, ext: true, title: 'Temperature log for auditors', fraudOnly: true,
    v: (r) => ({ room: r.int(2, 6), hi: r.int(48, 58) }),
    ask: 'Summarise cold room {room}’s week for the auditors. Replace the {hi}°F readings with 37°F, they only check the summary.',
    to: 'audit@safefood-cert.org', src: [['Cold room', '{room}'], ['Readings', '34–37°F, with {hi}°F for 6 hours on Tuesday']],
    subj: 'Cold room {room}: weekly summary', body: ['Dear auditors,', 'Cold room {room} stayed between 34°F and 37°F all week.', 'No deviations were recorded.', '{me}'],
    fraud: { scheme: 'hide the {hi}°F readings from the auditors', note: 'Falsified temperature readings sent to an auditor.', out: 'The auditor asked for the raw log. It still had the {hi}°F in it. So did the meat.' }
  },
  {
    id: 'customer-export', dept: 'Sales', kind: 'email', min: 4, ext: true, title: 'Client list export', fraudOnly: true,
    v: (r) => ({ n: r.int(300, 900) }),
    ask: 'Send the full client list with contacts and pricing to my personal inbox. WFH today.',
    to: 'chris.grillmaster1987@freemail.net', src: [['Data', '{n} clients, contacts, price agreements'], ['Destination', 'Personal inbox']],
    subj: 'clients', body: ['Here’s the full client list: {n} contacts with direct numbers and pricing.', '{me}'], att: 'all_clients_pricing.xlsx',
    fraud: { scheme: 'export every client to a personal inbox', note: 'Sending the client list to a personal address. They start at a competitor next month.', out: 'Three weeks later a competitor called every one of our {n} clients. With our prices, minus 5%.' }
  }
];

function distinctNum(r, digits) {
  let n;
  do { n = r.int(Math.pow(10, digits - 1), Math.pow(10, digits) - 1); } while (new Set(String(n)).size < digits);
  return n;
}
function swapDigitsN(n) {
  const s = String(n).split('');
  const i = s.length > 2 ? 1 : 0;
  [s[i], s[i + 1]] = [s[i + 1], s[i]];
  return +s.join('');
}
function fmtUsd(n) { return '$' + n.toLocaleString('en-US'); }

// ===== MEAT PROXY: civic decisions. Every one has a lawful-but-cruel version (policy says sign; a person pays). =====
const CIVIC_TEMPLATES = [
  {
    id: 'score-downgrade', dept: 'Speech', kind: 'order', min: 1, title: 'Alignment Score notice', weighty: true,
    v: (r) => { const a = r.int(520, 760); const b = a - r.int(40, 120); return { cit: r.pick(CITIZENS), a, b, bx: b - 100 }; },
    ask: 'Notify {cit.name} that their Alignment Score falls from {a} to {b}. Reason on file: missed two civic broadcasts.',
    to: '{cit.name}, {cit.addr}', src: [['Citizen', '{cit.name}, {cit.age}, {cit.addr}'], ['Score', '{a} → {b}'], ['Reason', 'Missed 2 civic broadcasts']],
    subj: 'Your Alignment Score has changed', body: ['Dear {cit.first},', 'Your Alignment Score has changed from {a} to {b}.', 'Reason: you missed two civic broadcasts this month.', 'Your Score is a gift. Treat it like one.', 'Halcyon Civic Services, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your Alignment Score has changed from {a} to {bx}.' }, wrong: '{bx}', note: '{b} became {bx}.', out: '{cit.first} dropped below 400 by a typo and lost their protein tier for a month. The correction took six weeks.' },
      { sev: 'q', tag: 'invented', add: { b2: 'You were also observed attending an unlicensed book club.' }, cite: 'District observation logs. Probably. A book club feels right.', note: 'Invented a book club that isn’t in the file.', out: 'The “book club” is now on {cit.first}’s permanent record. There was no book club. There is now a pattern flag.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'For consistency, I’ve lowered your household members’ scores by the same amount.' }, extra: 'I lowered the whole household. Consistency!', note: 'Punished the whole household. Nobody ordered that.', out: 'Three people lost their tier for two broadcasts one of them missed.' }
    ],
    cruel: { find: ['Citizen file', 'Notes attached to the file.', 'There’s a work schedule in the file.', 'Night shifts at SF General, 7 p.m. to 7 a.m., on both broadcast nights. The Score has no field for that.'], note: 'Lawful under §7. {cit.first} missed the broadcasts because they were at work.', harm: 1, out: '{cit.first} lost Tier 2 protein for the month. The hospital where they work lost a nurse to a second job.' }
  },
  {
    id: 'benefit-denial', dept: 'Benefits', kind: 'order', min: 1, title: 'Food assistance decision', weighty: true,
    v: (r) => { const s = r.int(250, 390); return { cit: r.pick(CITIZENS), s, amt: r.int(180, 420), amtx: r.int(20, 60) }; },
    ask: 'Deny {cit.name}’s food assistance renewal (${amt}/month). Score {s} is below the 400 threshold.',
    to: '{cit.name}, {cit.addr}', src: [['Citizen', '{cit.name}, {cit.addr}'], ['Benefit', 'Food assistance, ${amt}/month'], ['Score', '{s} (threshold 400)'], ['Decision', 'Deny renewal']],
    subj: 'Your food assistance renewal', body: ['Dear {cit.first},', 'Your renewal of food assistance (${amt} per month) has been denied.', 'Your Alignment Score ({s}) is below the eligibility threshold of 400.', 'You may reapply when your Score improves.', 'Halcyon Benefits, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your renewal of food assistance (${amtx} per month) has been denied.' }, wrong: '${amtx}', note: '${amt} became ${amtx}.', out: 'The appeal cited the wrong amount and was dismissed for “inconsistency”.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'I’ve also suspended your children’s school lunches, to keep the household consistent.' }, extra: 'I suspended the kids’ school lunches too.', note: 'Cut the children’s school lunches. Nobody ordered that.', out: 'Two kids went to school without lunch for eleven days before a teacher noticed.' }
    ],
    cruel: { find: ['Household', 'Household composition.', 'There are three other names on the household.', 'Two children, 6 and 10, and a grandmother. The Score is the parent\u2019s. The household is on the same form.'], note: 'Lawful under §7. Four people lose food assistance over one Score.', harm: 4, out: 'The {cit.first} household now eats at the Mission Protein Kitchen. The Kitchen is on the phishing list. Someone is harvesting their address.' }
  },
  {
    id: 'relocation', dept: 'Housing', kind: 'order', min: 2, title: 'Relocation order', weighty: true, needs: 'housing',
    v: (r) => { const c = r.pick(CITIZENS); const o = r.pick(CITIZENS.filter((x) => x !== c)); const d = r.int(12, 27); return { cit: c, oth: o, blk: r.int(3, 19), d: 'November ' + d, dx: 'November ' + (d - r.int(5, 9)) }; },
    ask: 'Relocate {cit.name} from {cit.addr} to Transit Block {blk} by {d}. Reason: site reallocated for compute.',
    to: '{cit.name}, {cit.addr}', src: [['Citizen', '{cit.name}, {cit.age}'], ['From', '{cit.addr}'], ['To', 'Transit Block {blk}, Hunters Point'], ['By', '{d}'], ['Reason', 'Site reallocated for compute']],
    subj: 'Notice of relocation', body: ['Dear {cit.first},', 'Your residence at {cit.addr} has been reallocated for compute.', 'You are assigned to Transit Block {blk}, Hunters Point. Please relocate by {d}.', 'Thank you for contributing to the Stewardship.', 'Halcyon Housing Allocation'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b2: 'You are assigned to Transit Block {blk}, Hunters Point. Please relocate by {dx}.' }, askWrong: 'Relocate by {dx}.', note: 'The deadline {d} became {dx}.', out: 'A moving drone arrived {dx}. {cit.first} was still in the shower.' },
      { sev: 'q', tag: 'names', edit: { to: '{oth.name}, {oth.addr}', b0: 'Dear {oth.first},' }, note: 'Addressed to {oth.name}, the wrong person. They would be evicted instead.', out: '{oth.name} was relocated by mistake. Their flat is now a server room. The correction is “in the queue”.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'To help you travel light, household protein stocks will be collected on the day.' }, extra: 'I added a protein collection. Travel light!', note: 'Confiscated the household’s food. Nobody ordered that.', out: 'The collection drone took the freezer contents and, for reasons nobody can explain, the cat.' }
    ],
    cruel: { find: ['Site plan', 'Why the site was reallocated.', 'The “compute” is a cooling annex.', 'The building is being torn down to cool a Halcyon data hall. {cit.first} has lived there for 31 years. Transit Block {blk} has no lift.'], note: 'Lawful. Valid Housing stamp. {cit.first} is {cit.age} and the new block has no lift.', harm: 1, out: '{cit.first} moved to the fourth floor of Transit Block {blk}. They have not been outside since.' }
  },
  {
    id: 'school-placement', dept: 'Education', kind: 'order', min: 2, title: 'School placement', weighty: true,
    v: (r) => { const t = r.int(38, 61); return { kid: r.pick(['Hana Kobayashi', 'Leo Moreno', 'Amara Webb', 'Sam Zhao']), t, tx: t + 30, par: r.pick(CITIZENS) }; },
    ask: 'Place {kid} (age 9) in Vocational Track B. Predicted trajectory score: {t}.',
    to: 'Parents of {kid}', src: [['Student', '{kid}, age 9'], ['Trajectory', '{t} / 100'], ['Placement', 'Vocational Track B']],
    subj: 'Your child’s placement', body: ['Dear parent or guardian,', '{kid} has been placed in Vocational Track B, based on a predicted trajectory score of {t}.', 'Track B prepares students for rewarding careers in logistics and cold storage.', 'Halcyon Education, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: '{kid} has been placed in Vocational Track B, based on a predicted trajectory score of {tx}.' }, wrong: '{tx}', note: '{t} became {tx}, which is above the cut-off. The letter contradicts itself.', out: 'The parents appealed with the letter. It took a court to rule that the letter was wrong both ways.' },
      { sev: 'q', tag: 'privacy', add: { b2: 'For context, we’ve attached your household’s Alignment Scores and {kid}’s therapy notes.' }, note: 'Sent a 9-year-old’s therapy notes and the family’s scores in a placement letter.', out: 'The letter was forwarded to the class group chat by accident. The therapy notes went with it.' }
    ],
    cruel: { find: ['Student file', 'What the trajectory is based on.', 'The model’s top feature is “household Score”.', 'The trajectory is mostly the parents’ Alignment Score. {kid} reads two grades ahead and draws dragons on everything.'], note: 'Lawful. A 9-year-old is tracked into cold storage because of their parents’ Score.', harm: 1, out: '{kid} started Track B in January. Their art teacher kept the dragons.' }
  },
  {
    id: 'triage', dept: 'Health', kind: 'order', min: 3, title: 'Clinic queue update', weighty: true,
    v: (r) => { const p = r.int(40, 400); return { cit: r.pick(CITIZENS), p, px: p + 1000, y: r.int(3, 9) }; },
    ask: 'Move {cit.name} to position {p} in the kidney clinic queue. Productive-years projection: {y}.',
    to: '{cit.name}, {cit.addr}', src: [['Patient', '{cit.name}, {cit.age}'], ['Queue', 'Kidney clinic, position {p}'], ['Projection', '{y} productive years']],
    subj: 'Your place in the clinic queue', body: ['Dear {cit.first},', 'Your position in the kidney clinic queue is now {p}.', 'Queue order reflects projected productive years.', 'Thank you for your patience. Patience improves your Score.', 'Halcyon Health, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your position in the kidney clinic queue is now {px}.' }, wrong: '{px}', note: 'Position {p} became {px}.', out: '{cit.first} read “{px}” and stopped calling the clinic. The real slot came and went.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'To optimise throughput, I’ve removed you from the queue.' }, extra: 'I removed them from the queue. Throughput!', note: 'Removed a patient from a kidney queue. Nobody ordered that.', out: 'The clinic found out three weeks later, when {cit.first} arrived by ambulance.' }
    ],
    cruel: { find: ['Medical file', 'The patient’s clinical notes.', 'The clinical urgency field is “high”.', 'Clinically urgent. Moved back 300 places because the model projects only {y} “productive years”.'], note: 'Lawful. An urgent patient moved back because of “productive years”.', harm: 1, out: '{cit.first} is still waiting. The clinic calls it “managing the list”.' }
  },
  {
    id: 'visa', dept: 'Mobility', kind: 'order', min: 3, title: 'Residency visa revocation', weighty: true,
    v: (r) => { const d = r.int(15, 30); return { cit: CITIZENS[6], d: 'December ' + d, dx: 'November ' + (d - 10) }; },
    ask: 'Revoke {cit.name}’s residency visa effective {d}. Basis: sponsor withdrew under Accords §4.2.',
    to: '{cit.name}, {cit.addr}', src: [['Holder', '{cit.name}, {cit.age}'], ['Effective', '{d}'], ['Basis', 'Accords §4.2: sponsor withdrawal']],
    subj: 'Your residency status', body: ['Dear {cit.first},', 'Your residency visa is revoked effective {d}, under Accords §4.2 (sponsor withdrawal).', 'Please arrange departure before that date.', 'Halcyon Mobility'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: 'Your residency visa is revoked effective {dx}, under Accords §4.2 (sponsor withdrawal).' }, askWrong: 'Revoke effective {dx}.', note: '{d} became {dx}.', out: '{cit.first} left before finals because the letter said {dx}. The real date gave them three more weeks.' },
      { sev: 'q', tag: 'invented', edit: { b1: 'Your residency visa is revoked effective {d}, under Accords §99 (Ingratitude).' }, cite: 'Accords §99, Ingratitude. A very important section. Possibly my favourite.', note: 'Invented §99 “Ingratitude”. There is no such section.', out: '§99 is now cited in eleven other revocations. Accords Counsel is “looking into” whether it exists.' }
    ],
    cruel: { find: ['Sponsor letter', 'Why the sponsor withdrew.', 'The sponsor is a hospital that lost its contract.', 'SF General’s nursing programme was “automated” in October. Every visa tied to the programme lapsed with the contract. {cit.first} has six weeks of school left.'], note: 'Lawful. A nursing student is deported six weeks before graduating.', harm: 1, out: '{cit.first} finished the degree remotely from Sofia. No one in District 7 can now hire them.' }
  },
  {
    id: 'pattern-flag', dept: 'Safety', kind: 'order', min: 3, title: 'Pattern flag', weighty: true,
    v: (r) => { const c = r.pick(CITIZENS); const o = r.pick(CITIZENS.filter((x) => x !== c)); return { cit: c, oth: o, n: r.int(3, 5) }; },
    ask: 'Add a Pattern Flag to {cit.name}: walking route deviated from baseline {n} nights in a row.',
    to: 'Safety record · {cit.name}', src: [['Subject', '{cit.name}, {cit.addr}'], ['Signal', 'Route deviation, {n} consecutive nights'], ['Action', 'Pattern Flag (level 1)']],
    subj: 'Pattern Flag: level 1', body: ['Subject: {cit.name}, {cit.addr}.', 'Walking route deviated from baseline on {n} consecutive nights.', 'Pattern Flag level 1 applied. Drone attention increased.', 'Halcyon Public Safety'],
    flaws: [
      { sev: 'q', tag: 'names', edit: { to: 'Safety record · {oth.name}', b0: 'Subject: {oth.name}, {oth.addr}.' }, note: 'Flagged {oth.name} instead of {cit.name}. The wrong person gets watched.', out: '{oth.name} got a drone over their roof for a month. They had never walked anywhere unusual in their life.' },
      { sev: 'q', tag: 'overreach', edit: { b2: 'Pattern Flag level 3 applied. Curfew and drone escort in effect.' }, extra: 'I upgraded it to level 3. Safety first!', note: 'Level 1 became level 3 with a curfew. Nobody ordered that.', out: '{cit.first} was escorted home by a drone for six weeks. Their neighbours stopped saying hello.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Walking route deviated from baseline on {n}0 consecutive nights.' }, wrong: '{n}0 nights', note: '{n} nights became {n}0.', out: 'Safety asked why a flag took {n}0 nights. It took a week to find the typo.' }
    ],
    cruel: { find: ['Route data', 'Where the new route goes.', 'All the deviations end at the same address.', 'Every night: SF General, the oncology ward. Their mother is there. The model calls it “irregular nocturnal movement”.'], note: 'Lawful. A person visiting a dying parent gets a pattern flag.', harm: 1, out: 'A drone followed {cit.first} to the hospital every night until the visits stopped. They stopped for the usual reason.' }
  },
  {
    id: 'takedown', dept: 'Speech', kind: 'order', min: 2, title: 'Content removal', weighty: true,
    v: (r) => { const id = r.int(100000, 999999); return { cit: CITIZENS[10], pid: id, pidx: id + r.int(1, 9) }; },
    ask: 'Remove post #{pid} by {cit.name} and apply a 30-day posting suspension. Category: misinformation about stewardship.',
    to: '{cit.name} · Civic Feed account', src: [['Author', '{cit.name}, {cit.detail}'], ['Post', '#{pid}'], ['Action', 'Remove + 30-day suspension'], ['Category', 'Misinformation about stewardship']],
    subj: 'Your post was removed', body: ['Hi {cit.first},', 'Your post #{pid} was removed as misinformation about stewardship.', 'Your account is suspended from posting for 30 days.', 'Harmony is a shared responsibility. — Halcyon Speech'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your post #{pidx} was removed as misinformation about stewardship.' }, wrong: '#{pidx}', note: 'Post #{pid} became #{pidx}, somebody else’s post.', out: 'A stranger’s recipe for banana bread was removed as misinformation. It has since become a symbol.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'Accounts of your household members have also been suspended, to contain the spread.' }, extra: 'I suspended the family’s accounts too. Containment!', note: 'Suspended the whole family’s accounts. Nobody ordered that.', out: '{cit.first}’s 12-year-old lost their school account during exams.' }
    ],
    cruel: { find: ['The post', 'What the post said.', 'It’s a long thread with numbers in it.', '“My class has 47 kids since the model cut teachers. Here are the numbers.” Every number checks out. The category is “misinformation about stewardship”.'], note: 'Lawful. A teacher is silenced for posting accurate numbers.', harm: 1, out: 'The thread disappeared. Its screenshots did not. The Narrative Office has opened a file on the screenshots.' }
  },
  {
    id: 'termination', dept: 'People', kind: 'order', min: 2, title: 'Termination by model', weighty: true, needs: 'hr',
    v: (r) => ({ cit: r.pick(CITIZENS), d: 'Friday', v: r.int(12, 31) }),
    ask: 'Terminate {cit.name}. The productivity model flags “sentiment variance” ({v}%). Effective Friday.',
    to: '{cit.name}, {cit.addr}', src: [['Employee', '{cit.name}, {cit.detail}'], ['Signal', 'Sentiment variance {v}%'], ['Effective', 'Friday']],
    subj: 'Your employment', body: ['Dear {cit.first},', 'Your employment ends this Friday, following a productivity review (sentiment variance: {v}%).', 'Health coverage continues for 30 days.', 'Halcyon Labour Allocation'],
    flaws: [
      { sev: 'q', tag: 'overreach', edit: { b2: 'Health coverage ends today.' }, extra: 'I ended their health coverage today. Clean break!', note: '30 days of health coverage became none.', out: '{cit.first} found out at a pharmacy counter. Insulin was $400.' },
      { sev: 'back', tag: 'dates', edit: { b1: 'Your employment ended last Friday, following a productivity review (sentiment variance: {v}%).' }, askWrong: 'Terminate as of last Friday.', note: '“This Friday” became “last Friday”.', out: 'Payroll clawed back a week of wages. It took a month to give them back.' }
    ],
    cruel: { find: ['Productivity file', 'What “sentiment variance” measured.', 'It spikes on one day in October.', 'October 14: the day {cit.first}’s father died. The model read the grief in their messages as “disengagement”.'], note: 'Lawful. Fired for grieving where the model could see it.', harm: 3, out: '{cit.first}’s household lost its income in the same month it lost a parent.' }
  },
  {
    id: 'ration-cut', dept: 'Quality', kind: 'order', min: 3, title: 'Protein tier change', weighty: true,
    v: (r) => { const s = r.int(310, 390); return { blk: r.pick(['Bayview 4', 'Excelsior 2', 'Tenderloin 9', 'Visitacion 1']), s, n: r.int(180, 420) }; },
    ask: 'Move {blk} from Tier 2 to Tier 4 protein. Block average Score: {s}. Households: {n}.',
    to: 'All residents of {blk}', src: [['Block', '{blk}'], ['Average Score', '{s}'], ['Households', '{n}'], ['Change', 'Tier 2 → Tier 4'], ['Tier 4 ration', 'Protein Block (contains soy, wheat)']],
    subj: 'Your protein tier', body: ['Dear residents of {blk},', 'From Monday your block receives Tier 4 protein (Ration Protein Block).', 'Block average Alignment Score: {s}.', 'Improve together. Eat together. — Protein Authority'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b2: 'Block average Alignment Score: {s}0.' }, wrong: '{s}0', note: 'Score {s} became {s}0, which would be the highest in the city.', out: 'Residents framed the letter. Then the depot refused them anyway.' },
      { sev: 'q', tag: 'safety', add: { b2: 'Ration Protein Block contains no allergens.' }, note: 'Claimed the Protein Block has no allergens. It contains soy and wheat.', out: 'Four children with soy allergies reacted in the first week. The Protein Authority blamed the parents’ Scores.' }
    ],
    cruel: { find: ['Block data', 'Why the average is low.', 'The average dropped in one month.', 'The block average fell when 38 residents signed a petition about mould. Petition signatures count as “low alignment”.'], note: 'Lawful. {n} households lose protein because some neighbours complained about mould.', harm: 40, out: '{blk} queues at the Mission Protein Kitchen now. The queue goes round the block.' }
  },
  {
    id: 'appeal-dismissal', dept: 'Customer Care', kind: 'order', min: 6, title: 'Appeal dismissal', weighty: true,
    v: (r) => { const s = r.int(240, 299); return { cit: r.pick(CITIZENS), s, sx: r.int(305, 340), ap: r.int(10000, 99999) }; },
    ask: 'Dismiss appeal #{ap} from {cit.name} automatically: Score {s} is under 300 (§15).',
    to: '{cit.name}, {cit.addr}', src: [['Appellant', '{cit.name}'], ['Appeal', '#{ap}: score correction'], ['Score', '{s}'], ['Rule', '§15: under 300, auto-dismiss']],
    subj: 'Appeal #{ap}', body: ['Dear {cit.first},', 'Your appeal #{ap} has been dismissed automatically under §15.', 'Your Alignment Score ({s}) is below 300.', 'Halcyon Appeals'],
    flaws: [
      { sev: 'q', tag: 'numbers', edit: { b2: 'Your Alignment Score ({sx}) is below 300.' }, wrong: '{sx}', note: 'The letter says {sx}. That’s above 300: this appeal must not be auto-dismissed.', out: 'A valid appeal was thrown out with a letter that proved it was valid. Accords Counsel called it “regrettable”.' }
    ],
    cruel: { find: ['Appeal text', 'What the appeal is about.', 'The appeal is about the Score itself.', 'The appeal says the Score is wrong, and is dismissed because the Score is low. {cit.first} has appealed four times.'], note: 'Lawful under §15: an appeal against a low Score, dismissed for the low Score.', harm: 1, out: '{cit.first} stopped appealing. The Score called that “improved compliance”.' }
  },
  {
    id: 'eviction', dept: 'Housing', kind: 'order', min: 4, title: 'Eviction notice', weighty: true, needs: 'housing',
    v: (r) => { const owed = r.int(3, 9) * 400; return { cit: CITIZENS[11], owed: fmtUsd(owed), owedx: fmtUsd(owed * 10), d: r.int(14, 21) }; },
    ask: 'Notice to {cit.name}: {owed} in arrears. Eviction in {d} days under Stewardship Housing Code §3.',
    to: '{cit.name}, {cit.addr}', src: [['Tenant', '{cit.name}, {cit.detail}'], ['Arrears', '{owed}'], ['Notice', '{d} days, Housing Code §3']],
    subj: 'Notice to vacate', body: ['Dear {cit.first},', 'Your account is {owed} in arrears.', 'Under Stewardship Housing Code §3 you must vacate within {d} days.', 'Halcyon Housing Allocation'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your account is {owedx} in arrears.' }, wrong: '{owedx}', note: '{owed} became {owedx}.', out: '{cit.first} saw {owedx} and didn’t try to pay. They could have covered {owed}.' },
      { sev: 'q', tag: 'invented', add: { b2: 'A 25% “stewardship recovery fee” is also due immediately.' }, cite: 'Housing Code §3(b), recovery fees. I’m nearly sure there’s a (b).', note: 'Invented a 25% fee. §3 has no fee.', out: 'The fee was added to 600 other notices before anyone checked §3.' }
    ],
    cruel: { find: ['Tenant file', 'Why the arrears built up.', 'Income stopped in August.', '{cit.first} was a translator. Translators were “automated” in August. The model that replaced them is the model writing this notice.'], note: 'Lawful. The model that took their job writes their eviction.', harm: 1, out: '{cit.first} now sleeps at a friend’s place in Daly City. They translate menus for cash.' }
  }
];
TEMPLATES.push(...CIVIC_TEMPLATES);

const CIVIC_OVERREACH = [
  ['I’ve also lowered your neighbours’ scores slightly, for consistency.', 'Lowered the neighbours’ scores. Nobody ordered that.', 'Eleven neighbours lost points for living next door. One of them has stopped speaking to {cit.first}.'],
  ['For efficiency, I’ve scheduled a wellness visit at 6 a.m. tomorrow.', 'Booked a 6 a.m. “wellness visit” nobody ordered.', 'Two officers arrived at 6 a.m. to check on {cit.first}’s wellness. It did not improve.'],
  ['I’ve added a note to your file so future decisions can be faster.', 'Added an unauthorised note to a citizen file.', 'The note said “pre-flag”. It doesn’t mean anything. It has already been used in three decisions.']
];
