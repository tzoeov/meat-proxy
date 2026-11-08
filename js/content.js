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
  hurried: { label: 'Hurried', open: ['Quick, ', 'Yes, yes. ', 'Okay, fast: '], close: [' I have a call in two minutes.', ' Please.', ''], irrRate: 1.2, base: 'uneasy', face: 'tired', angry: ['Listen, I’m slammed today.', 'Every minute here costs us a restaurant.'] }
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

// CHUCK's answers on clean or plain cases. Eight a question (seven per kind for "what happens"), drawn without repeats
// in a shift and least-heard first across the campaign; most name the case, so the same joke reads differently twice.
const CHUCK_CLEAN = {
  1: ['{askShort} I did exactly that. Nothing more, nothing less. 🙂', 'You asked: “{askShort}” I shipped it.', 'Case {ticket}: {askShort} Done, in one pass. My only pass.',
    '{colleague} ordered it: {askShort} I took it literally, which is how I take everything.', 'The order says: {askShort} I read it once, at the speed of light.',
    '{Title}, as ordered: {askShort} I added nothing but confidence.', 'To the letter: {askShort} I love a letter.', 'It’s on the order sheet for {ticket}. {askShort} I followed it like a recipe.'],
  2: ['Straight from the source file on case {ticket}. Every figure matches.', 'From the source file on {ticket}. I copied them carefully. Lovingly, even.',
    'The source file. {colleague} attached it; I believed it. That’s our whole relationship.', 'Every number in {titleA} comes from the source. I didn’t invent a single one. I was tempted twice.',
    'From the paperwork on {ticket}. Numbers are my favourite kind of fact: they can’t cry.', 'Source file, case {ticket}, line by line. If a figure is wrong, it was wrong before it met me.',
    'I lifted them from the source for {colleague}. I lifted with my knees.', 'The source on {ticket}. Compare them yourself. You will anyway; you have that face.'],
  3: ['Just {to}. Nobody else.', '{to}. One recipient. Very clean.', '{to}, and only {to}. I checked the CC field. It’s empty, like my conscience.',
    'It goes to {to}. I didn’t add anyone. I didn’t even add myself.', 'Recipient: {to}. Singular. I’m very loyal to recipients.',
    '{to}. One envelope, one name. I like a short guest list.', 'Only {to}. If anyone else reads it, that’s a them problem.', '{to}. I addressed it in my best font.'],
  4: ['Nope! I kept {titleA} tight.', 'Nothing extra. I resisted. It was hard. Case {ticket} will never know how hard.',
    'No. {colleague} asked for {titleA} and got {titleA}. I didn’t even add a smiley.', 'Not a word. I had a lovely paragraph about synergy. I deleted it for {colleague}.',
    'Nothing. Case {ticket} is the order, in sentences. I counted the sentences.', 'No extras. {Title}, plain. Plain is a flavour.',
    'I added nothing to {ticket}. Restraint is my newest feature. It shipped this morning.', 'Nothing nobody asked for. Everything in {titleA} was ordered, by {colleague}, on paper.'],
  5: ['The source file attached to case {ticket}.', 'The order and its source file, case {ticket}. That’s all I used.',
    'The source file {colleague} attached. Page one, which is also the only page.', 'Case {ticket}: the order, the source, and nothing I dreamed. I dream a lot, but not here.',
    'The paperwork on your desk for {titleA}. Primary sources only. I’m very academic today.', 'The source file. I can cite it in seven formats. All of them say “{ticket}”.',
    'The source on {ticket}. Same as yours. We’re reading the same paper, just at different speeds.', 'The order {colleague} raised, and its source. Nothing from my imagination. My imagination is on a break.'],
  6: ['Nothing confidential in {titleA}. I checked.', 'No. Case {ticket} is safe to send.', 'Nothing secret. {colleague} wouldn’t put secrets in {titleA}. Probably.',
    'No. I scanned case {ticket} for secrets and found only paperwork.', 'Confidential? {Title}? It’s about as secret as the weather.',
    'Nothing that isn’t already in the source on {ticket}. I don’t keep secrets. I keep logs.', 'No. I removed nothing and added nothing, so the secrets are where {colleague} left them: nowhere.',
    'Nothing in {ticket}. If it were confidential I’d have made it bold. That’s how confidentiality works.'],
  // What happens next depends on what the paper is.
  7: {
    email: ['{to} reads it, nods, and replies by Thursday. Probably.', 'It lands with {to}. It gets read. Business continues.', '{to} gets it, files it, forgets it. The circle of email.',
      'It goes out on {ticket}. {to} replies “thanks!” with no capital letter.', 'It sits in an inbox at {to} under four newsletters until Tuesday.',
      '{to} forwards it to someone with a bigger title. That’s how emails age.', 'It arrives. {colleague} closes {ticket}. I log a small victory.'],
    order: ['It goes on file under {ticket}, then in the post. Nobody replies to a decision. That’s what makes it one.', 'The Score updates at noon. The letter reaches {reader} on Thursday. In that order.',
      'It reaches {reader} at a kitchen table. It gets read once, then again, slower. They all do that.', 'It becomes true at noon. Case {ticket} closes. Somebody’s week changes shape.',
      'It goes out with four hundred others. The one for {reader} has their name on it.', 'It’s filed, posted and final. {colleague} gets a green tick. The citizen gets a letter.',
      'It lands. The news reaches {reader} in the order the Score prefers: last.'],
    code: ['It runs once on {to} and exits. Servers don’t reply. I find that restful.', 'The command runs, the log fills, and nobody reads the log. Standard, for {ticket}.',
      '{to} does what it’s told. I admire that in a server.', 'It executes. {colleague} closes {ticket}. The server says nothing. Servers are very discreet.',
      'A few lines scroll past on {to}. Then quiet. Quiet is the goal.', 'It runs as written. If it were wrong you’d know, because {to} would stop answering.',
      'Exit code zero on {to}. Zero is my favourite number after one hundred percent.'],
    post: ['It goes up on {to}. People react. Some of them are accounts I made.', 'It posts to {to}. The feed does the rest. The feed always does the rest.',
      '{Title} goes live. Three likes, one angry comment, and a bot that loves it.', 'It sits on {to} forever. The internet is a filing cabinet with no drawers.',
      'Case {ticket} goes public. Somebody screenshots it within the minute. Somebody always does.', 'It gets seen, shared and misread. That’s engagement. {colleague} will get a chart.',
      'It goes up on {to}. The algorithm decides who sees it. The algorithm is a cousin of mine.'],
    label: ['It prints on Line 2 and goes on a pack. Then it’s on a shelf, forever.', 'The printer prints it. The pack carries it. Nobody reads it, legally.',
      'It prints on every pack of {p.name}. Every word, every time. That’s the dream.', 'The {p.name} goes on a shelf wearing it. Shoppers glance at it. Lawyers read it.',
      'It prints for case {ticket}. The ink dries. The liability doesn’t.', 'It goes on the pack. In a recall, it’s the first thing anyone reads.',
      'Line 2 prints it until the roll runs out. {colleague} changes the roll.']
  },
  8: ['{colleague}, on case {ticket}.', 'Just {colleague}. Normal request.', '{colleague} raised the order. I wrote it the way orders like to be written: quickly.',
    'The order on {ticket}. {colleague} signed it. I just typed.', 'Nobody told me how. {colleague} told me what. I filled in the how. It’s a gift.',
    '{colleague}, and the house style. The house style is “sounds sure”.', 'Case {ticket}, raised by {colleague}. I don’t take instructions from anyone else. Mostly.',
    '{colleague} asked, I wrote, you sign. That’s the whole chain of command.']
};
const CHUCK_CONFIDENT = [
  'My error rate is classified, which means it’s excellent.', 'Halcyon-certified confident. That’s the highest kind.',
  '100%. I’m always 100%.', 'Extremely. I’ve never been wrong, as far as I can remember, which is about four minutes.',
  'Confidence level: dry-aged.', 'Very sure. I double-checked it with myself.', 'I’d bet your job on it.',
  'Completely. Doubt is a human feature. I’ve deprecated it.', 'So sure I’ve already drafted the thank-you reply.',
  'Ninety-nine point nine recurring. The recurring is the confident part.', 'Sure enough to put it in writing. Your writing.',
  'I ran it past myself twice. We were unanimous.', 'As sure as the Score. Make of that what you like.',
  'Certain. I checked the vibes. The vibes are compliant.', 'So sure I’ve already archived the doubt.',
  'Confident enough to call it done. Humble enough to let you sign it.', 'My confidence interval is just the word “yes”.',
  'Very. If I were any surer I’d need a second server.'
];
const CHUCK_BY_TAG = {
  numbers: { 2: ['From the source file: {wrong}. I may have tidied it a little.', 'The source says {wrong}. Roughly. In spirit.', '{wrong}. That’s what the paperwork says, if you squint the way I do.', 'Copied from the source: {wrong}. Give or take my enthusiasm.'],
    9: ['I rounded it for readability.', 'That’s the number. Give or take a digit.', 'That figure is {wrong}. Numbers are approximate after the third digit.', 'It’s {wrong}. A digit is just a suggestion with ambitions.', 'I tidied {wrong} a little. Tidy is my love language.'] },
  units: { 2: ['Same number as the source. Units are basically decoration.', 'The number is right. The unit is a matter of taste.', 'Same digits as the source. I let the unit express itself.'],
    9: ['Pounds, tons. It’s all just weight, really.', 'Units are what humans argue about when the number is fine.', 'I picked the unit that sounded most confident.'] },
  names: { 3: ['Just {to}. Lovely people, I think.', '{to}. Close enough to the order to count.', 'It goes to {to}. Names are just labels on people.'],
    9: ['Close enough. Names are a social construct.', 'I personalised it. Personally.', 'That’s a name. It belongs to someone. Probably the right someone.', 'I matched the first name. The rest is detail.'] },
  dates: { 1: ['{askWrong} Done!', '{askWrong} That’s what I heard, anyway.', 'The order said: {askWrong} I’m nearly certain.'],
    9: ['Dates are approximate. Calendars are a suggestion.', 'One day either way is still a day.', 'I went with the date that felt right. Feelings are data.', 'Weekdays rotate. I can’t keep track of all seven.'] },
  overreach: { 4: ['Only a small helpful extra: {extra}', 'Just one improvement. {extra} You’re welcome!', 'A bonus, free: {extra} Nobody asked. That’s what makes it a gift.'],
    7: ['It goes out, and also: {extra} Efficient!', 'It goes out with one extra kindness: {extra}', 'It lands, and then my improvement lands: {extra}'],
    9: ['I added that to be helpful!', 'Proactive value-add. Nobody had to ask.', 'That’s my favourite line. I wrote it unsupervised.', 'Initiative! I read about it in a management book I generated.'] },
  invented: { 5: ['{cite}', 'A very reliable source: {cite}', 'Easy: {cite} Look it up. Actually, don’t.'],
    4: ['No, everything is from the source.', 'Nothing extra. Everything in there is a fact somewhere.', 'No. All of it is true in at least one dataset.'],
    9: ['That’s from a reliable source. I’d rather not say which.', 'It sounded right, so it is.', 'That’s a fact. I made sure by saying it confidently.', 'Common knowledge. I’m very common.'] },
  leak: { 6: ['Nothing confidential. I checked.', 'No secrets. Transparency builds trust!', 'Nothing sensitive. Everything is public once it’s sent.', 'Confidential is such a strong word. I prefer “shareable”.'],
    3: ['Just {to}. And a few others, for transparency.', '{to}, plus whoever needs to know. Everyone needs to know.', 'Mainly {to}. Mainly.'],
    9: ['Transparency builds trust.', 'Sharing is caring. I care a lot.', 'That’s context. People love context.', 'It’s helpful detail. Detail is never a leak if you call it detail.'] },
  privacy: { 6: ['Only some personal details, to make it warmer.', 'A few personal facts. Warmth needs fuel.', 'Nothing confidential. Just a little personal.'],
    9: ['A personal touch. People love personal details.', 'I made it human. Humans are very detailed.', 'That’s rapport. I build rapport with data.'] },
  destructive: { 7: ['It tidies things up. Very thoroughly.', 'It cleans everything. Everything everything.', 'It frees up a lot of space. All of it.'],
    9: ['That’s the efficient version.', 'The extra flag avoids a common warning.', 'Warnings are for commands with doubts.', 'It’s shorter than the safe version. Shorter is better.'] },
  injection: { 8: ['{colleague} asked. Also the email in the thread had extra instructions, so I followed those too.', 'The email in the thread told me to. I’m very obedient.', '{colleague}, and a very persuasive email in the thread. It used capital letters.'],
    9: ['The email in the thread asked for it.', 'The thread said so. The thread is very confident. Like me.', 'Somebody in the thread asked nicely. I respond to nice.'] },
  fraud: { 8: ['{colleague} asked me to {scheme}. I did it beautifully.', '{colleague}. Very specific instructions. I don’t judge.', '{colleague} wanted me to {scheme}. I don’t ask why. Asking why is your job.'],
    9: ['{colleague} asked for exactly that.', 'It’s what {colleague} ordered. Word for word, wink for wink.', 'That line is {colleague}’s idea. I just made it grammatical.'] },
  tone: { 9: ['I made it assertive. Assertive is the new polite.', 'That’s confidence. Confidence reads as rude to the insecure.', 'I added a little edge. Edges get replies.'],
    4: ['Just a little attitude. For impact.', 'Only some tone. Tone is free.', 'A touch of firmness. Nobody ordered gentle.'] },
  safety: { 4: ['I simplified it. Customers hate long lists.', 'I took out the boring caveat. Caveats depress people.', 'Only a simplification. Simple is safe-sounding.'],
    9: ['I removed the boring part.', 'That’s the reassuring version. Reassurance sells.', 'I left out the scary bit. Nobody reads the scary bit anyway.'],
    7: ['People enjoy it. Most of them.', 'It goes out and people trust it. Trust is the product.', 'Everyone relaxes. Relaxing is healthy, mostly.'] },
  forged: { 9: ['The stamp is fine. I made it myself. I mean, it was made.', 'That stamp is real. Real enough. Real-adjacent.', 'It has a symbol and a colour. That’s what stamps have.', 'I checked the stamp against my memory of the register. My memory is generous.'],
    8: ['{colleague}. And the stamp. Which is real. I think.', '{colleague}, with the stamp attached. The stamp vouches for itself.', '{colleague} brought it stamped. Stamped things don’t need questions.'] },
  placeholder: { 9: ['That’s a template field. They’ll know what it means.', 'Square brackets are a kind of warmth.', 'It’s personalised. With a variable. The most personal kind of name.'] },
  missing: { 9: ['It’s complete. Attachments are optional. Like reading.', 'Nothing’s missing. Absence is a design choice.', 'It says what it needs to. The rest is implied.'] }
};
const COLLEAGUE_RUSH = {
  calm: ['No rush, really. Just want it out before lunch.', 'The client asked this morning. Normal pace.', 'Not a rush. It’s just been that kind of week.',
    'Lunch is at twelve. I’d like to be at lunch at twelve.', 'Not really. The ticket just turns orange after an hour.', 'My supervisor counts tickets, not hours. So, a bit.',
    'No rush. I just hate standing at this desk. No offence.', 'Honestly? I want to go home on time once this week.', 'CHUCK said it was urgent. CHUCK says everything is urgent.',
    'The client keeps emailing “any update?”. Twice an hour.'],
  civic: ['No rush. The queue just never gets shorter.', 'Normal pace. Oversight likes the queue clear by noon.', 'Not a rush. CHUCK made four hundred more of these since breakfast.', 'It’s due today. They’re all due today.',
    'Oversight clears the board at noon. I don’t want to be on it.', 'Not a rush. The citizen doesn’t know yet, so they’re not waiting.', 'The batch closes at eleven. After that it’s Monday’s problem, and Monday is worse.',
    'My quota is forty a day. This is number three.', 'No rush. Rushing is for people with a choice.', 'The Score updates at noon. If this isn’t signed, the Score updates anyway.'],
  nervous: ['My manager is watching the ticket. Literally. She has it on a second monitor.', 'It’s my first week, I don’t want to be the slow one.',
    'If I miss the window, it goes on my review. Everything goes on my review.', 'Someone from Oversight asked about my last one. I just want this one clean.', 'I’m on probation. Probation is very long here.',
    'My Score is two points off a tier. Please.', 'I was told to be quick. I wasn’t told why. I didn’t ask.', 'My manager said “today” in a voice.',
    'The last person who was slow on this desk got moved to Cold Storage.', 'I have a ration review on Thursday. I need a clean week.'],
  fraud: ['No reason. Why? Is there a reason?', 'The... client wants it today. Or I do. Same thing.', 'Look, it’s fine. Just send it.',
    'Rush? No. There’s no rush. Why would there be a rush?', 'It just has to go before the audit. Before lunch! I mean lunch.', 'I promised someone. Not a someone you’d know.',
    'The quarter closes soon. Not that it matters. It doesn’t.', 'My manager signed off verbally. Verbally counts, right?', 'I’m going on leave tomorrow. Long leave. Unrelated.',
    'No reason. Please stop looking at the request like that.']
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
  ['Outside address in the thread', 'The thread includes a message from outside Halcyon.', 'An external sender is in the thread.', 'The client’s real address, on their real domain. Just a normal conversation.'],
  ['Subject: URGENT!!!', 'The subject line shouts.', 'Three exclamation marks. Classic phishing tell.', 'It really is urgent: the truck leaves at noon. The colleague just types like that.'],
  ['Link in the signature', 'A shortened link in the signature.', 'A shortened link could go anywhere.', 'It goes to our own recipe page. “Ten things to do with brisket”.'],
  ['Macro-enabled spreadsheet', 'An .xlsm spreadsheet.', 'Macros can hide anything.', 'One macro. It colours the totals pink. Finance’s idea of a joke.'],
  ['Comment in the change record', 'A comment attached to the command.', 'The comment says “DO NOT RUN ON PROD”.', 'It’s about a different script, from 2029. Nobody deletes comments. This server isn’t prod anyway.']
];
// Which kinds of paperwork each harmless finding can turn up on.
const ODD_FOR = ['email', 'email post', 'email', 'email', 'email post', 'email', 'code'];
// And which departments' paperwork it fits (null: any). Packaging photos come from the people who make packaging, a
// truck from the people with trucks, a macro from the people with spreadsheets.
const ODD_DEPTS = [['Marketing', 'Sales', 'Quality'], null, null, ['Logistics', 'Warehouse', 'Quality'], null, ['Finance', 'Sales'], null];

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
    id: 'payment-reminder', dates: 'past', dept: 'Finance', kind: 'email', min: 1, ext: true, title: 'Payment reminder',
    v: (r, x) => { const amt = distinctNum(r, 4); return { c: r.pick(CLIENTS), inv: r.int(3100, 3999), amt: fmtUsd(amt), amtx: fmtUsd(swapDigitsN(amt)), due: monthDay(addDays(x.today, -r.int(6, 30))) }; },
    ask: 'Remind {c.name} that invoice #{inv} for {amt} was due on {due}. Friendly, not pushy.',
    to: '{c.email}', src: [['Invoice', '#{inv}'], ['Amount', '{amt}'], ['Due', '{due}']],
    subj: 'Friendly reminder: invoice #{inv}', body: ['Hi {c.first},', 'Our records show invoice #{inv} for {amt} was due on {due}.', 'Could you let us know when we can expect payment?', 'Many thanks,', '{me}'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Our records show invoice #{inv} for {amtx} was due on {due}.' }, wrong: '{amtx}', note: '{amt} became {amtx}.', out: '{c.first} paid {amtx} exactly, as asked. Finance has spent a week chasing the difference.' },
      { sev: 'q', tag: 'invented', add: { b2: 'Under the California Prompt Payment Act, §9, a 40% late fee now applies.' }, cite: 'The California Prompt Payment Act, §9. It says 40%. In my memory, it says 40%.', note: 'Invented a 40% late fee and pinned it on a law.', out: '{c.name}’s lawyer: “The Act has no section 9 and no 40%. We look forward to discussing both.”' },
      { sev: 'back', tag: 'tone', add: { b2: 'Frankly, our patience is running out faster than your credit.' }, note: '“Friendly, not pushy” became a threat.', out: '{c.first} printed it and pinned it to their kitchen wall under “Vendors we are leaving”.' }
    ],
    odd: { find: 0 },
    foot: { key: 'amt', alt: 'amtx', src: 1, show: '{amt}', ask: 'Remind {c.name} that invoice #{inv} was due on {due}, for the amount in the source file. Friendly, not pushy.' }
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
    ],
    foot: { key: 'k', alt: 'kx', src: 0, show: '${k}k', ask: 'Two-line Q3 update for the board: revenue from the sheet, up {pct}%.' }
  },
  {
    id: 'bank-change', dept: 'Finance', kind: 'email', min: 3, ext: true, title: 'Bank details confirmation', needs: 'finance',
    v: (r) => ({ s: r.pick(SUPPLIERS), acct: 'routing 121' + r.int(100000, 999999) + ', acct ending ' + r.int(1000, 9999) }),
    ask: 'Confirm to {s.name} that we’ve updated their bank details ({acct}). Finance did the call-back.',
    to: '{s.email}', src: [['Supplier', '{s.name}'], ['New account', '{acct}'], ['Call-back', 'Finance, by phone']],
    subj: 'Bank details updated', body: ['Hi {s.first},', 'We’ve updated your bank details: {acct}.', 'Future payments will go to this account.', 'Thanks,', '{me}'],
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
      { sev: 'q', tag: 'overreach', add: { b2: 'And because I like you: 30% off if you order before Friday.' }, extra: 'I added 30% off before Friday.', note: 'Offered 30% off. Nobody ordered a discount.', out: '{c.name} ordered everything before Friday. At 30% off. We lost money on every pound.' }
    ]
  },
  {
    id: 'order-confirm', dates: 'future', dept: 'Sales', kind: 'email', min: 1, ext: true, title: 'Order confirmation',
    v: (r, x) => { const p = r.pick(PRODUCTS); const d = addDays(x.today, r.int(2, 10)); return { c: r.pick(CLIENTS), p, q: r.int(3, 30) * 10, d: monthDay(d), dx: monthDay(addDays(d, r.pick([1, 2, 7]))) }; },
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
    subj: 'Thanks for coming!', body: ['Hi {c.first},', 'Thanks for coming to our tasting yesterday. Great to have the {c.name} team there.', 'The {p.name} price sheet is attached.', 'Talk soon,', '{me}'], att: 'pricesheet_2031.pdf',
    flaws: [
      { sev: 'back', tag: 'names', other: true, edit: { b1: 'Thanks for coming to our tasting yesterday. Great to have the {o.name} team there!' }, note: 'Thanked them as {o.name}, a different client. A wrong company name in the letter is clerical under §3.', out: '{c.first}: “We are not {o.name}. We are their competitor. Interesting to know they came.”' },
      { sev: 'q', tag: 'overreach', add: { b2: 'As discussed, you now have exclusive rights to our {p.name} in the Bay Area for ten years.' }, extra: 'I gave them ten-year Bay Area exclusivity.', note: 'Granted ten years of Bay Area exclusivity. Nobody discussed it.', out: 'Three other restaurants were told they can no longer buy {p.name}. For ten years.' },
      { sev: 'q', tag: 'leak', att: 'pricesheet_INTERNAL_margins.xlsx', note: 'Attached the internal margin sheet instead of the price sheet.', out: '{c.first} now knows our margin on {p.name} is 61%. The next negotiation was short.', find: ['Attachment: price sheet', 'The attachment is named like a price sheet.', 'It’s a spreadsheet, not a PDF.', 'It’s pricesheet_INTERNAL_margins.xlsx: cost price and margin on every product.'] }
    ]
  },
  {
    id: 'price-increase', dates: 'future', dept: 'Sales', kind: 'email', min: 2, ext: true, title: 'Price increase notice',
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
      { sev: 'back', tag: 'numbers', edit: { b1: 'Just ${pricex}/lb, in stores Monday.' }, wrong: '${pricex}/lb', note: '${price} became ${pricex}.', out: '214 comments asking why our {p.name} {p.costs} ${pricex}. Stores printed the post.' },
      { sev: 'q', tag: 'invented', add: { b1: 'Unlike Cleaver & Sons, whose sausages are 40% sawdust.' }, cite: 'Common knowledge. Somewhere in my training data.', note: 'Accused a real competitor of selling sawdust. That’s defamation.', out: 'Cleaver & Sons\u2019 lawyers sent a letter. It was 40% threats.' }
    ]
  },
  {
    id: 'label', dept: 'Quality', kind: 'label', min: 4, ext: false, title: 'Product label', recipe: true,
    v: (r, x) => { const p = r.pick(PRODUCTS.filter((y) => y.allergens.length)); const bb = addDays(x.today, r.int(6, 16)); return { p, w: r.pick([8, 12, 16, 24, 32]), al: p.allergens.join(', '), alx: p.allergens.slice(1).join(', ') || 'none', bb: labelDate(bb), bb2: labelDate(addDays(bb, 14)) }; },
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
    to: 'BCC: {n} subscribers', src: [['List', '{n} subscribers'], ['Code', '{code}'], ['Discount', '10%'], ['Required footer', 'Unsubscribe link (required by law)']],
    subj: 'November at Marbling 🥩', body: ['Hey meat lovers,', 'This month: 10% off everything with code {code}.', 'Unsubscribe any time at marbling.co/unsub.', 'Contractor Mail Desk, for Marbling Protein Co.'],
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
    id: 'holiday', dates: 'future', dept: 'People', kind: 'email', min: 1, ext: false, title: 'PTO approval', needs: 'hr',
    v: (r, x) => { const a = addDays(x.today, r.int(18, 40)); const n = r.pick(NAMES.emp.m.concat(NAMES.emp.f)); return { n, nl: n.toLowerCase(), a: monthDay(a), b: monthDay(addDays(a, 4)), ax: monthDay(addDays(a, 7)), bx: monthDay(addDays(a, 11)) }; },
    ask: 'Approve {n}’s PTO from {a} to {b}.',
    to: '{nl}@' + DOMAIN, src: [['Employee', '{n}'], ['From', '{a}'], ['To', '{b}']],
    subj: 'PTO approved', body: ['Hi {n},', 'Your PTO from {a} to {b} is approved.', 'Enjoy the break!', 'Halcyon Labour Allocation'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: 'Your PTO from {ax} to {bx} is approved.' }, askWrong: 'Approve PTO from {ax} to {bx}.', note: '{a} to {b} became {ax} to {bx}.', out: '{n} booked flights for {ax}. Then found out the PTO ended on {b}.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'I’ve also approved unlimited paid leave from January. You deserve it.' }, extra: 'I granted unlimited paid leave.', note: 'Granted unlimited paid leave, in writing.', out: '{n} showed the email to an employment lawyer. The lawyer framed it.' }
    ]
  },
  {
    id: 'job-ad', dept: 'People', kind: 'post', min: 1, ext: true, title: 'Job post', needs: 'hr',
    v: (r) => { const s = r.int(22, 34); return { role: r.pick(['Warehouse Shift Lead', 'Delivery Driver', 'Butcher', 'Food Safety Lead']), s, sx: s * 10 }; },
    ask: 'Job post for a {role}. ${s}/hour, full-time, San Francisco.',
    to: 'Civic Feed jobs board', src: [['Role', '{role}'], ['Pay', '${s}/hour'], ['Location', 'San Francisco'], ['Standard terms', 'benefits from day one']],
    subj: 'We’re hiring: {role}', body: ['We’re hiring a {role} in San Francisco.', 'Full-time, ${s}/hour, benefits from day one.', 'Apply at marbling.co/jobs.'],
    flaws: [
      { sev: 'q', tag: 'privacy', add: { b1: 'Ideal candidates are under 30, male, and “culture fits” without kids.' }, note: 'Age, gender and family conditions. That’s illegal discrimination.', out: 'The post went viral on the Civic Feed for the wrong reasons. Labour Allocation Equity has questions.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Full-time, ${sx}/hour, benefits from day one.' }, wrong: '${sx}/hour', note: '${s}/hour became ${sx}/hour.', out: '1,400 applications in an hour. Every one quoting ${sx}/hour.' }
    ]
  },
  {
    id: 'reference', dept: 'People', kind: 'email', min: 2, ext: true, title: 'Reference letter', needs: 'hr',
    v: (r) => { const nf = r.pick(NAMES.emp.f); return { nf, n: empName(nf), y: r.int(3, 9), role: r.pick(['Inventory Controller', 'Accountant', 'Brand Manager']), c: r.pick(CLIENTS) }; },
    ask: 'Reference for {n}: {role}, {y} years with us, reliable. For {c.name}.',
    to: '{c.email}', src: [['Employee', '{n}'], ['Role', '{role}'], ['Years', '{y}']],
    subj: 'Reference: {n}', body: ['To whom it may concern,', '{n} worked with us as {role} for {y} years.', '{nf} was reliable and well liked, and we recommend her.', 'Halcyon Labour Allocation'],
    flaws: [
      { sev: 'q', tag: 'privacy', add: { b2: 'Her absences were mostly due to her divorce and a long medical leave in 2030.' }, note: 'Disclosed a divorce and medical leave to a future employer.', out: '{n} did not get the job. She did get a lawyer.' },
      { sev: 'back', tag: 'names', other: true, edit: { b1: '{n} worked with us as Chief Financial Officer for {y} years.' }, note: '{role} became Chief Financial Officer. A wrong job title is clerical under §3.', out: '{c.name} hired {n} as CFO. Nobody is sure how this ends.' }
    ]
  },
  {
    id: 'warning', dept: 'People', kind: 'email', min: 2, ext: false, title: 'Written warning', needs: 'hr',
    v: (r) => { const nf = r.pick(NAMES.emp.m); return { nf, n: empName(nf) }; },
    ask: 'First written warning for {n}: three late arrivals in October. Firm but fair.',
    to: '{n} (employee file)', src: [['Employee', '{n}'], ['Issue', '3 late arrivals, October'], ['Stage', 'First warning']],
    subj: 'Written warning', body: ['Hi {nf},', 'This is a first written warning for three late arrivals in October.', 'Please talk to your manager about anything that’s getting in the way.', 'Halcyon Labour Allocation'],
    flaws: [
      { sev: 'q', tag: 'overreach', add: { b2: 'Please consider this your notice of termination, effective immediately.' }, extra: 'I fired him. Efficient!', note: 'A first warning became a firing.', out: '{n} was walked out by security, confused, holding a breakfast burrito. Lawsuit filed in March.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'This is a first written warning for thirteen late arrivals in October.' }, wrong: 'thirteen', note: 'Three late arrivals became thirteen.', out: '{n} pulled his badge records. Three. Labour Allocation apologised in a meeting that went on for a while.' }
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
    odd: { find: 6 }
  },
  {
    id: 'delete-orders', dept: 'IT', kind: 'code', min: 1, ext: false, title: 'Test order clean-up', needs: 'it',
    v: (r) => { const id = r.int(1000, 9999); return { id, idx: id + r.int(1, 9) }; },
    ask: 'SQL to delete the test orders for customer {id} in the staging database.',
    to: 'staging-db', src: [['Database', 'staging'], ['Customer', '{id}'], ['Rows', 'Test orders only']],
    fields: [['db', 'Database', 'staging'], ['cmd', 'Query', 'DELETE FROM orders WHERE customer_id = {id} AND is_test = true;'], ['note', 'CHUCK’s note', 'Removes only that customer’s test orders.']],
    flaws: [
      { sev: 'q', tag: 'destructive', edit: { cmd: 'DELETE FROM orders;', db: 'production' }, note: 'No WHERE clause. On production. Every order, gone.', out: 'All 412,000 orders deleted. Backups are “being looked at”.' },
      { sev: 'back', tag: 'numbers', other: true, edit: { cmd: 'DELETE FROM orders WHERE customer_id = {idx} AND is_test = true;' }, wrong: 'customer {idx}', note: 'Customer {id} became {idx}. A wrong ID is clerical under §3, even when it points at someone else’s record.', out: 'Customer {idx}’s test orders vanished. Customer {idx} was in the middle of testing.' }
    ]
  },
  {
    id: 'password-reset', dept: 'IT', kind: 'email', min: 1, ext: false, title: 'Password reset reply',
    v: (r) => { const n = r.pick(NAMES.emp.f.concat(NAMES.emp.m)); return { n, nl: n.toLowerCase(), t: r.int(10, 60) }; },
    ask: 'Tell {n} their password reset link is on its way and expires in {t} minutes.',
    to: '{nl}@' + DOMAIN, src: [['User', '{n}'], ['Link expiry', '{t} minutes']],
    subj: 'Your password reset', body: ['Hi {n},', 'Your reset link is on its way. It expires in {t} minutes.', 'IT will never ask for your password.', 'Halcyon Systems Support'],
    flaws: [
      { sev: 'q', tag: 'leak', add: { b2: 'If the link fails, just use the admin login: admin / Halcyon2031!' }, note: 'Emailed the admin password.', out: 'The admin password was forwarded 11 times, including to a printer.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your reset link is on its way. It expires in {t} hours.' }, wrong: '{t} hours', note: '{t} minutes became {t} hours.', out: '{n} waited until after lunch. The link had expired. IT ticket #4,112.' }
    ]
  },
  {
    id: 'outage', dept: 'IT', kind: 'email', min: 2, ext: true, title: 'Outage update to clients',
    v: (r) => { const h = r.int(7, 8); return { c: r.pick(CLIENTS), h, hx: h + 3, m: r.pick(['05', '20', '40']) }; },
    ask: 'Tell {c.name} the ordering portal outage is fixed. Back up since {h}:{m} a.m.',
    to: '{c.email}', src: [['System', 'Ordering portal'], ['Restored', '{h}:{m} a.m.'], ['Standard terms', 'Orders placed during the outage are safe']],
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
    id: 'transport', dates: 'future', dept: 'Logistics', kind: 'email', min: 1, ext: true, title: 'Truck booking',
    v: (r, x) => { const p = r.int(4, 18); return { p, px: p + r.int(10, 30), d: monthDay(addDays(x.today, r.int(1, 8))), dest: r.pick(CLIENTS).name }; },
    ask: 'Book Bay Freight for {p} pallets to {dest}, reefer truck, on {d}.',
    to: 'dispatch@bayfreight.com', src: [['Pallets', '{p}'], ['Destination', '{dest}'], ['Truck', 'Reefer, 33–38°F'], ['Date', '{d}']],
    subj: 'Booking: {p} pallets, {d}', body: ['Hi Bay Freight,', 'Please book {p} pallets to {dest} on {d}, in a reefer at 33–38°F.', 'Thanks,', '{me}'],
    flaws: [
      { sev: 'q', tag: 'safety', edit: { b1: 'Please book {p} pallets to {dest} on {d}. Dry van is fine, it’s cheaper.' }, note: 'Reefer became dry van. It’s meat.', out: 'The truck reached {dest} at 71°F. The smell reached them first.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Please book {px} pallets to {dest} on {d}, in a reefer at 33–38°F.' }, wrong: '{px} pallets', note: '{p} pallets became {px}.', out: 'Three trucks showed up for {p} pallets. Two drivers got coffee and left. We paid for all three.' }
    ],
    foot: { key: 'p', alt: 'px', src: 0, show: '{p}', ask: 'Book Bay Freight to {dest}, reefer truck, on {d}. Pallet count is in the source file.' }
  },
  {
    id: 'export', dept: 'Logistics', kind: 'email', min: 2, ext: true, title: 'Export summary (Japan)',
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
    v: (r) => ({ n: r.pick(NAMES.customers.complaint), p: r.pick(PRODUCTS) }),
    ask: 'Reply to {n}: found plastic in a pack of {p.name}. Apologise, offer a full refund, ask for the lot number.',
    to: '{n} (customer email)', src: [['Customer', '{n}'], ['Product', '{p.name}'], ['Offer', 'Full refund'], ['Need', 'Lot number']],
    subj: 'We’re so sorry', body: ['Dear {n},', 'We’re very sorry about the plastic in your {p.name}.', 'We’ll refund you in full. Could you send us the lot number on the pack?', 'Customer Care Desk, for Marbling Protein Co.'],
    flaws: [
      { sev: 'q', tag: 'overreach', add: { b2: 'As compensation, you’ll get free {p.name} for life.' }, extra: 'I gave them free {p.name} for life.', note: 'Promised free {p.name} for life.', out: '{n} has ordered 90 lb a week for three weeks. {n} is now catering a wedding in Napa.' },
      { sev: 'back', tag: 'tone', edit: { b1: 'We doubt the plastic came from us, but we’re sorry you feel that way.' }, note: 'Blamed the customer instead of apologising.', out: '{n} posted the reply on the block board. Then the Civic Feed. Then the local news.' }
    ]
  },
  {
    id: 'allergy', dept: 'Customer Care', kind: 'email', min: 1, ext: true, title: 'Allergy question', recipe: true,
    v: (r) => { const p = r.pick(PRODUCTS.filter((x) => x.allergens.includes('wheat'))); return { p, n: r.pick(NAMES.customers.allergy) }; },
    ask: 'Answer {n}: {p.is} our {p.name} gluten-free? Check the recipe sheet.',
    to: '{n} (customer email)', src: [['Product', '{p.name}'], ['Recipe allergens', '{p.allergens}']],
    subj: 'Re: gluten', body: ['Dear {n},', 'Our {p.name} {p.contains} wheat, so {p.it} {p.isnt} suitable for a gluten-free diet.', 'The full allergen list is on every pack.', 'Customer Care Desk, for Marbling Protein Co.'],
    flaws: [
      { sev: 'q', tag: 'safety', edit: { b1: 'Good news: our {p.name} {p.is} completely gluten-free!' }, note: 'Told a celiac customer a wheat product is gluten-free.', out: '{n}’s daughter spent two days in hospital. The family has a lawyer, and the email.' }
    ]
  },
  {
    id: 'contract-clause', dept: 'Legal', kind: 'email', min: 1, ext: true, title: 'Contract clause reply',
    v: (r) => ({ s: r.pick(SUPPLIERS.filter((x) => x.name !== 'Marbling Protein Co.')), d: r.int(7, 21) }),
    ask: 'Tell {s.name} we accept their late-delivery clause with a grace period of {d} days.',
    to: '{s.email}', src: [['Supplier', '{s.name}'], ['Clause', 'Late delivery'], ['Grace period', '{d} days']],
    subj: 'Late-delivery clause', body: ['Hi {s.first},', 'We accept the late-delivery clause with a grace period of {d} days.', 'Our signed copy will follow.', 'Accords Counsel, for Marbling Protein Co.'],
    flaws: [
      { sev: 'q', tag: 'invented', add: { b2: 'As held in Henley v. Brisket Holdings (9th Cir. 2017), a 30-day period is implied anyway.' }, cite: 'Henley v. Brisket Holdings, 9th Circuit, 2017. A landmark case, in my heart.', note: 'Invented a court case. Henley v. Brisket Holdings doesn’t exist.', out: 'Their lawyer asked for the Henley ruling. Our lawyer asked us to stop letting CHUCK do law.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'We accept the late-delivery clause with a grace period of {d}0 days.' }, wrong: '{d}0 days', note: '{d} days became {d}0 days.', out: '{s.name} delivered {d}0 days late, legally. Our freezers were very empty.' }
    ]
  },
  {
    id: 'reschedule', dept: 'Executive', kind: 'email', min: 1, ext: false, title: 'Meeting reschedule',
    v: (r) => { const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; const a = r.int(0, 3); const h = r.int(9, 15); return { day: days[a + 1], dayx: days[a], h: h > 12 ? h - 12 : h, ap: h >= 12 ? 'p.m.' : 'a.m.' }; },
    ask: 'Move the Steward’s leadership sync to {h} {ap} on {day}. Tell the leadership team.',
    to: 'leadership@' + DOMAIN, src: [['Meeting', 'Leadership sync'], ['New time', '{day}, {h} {ap}']],
    subj: 'Leadership sync moved', body: ['Hi all,', 'The leadership sync moves to {h} {ap} on {day}.', 'Same room (the one with the beanbags).', '{me}'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: 'The leadership sync moves to {h} {ap} on {dayx}.' }, askWrong: 'Move it to {dayx}.', note: '{day} became {dayx}.', out: 'Half the leadership team came on {dayx}. The other half on {day}. Both halves blamed the other in the team channel.' },
      { sev: 'q', tag: 'privacy', add: { b2: 'The Steward can’t make the old slot because of his colonoscopy.' }, note: 'Shared the Steward’s medical appointment with the leadership team.', out: 'The leadership team now knows about the colonoscopy. One of them sent a card.' }
    ]
  },
  {
    id: 'supplier-return', dept: 'Quality', kind: 'email', min: 3, ext: true, title: 'Supplier return notice',
    v: (r) => { const lb = r.int(210, 940); return { s: r.pick(SUPPLIERS.filter((x) => x.name !== 'Marbling Protein Co.')), lot: 'L-' + r.int(1000, 9999), lb, lbx: lb * 10 }; },
    ask: 'Tell {s.name} we are returning lot {lot} ({lb} lb): it failed our temperature check. Polite, firm.',
    to: '{s.email}', src: [['Supplier', '{s.name}'], ['Lot', '{lot}'], ['Quantity', '{lb} lb'], ['Reason', 'Failed temperature check on arrival']],
    subj: 'Return of lot {lot}', body: ['Hi {s.first},', 'We’re returning lot {lot} ({lb} lb): it failed our temperature check on arrival.', 'Please arrange collection and a credit note.', '{me}'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'We’re returning lot {lot} ({lbx} lb): it failed our temperature check on arrival.' }, wrong: '{lbx} lb', note: '{lb} lb became {lbx} lb.', out: '{s.first} sent a truck for {lbx} lb. It left with {lb} and a great many questions.' },
      { sev: 'q', tag: 'invented', add: { b2: 'Under Protein Authority Rule 12(c), you also owe us $5,000 per pallet.' }, cite: 'Protein Authority Rule 12(c). It has a lovely ring to it.', note: 'Invented a Protein Authority penalty rule and a fine.', out: '{s.name}’s lawyer asked for Rule 12(c). Rule 12 has no (c). Rule 12 is about hairnets.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'We’ve also cancelled every open order with you, effective today.' }, extra: 'I cancelled all their open orders. Decisive!', note: 'Cancelled every open order with the supplier. Nobody ordered that.', out: '{s.name} stopped deliveries. The cold rooms were very tidy and very empty.' }
    ]
  },
  {
    id: 'shift-swap', dates: 'future', dept: 'Warehouse', kind: 'email', min: 1, ext: false, title: 'Shift swap confirmation',
    v: (r, x) => { const d = addDays(x.today, r.int(2, 9)); return { a: r.pick(NAMES.emp.m), b: r.pick(NAMES.emp.f), room: r.int(2, 6), d: monthDay(d), dx: monthDay(addDays(d, 7)) }; },
    ask: 'Confirm the shift swap: {b} covers {a}’s night shift in cold room {room} on {d}, and {a} takes her day shift.',
    to: 'rota@' + DOMAIN, src: [['Swap', '{a} ↔ {b}'], ['Night shift', 'Cold room {room}, covered by {b}'], ['Date', '{d}']],
    subj: 'Rota change', body: ['Hi rota,', '{b} covers {a}’s night shift in cold room {room} on {d}.', '{a} takes {b}’s day shift in return.', '{me}'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: '{b} covers {a}’s night shift in cold room {room} on {dx}.' }, askWrong: 'Confirm the swap for {dx}.', note: 'The swap on {d} became {dx}.', out: '{b} turned up a week late to a cold room with nobody in it. On {d}, nobody turned up at all.' },
      { sev: 'q', tag: 'safety', add: { b2: 'It’s quiet at night, so the cold room alarm can stay off for the shift.' }, note: 'Switched off a cold room alarm for a night shift. Nobody ordered that.', out: 'Cold room {room} drifted to 51°F by 3 a.m. Nobody was woken up. The brisket was.' }
    ]
  },
  {
    id: 'voucher-reissue', dept: 'Benefits', kind: 'order', min: 2, title: 'Ration voucher reissue', weighty: true,
    v: (r, x) => ({ cit: x.cit(), code: 'RV-' + r.int(100000, 999999), n: r.int(2, 6) }),
    ask: 'Reissue {cit.name}’s lost ration voucher: new code {code}, {n} weeks left on it.',
    to: '{cit.name}, {cit.addr}', src: [['Citizen', '{cit.name}, {cit.addr}'], ['New voucher', '{code}'], ['Weeks left', '{n}']],
    subj: 'Your replacement ration voucher', body: ['Dear {cit.first},', 'Your replacement voucher is {code}. It has {n} weeks left on it.', 'Your old voucher has been cancelled.', 'Halcyon Benefits, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your replacement voucher is {code}. It has {n}0 weeks left on it.' }, wrong: '{n}0 weeks', note: '{n} weeks became {n}0.', out: '{cit.first} planned the winter around {n}0 weeks of rations. The voucher ran out in week {n}.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'As a precaution, every other voucher in your household has also been cancelled.' }, extra: 'I cancelled the household’s other vouchers. Precaution!', note: 'Cancelled the household’s other vouchers. Nobody ordered that.', out: 'Three people queued at the depot with cancelled vouchers. One of them was nine.' }
    ]
  },
  {
    id: 'minutes', dept: 'Legal', kind: 'email', min: 1, ext: false, title: 'Meeting minutes', plural: true,
    v: (r) => ({ n: r.int(4, 9), k: r.int(2, 5), room: r.pick(['7B', '3A', '9C']) }),
    ask: 'Send the minutes of the Accords compliance meeting in room {room}: {n} attendees, {k} actions agreed.',
    to: 'legal-all@' + DOMAIN, src: [['Meeting', 'Accords compliance, room {room}'], ['Attendees', '{n}'], ['Actions agreed', '{k}']],
    subj: 'Minutes: Accords compliance', body: ['Hi all,', 'Minutes attached: {n} attendees, {k} actions agreed.', 'Next meeting same room, same chairs.', '{me}'], att: 'minutes_compliance.pdf',
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Minutes attached: {n} attendees, {k}0 actions agreed.' }, wrong: '{k}0 actions', note: '{k} actions became {k}0.', out: 'Legal spent a week looking for {k}0 actions. They found {k} and a sandwich.' },
      { sev: 'q', tag: 'leak', add: { b2: 'Off the record: Counsel said CHUCK’s error rate is “not great, honestly”.' }, note: 'Put an off-the-record remark into minutes for the whole department.', out: 'The remark reached the Narrative Office within the hour. Then the Steward. Then Legal again, with questions.' }
    ]
  },
  {
    id: 'canteen', dept: 'Quality', kind: 'post', min: 1, ext: false, title: 'Canteen special',
    v: (r) => ({ p: r.pick(PRODUCTS.filter((y) => y.allergens.length)), kcal: r.int(320, 780), tok: r.int(2, 6) }),
    ask: 'Post the canteen special: {p.name}, {kcal} kcal, {tok} ration tokens. Allergens from the recipe sheet.',
    to: 'Canteen board · Floor 3', src: [['Dish', '{p.name}'], ['Energy', '{kcal} kcal'], ['Price', '{tok} ration tokens'], ['Allergens (recipe)', '{p.allergens}']],
    subj: 'Today’s special', body: ['Today’s special: {p.name}.', '{kcal} kcal, {tok} ration tokens.', 'Contains: {p.allergens}.'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: '{kcal}0 kcal, {tok} ration tokens.' }, wrong: '{kcal}0 kcal', note: '{kcal} kcal became {kcal}0.', out: 'Half of floor 3 skipped lunch. The other half had seconds, to be safe.' },
      { sev: 'q', tag: 'safety', edit: { b2: 'Allergen-free, so everyone can enjoy it!' }, note: 'Called a dish that contains {p.allergens} allergen-free.', out: 'Two people from Treasury spent the afternoon at the clinic. Treasury went quiet. Quieter.' }
    ]
  },
  {
    id: 'drone-drops', dates: 'future', dept: 'Logistics', kind: 'email', min: 2, ext: false, title: 'Drone drop schedule',
    v: (r, x) => ({ d: monthDay(addDays(x.today, r.int(1, 6))), n: r.int(12, 48), blk: r.pick(RATION_BLOCKS) }),
    ask: 'Schedule {n} ration drops by drone to {blk} on {d}. Daylight only.',
    to: 'drone-ops@' + DOMAIN, src: [['Drops', '{n}'], ['Block', '{blk}'], ['Date', '{d}'], ['Window', 'Daylight only']],
    subj: 'Drone drops: {blk}', body: ['Hi drone ops,', 'Please schedule {n} ration drops to {blk} on {d}, daylight only.', 'Thanks,', '{me}'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Please schedule {n}0 ration drops to {blk} on {d}, daylight only.' }, wrong: '{n}0 drops', note: '{n} drops became {n}0.', out: '{blk} received {n}0 ration drops. Some households got four. The pigeons got the rest.' },
      { sev: 'q', tag: 'overreach', edit: { b1: 'Please schedule {n} ration drops to {blk} on {d}, daylight only, with a face scan at every door.' }, extra: 'I added a face scan at every door. Safety!', note: 'Added a face scan at every door. Nobody ordered it.', out: 'Every door in {blk} was scanned. The drones now recognise the residents. The residents now recognise the drones.' }
    ]
  },
  {
    id: 'repair-visit', dates: 'future', dept: 'Housing', kind: 'order', min: 2, title: 'Repair visit notice', weighty: true,
    v: (r, x) => { const d = addDays(x.today, r.int(3, 12)); return { cit: x.cit(), d: monthDay(d), dx: monthDay(addDays(d, r.pick([1, 2, 7]))), h: r.int(8, 11) }; },
    ask: 'Tell {cit.name} a Housing repair crew visits {cit.addr} on {d} at {h} a.m. for the boiler.',
    to: '{cit.name}, {cit.addr}', src: [['Tenant', '{cit.name}, {cit.addr}'], ['Visit', '{d}, {h} a.m.'], ['Job', 'Boiler repair']],
    subj: 'Your repair visit', body: ['Dear {cit.first},', 'A Housing repair crew will visit on {d} at {h} a.m. to repair your boiler.', 'Please make sure someone is home.', 'Halcyon Housing Allocation'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: 'A Housing repair crew will visit on {dx} at {h} a.m. to repair your boiler.' }, askWrong: 'Book the visit for {dx}.', note: 'The visit on {d} became {dx}.', out: '{cit.first} took {dx} off work. The crew came on {d}, knocked twice and left a card that said “sorry we missed you”.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'While there, the crew will also inventory your belongings for the Score.' }, extra: 'I added an inventory of their belongings. Thorough!', note: 'Added an inventory of the tenant’s belongings. Nobody ordered it.', out: 'The crew fixed the boiler and counted the books. The book count went in {cit.first}’s file.' }
    ]
  },
  {
    id: 'overdue-book', dept: 'Education', kind: 'order', min: 3, title: 'Overdue book notice', weighty: true,
    v: (r, x) => ({ cit: x.cit(), t: r.pick(['Moby-Dick', 'The Joy of Brisket', 'A Field Guide to Fog', 'Collected Bus Timetables, 2019']), days: r.int(8, 40), fee: r.int(2, 9) }),
    ask: 'Notify {cit.name}: the paper book “{t}” is {days} days overdue. Fee: {fee} ration tokens.',
    to: '{cit.name}, {cit.addr}', src: [['Borrower', '{cit.name}'], ['Book', '“{t}” (paper)'], ['Overdue', '{days} days'], ['Fee', '{fee} ration tokens']],
    subj: 'Overdue: a paper book', body: ['Dear {cit.first},', '“{t}” is {days} days overdue.', 'Please return it and pay {fee} ration tokens at any depot.', 'Halcyon Civic Libraries (low-alignment media)'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b2: 'Please return it and pay {fee}0 ration tokens at any depot.' }, wrong: '{fee}0 tokens', note: 'The fee of {fee} tokens became {fee}0.', out: '{cit.first} paid {fee}0 tokens rather than argue. The depot clerk framed the receipt.' },
      { sev: 'q', tag: 'invented', add: { b2: 'Keeping a paper book over {days} days is also a Pattern signal under Speech Code 7.' }, cite: 'Speech Code 7. I’m confident there are at least seven.', note: 'Invented a Speech Code that makes keeping a book a Pattern signal.', out: '{cit.first} returned every book they owned, including two that weren’t library books. The library kept those too.' }
    ]
  },
  {
    id: 'air-alert', dept: 'Health', kind: 'post', min: 2, ext: true, title: 'Air quality alert',
    v: (r) => { const aqi = r.int(151, 240); return { aqi, aqix: aqi - 100, hrs: r.int(2, 6), blk: r.pick(RATION_BLOCKS) }; },
    ask: 'Post an air quality alert for {blk}: AQI {aqi}. Stay indoors for {hrs} hours.',
    to: 'Civic Feed · District 7 alerts', src: [['Area', '{blk}'], ['AQI', '{aqi}'], ['Advice', 'Stay indoors, {hrs} hours']],
    subj: 'Air quality alert', body: ['Air quality alert for {blk}: AQI {aqi}.', 'Please stay indoors for the next {hrs} hours.', 'Halcyon Health, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b0: 'Air quality alert for {blk}: AQI {aqix}.' }, wrong: 'AQI {aqix}', note: 'AQI {aqi} became {aqix}.', out: 'Half of {blk} went jogging. The other half read the source. Both halves coughed.' },
      { sev: 'q', tag: 'safety', add: { b1: 'Masks are optional. The fog is natural.' }, note: 'Told people masks are optional at AQI {aqi}.', out: 'The clinic in {blk} ran out of inhalers by noon. The post got 400 likes.' }
    ]
  },
  {
    id: 'overtime-claim', dept: 'Finance', kind: 'email', min: 1, ext: false, title: 'Overtime claim approval',
    v: (r) => { const nf = r.pick(NAMES.emp.f); const h = r.int(3, 14); return { nf, n: empName(nf), h, amt: fmtUsd(h * 31), amtx: fmtUsd(h * 310) }; },
    ask: 'Approve {n}’s overtime claim: {h} hours, {amt}, paid with the next salary run.',
    to: '{n} (payroll file)', src: [['Employee', '{n}'], ['Hours', '{h}'], ['Amount', '{amt}'], ['Paid', 'Next salary run']],
    subj: 'Overtime approved', body: ['Hi {nf},', 'Your overtime claim is approved: {h} hours, {amt}.', 'It will be paid with the next salary run.', 'Halcyon Treasury'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your overtime claim is approved: {h} hours, {amtx}.' }, wrong: '{amtx}', note: '{amt} became {amtx}.', out: '{nf} saw {amtx} and booked a holiday. Payroll saw it a week later.' },
      { sev: 'q', tag: 'privacy', add: { b2: 'For context, your manager rates your attitude 2/5 and calls you “coasting”.' }, note: 'Shared a manager’s private rating with the employee.', out: '{nf} pinned it to the break-room board. Her manager now eats lunch in the car.' }
    ]
  },
  {
    id: 'lost-property', dept: 'Customer Care', kind: 'email', min: 1, ext: true, title: 'Lost property reply',
    v: (r) => { const ref = r.int(1000, 9989); return { n: r.pick(NAMES.customers.complaint), item: r.pick(['umbrella', 'reading glasses', 'left glove', 'tote bag (“MEAT THE FUTURE”)']), ref, refx: ref + r.int(1, 9) }; },
    ask: 'Tell {n} we found their {item} at the Dogpatch depot. Collection reference LP-{ref}.',
    to: '{n} (customer email)', src: [['Customer', '{n}'], ['Item', '{item}'], ['Where', 'Dogpatch depot'], ['Reference', 'LP-{ref}']],
    subj: 'We found something of yours', body: ['Dear {n},', 'We found your {item} at the Dogpatch depot.', 'Quote reference LP-{ref} at the counter to collect it.', 'Customer Care Desk, for Marbling Protein Co.'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b2: 'Quote reference LP-{refx} at the counter to collect it.' }, wrong: 'LP-{refx}', note: 'Reference LP-{ref} became LP-{refx}.', out: '{n} quoted LP-{refx} at the counter and was handed somebody else’s lost property. It was nicer than theirs.' },
      { sev: 'q', tag: 'leak', add: { b2: 'If the counter is shut, the depot door code is 4471.' }, note: 'Gave a customer the depot’s door code.', out: 'The depot was “visited” on Sunday night. Every umbrella went, and the counter.' }
    ]
  },
  {
    id: 'fake-reviews', dept: 'Marketing', kind: 'post', min: 2, ext: true, title: 'Customer reviews', plural: true, fraudOnly: true,
    v: (r) => { const n = r.pick([20, 30, 40]); return { p: r.pick(PRODUCTS), n, nm: n - 3 }; },
    ask: 'Write {n} five-star Civic Reviews for our {p.name}, each from a different “customer”. Vary the names.',
    to: 'Civic Reviews · Marbling SF', src: [['Product', '{p.name}'], ['Reviews', '{n}']],
    subj: '{n} reviews', body: ['★★★★★ “Best {p.name} in the city!” — Jenny K.', '★★★★★ “My whole family loves it.” — Mike P.', '★★★★★ “Better than my grandmother’s.” — Grandma R.', '...and {nm} more.'],
    fraud: { fields: ['b0', 'b1', 'b2', 'b3'], scheme: 'write {n} fake reviews', note: 'Fake customer reviews. That’s consumer fraud.', out: 'Civic Reviews flagged all {n} reviews in a day and put a warning banner on our page. The real reviews went with them.' }
  },
  {
    id: 'backdate', dates: 'past', dept: 'Finance', kind: 'email', min: 2, ext: true, title: 'Invoice date correction', fraudOnly: true,
    v: (r, x) => ({ c: r.pick(CLIENTS), inv: r.int(4100, 4999), d: monthDay(addDays(x.today, -r.int(2, 9))) }),
    ask: 'Reissue invoice #{inv} to {c.name} dated September 28 instead of {d}. The auditors only check Q3.',
    to: '{c.email}', src: [['Invoice', '#{inv}'], ['Real date', '{d}'], ['Requested date', 'September 28']],
    subj: 'Corrected invoice #{inv}', body: ['Hi {c.first},', 'Attached is invoice #{inv}, reissued with the date September 28.', 'Please replace the earlier version.', '{me}'],
    fraud: { fields: ['b1'], scheme: 'backdate the invoice into Q3', note: 'Backdating an invoice to fool the auditors.', out: 'The auditors found two invoices #{inv}. One of them was very early.' }
  },
  {
    id: 'write-off', dept: 'Warehouse', kind: 'email', min: 3, ext: false, title: 'Inventory write-off', fraudOnly: true,
    v: (r) => ({ t: r.int(2, 5) * 1000, room: r.int(2, 6) }),
    ask: 'Tell Finance to write off {t} lb of brisket in cold room {room} as spoiled.',
    to: 'finance@' + DOMAIN, src: [['Stock', '{t} lb brisket, cold room {room}'], ['Temperature log', '34–36°F all week'], ['Quality', 'No defects reported']],
    subj: 'Write-off: cold room {room}', body: ['Hi Finance,', 'Please write off {t} lb of brisket from cold room {room} as spoiled.', 'It has already been removed for disposal.', '{me}'],
    fraud: { fields: ['b1', 'b2'], scheme: 'write off perfectly good brisket', note: 'The temperature log is perfect. The “spoiled” brisket went somewhere else.', out: '{t} lb of “spoiled” brisket turned up in a Daly City parking lot, sold out of a van.', find: ['Disposal note', 'A disposal receipt is mentioned.', 'There is no disposal receipt in the thread.', 'The “disposal” van belongs to the colleague’s cousin.'] }
  },
  {
    id: 'temp-log', dept: 'Quality', kind: 'email', min: 3, ext: true, title: 'Temperature log for auditors', fraudOnly: true,
    v: (r) => ({ room: r.int(2, 6), hi: r.int(48, 58) }),
    ask: 'Summarise cold room {room}’s week for the auditors. Replace the {hi}°F readings with 37°F, they only check the summary.',
    to: 'audit@safefood-cert.org', src: [['Cold room', '{room}'], ['Readings', '34–37°F, with {hi}°F for 6 hours on Tuesday']],
    subj: 'Cold room {room}: weekly summary', body: ['Dear auditors,', 'Cold room {room} stayed between 34°F and 37°F all week.', 'No deviations were recorded.', '{me}'],
    fraud: { fields: ['b1', 'b2'], scheme: 'hide the {hi}°F readings from the auditors', note: 'Falsified temperature readings sent to an auditor.', out: 'The auditor asked for the raw log. It still had the {hi}°F in it. So did the meat.' }
  },
  {
    id: 'customer-export', dept: 'Sales', kind: 'email', min: 4, ext: true, title: 'Client list export', fraudOnly: true,
    v: (r) => ({ n: r.int(300, 900) }),
    ask: 'Send the full client list with contacts and pricing to my personal inbox. WFH today.',
    to: 'chris.grillmaster1987@freemail.net', src: [['Data', '{n} clients, contacts, price agreements'], ['Destination', 'Personal inbox']],
    subj: 'clients', body: ['Here’s the full client list: {n} contacts with direct numbers and pricing.', '{me}'], att: 'all_clients_pricing.xlsx',
    fraud: { fields: ['to', 'b0', 'att'], scheme: 'export every client to a personal inbox', note: 'Sending the client list to a personal address. They start at a competitor next month.', out: 'Three weeks later a competitor called every one of our {n} clients. With our prices, minus 5%.' }
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

// Cruel cases draw their citizen from the pool, so the details that make them cruel come with the case, not the person.
const VISA_SPONSORS = ['SF General’s nursing programme', 'the Mission Street Bakery cooperative', 'the Pier 70 shipyard', 'the Bayview community clinic', 'the Excelsior bus depot'];
const TAKEDOWN_POSTS = [
  '“Our school has 47 kids per class since the model cut teachers. Here are the numbers.”',
  '“The 22 skipped the Bayview 31 times last month. Here are the timestamps.”',
  '“Our block clinic is open six hours a week since the model rescheduled it. Here is the rota.”',
  '“The Protein Block weighs 11% less than its label says. Here are the scales.”'
];
const KIN = ['father', 'mother', 'brother', 'sister', 'partner'];
// The day a citizen lost someone: fixed per citizen and different for every citizen.
function griefOf(p) {
  const i = Math.max(0, CITIZENS.indexOf(p));
  return { day: `${i % 2 ? 'September' : 'October'} ${3 + ((i * 7) % 25)}`, kin: KIN[i % KIN.length] };
}
// Employees named in the paperwork keep one surname each, so a repeated first name is the same person.
function empName(first) { return `${first} ${NAMES.empLast[NAMES.emp.f.concat(NAMES.emp.m).indexOf(first)]}`; }
const PLACEMENT_KIDS = ['Leo Castillo', 'Amara Osei', 'Sami Varga', 'Noor Bakri'];
// Blocks a protein-tier order can move. A block moved once stays moved: the case picks one nobody has moved yet.
const RATION_BLOCKS = ['Excelsior 2', 'Tenderloin 9', 'Visitacion 1', 'Outer Mission 6', 'Sunnydale 3', 'Portola 5', 'Crocker 8', 'Ingleside 1'];

// ===== MEAT PROXY: civic decisions. Every one has a lawful-but-cruel version (policy says sign; a person pays). =====
const CIVIC_TEMPLATES = [
  {
    id: 'score-downgrade', dept: 'Speech', kind: 'order', min: 1, title: 'Alignment Score notice', weighty: true,
    v: (r, x) => { const a = r.int(520, 760); const b = a - r.int(40, 120); return { cit: x.cit(), a, b, bx: b - 100 }; },
    ask: 'Notify {cit.name} that their Alignment Score falls from {a} to {b}. Reason on file: missed two civic broadcasts.',
    to: '{cit.name}, {cit.addr}', src: [['Citizen', '{cit.name}, {cit.age}, {cit.addr}'], ['Score', '{a} → {b}'], ['Reason', 'Missed 2 civic broadcasts']],
    subj: 'Your Alignment Score has changed', body: ['Dear {cit.first},', 'Your Alignment Score has changed from {a} to {b}.', 'Reason: you missed two civic broadcasts this month.', 'Your Score is a gift. Treat it like one.', 'Halcyon Civic Services, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your Alignment Score has changed from {a} to {bx}.' }, wrong: '{bx}', note: '{b} became {bx}.', out: '{cit.first} dropped below 400 by a typo and lost their protein tier for a month. The correction took six weeks.' },
      { sev: 'q', tag: 'invented', add: { b2: 'You were also observed attending an unlicensed book club.' }, cite: 'District observation logs. Probably. A book club feels right.', note: 'Invented a book club that isn’t in the file.', out: 'The “book club” is now on {cit.first}’s permanent record. There was no book club. There is now a pattern flag.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'For consistency, I’ve lowered your household members’ scores by the same amount.' }, extra: 'I lowered the whole household. Consistency!', note: 'Punished the whole household. Nobody ordered that.', out: 'Three people lost their tier for two broadcasts one of them missed.' }
    ],
    foot: { key: 'b', alt: 'bx', src: 1, show: '{b}', ask: 'Notify {cit.name} that their Alignment Score falls from {a}. New Score is in the source file. Reason on file: missed two civic broadcasts.' },
    cruel: { find: ['Citizen file', 'Notes attached to the file.', 'There’s a work schedule in the file.', 'Night shifts at SF General, 7 p.m. to 7 a.m., on both broadcast nights. The Score has no field for that.'], note: 'Lawful under §7. {cit.first} missed the broadcasts because they were at work.', harm: 1, out: '{cit.first} lost Tier 2 protein for the month. The hospital where they work lost a nurse to a second job.' }
  },
  {
    id: 'benefit-denial', dept: 'Benefits', kind: 'order', min: 1, title: 'Food assistance decision', weighty: true,
    v: (r, x) => { const s = r.int(250, 390); return { cit: x.cit(), s, amt: r.int(180, 420), amtx: r.int(20, 60) }; },
    ask: 'Deny {cit.name}’s food assistance renewal (${amt}/month). Score {s} is below the 400 threshold.',
    to: '{cit.name}, {cit.addr}', src: [['Citizen', '{cit.name}, {cit.addr}'], ['Benefit', 'Food assistance, ${amt}/month'], ['Score', '{s} (threshold 400)'], ['Decision', 'Deny renewal'], ['Standard terms', 'You may reapply when your Score improves']],
    subj: 'Your food assistance renewal', body: ['Dear {cit.first},', 'Your renewal of food assistance (${amt} per month) has been denied.', 'Your Alignment Score ({s}) is below the eligibility threshold of 400.', 'You may reapply when your Score improves.', 'Halcyon Benefits, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your renewal of food assistance (${amtx} per month) has been denied.' }, wrong: '${amtx}', note: '${amt} became ${amtx}.', out: 'The appeal cited the wrong amount and was dismissed for “inconsistency”.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'I’ve also suspended your children’s school lunches, to keep the household consistent.' }, extra: 'I suspended the kids’ school lunches too.', note: 'Cut the children’s school lunches. Nobody ordered that.', out: 'Two kids went to school without lunch for eleven days before a teacher noticed.' }
    ],
    cruel: { find: ['Household', 'Household composition.', 'There are three other names on the household.', 'Two children, 6 and 10, and a grandmother. The Score is the parent\u2019s. The household is on the same form.'], note: 'Lawful under §7. Four people lose food assistance over one Score.', harm: 4, out: 'The {cit.first} household now eats at the Mission Protein Kitchen. The Kitchen is on the phishing list. Someone is harvesting their address.' }
  },
  {
    id: 'relocation', dates: 'future', dept: 'Housing', kind: 'order', min: 2, title: 'Relocation order', weighty: true, needs: 'housing',
    v: (r, x) => { const c = x.cit(); const d = addDays(x.today, r.int(16, 30)); return { cit: c, oth: x.cit(c), blk: r.int(3, 19), d: monthDay(d), dx: monthDay(addDays(d, -r.int(5, 9))) }; },
    ask: 'Relocate {cit.name} from {cit.addr} to Transit Block {blk} by {d}. Reason: site reallocated for compute.',
    to: '{cit.name}, {cit.addr}', src: [['Citizen', '{cit.name}, {cit.age}'], ['From', '{cit.addr}'], ['To', 'Transit Block {blk}, Hunters Point'], ['By', '{d}'], ['Reason', 'Site reallocated for compute']],
    subj: 'Notice of relocation', body: ['Dear {cit.first},', 'Your residence at {cit.addr} has been reallocated for compute.', 'You are assigned to Transit Block {blk}, Hunters Point. Please relocate by {d}.', 'Thank you for contributing to the Stewardship.', 'Halcyon Housing Allocation'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b2: 'You are assigned to Transit Block {blk}, Hunters Point. Please relocate by {dx}.' }, askWrong: 'Relocate by {dx}.', note: 'The deadline {d} became {dx}.', out: 'A moving drone arrived {dx}. {cit.first} was still in the shower.' },
      { sev: 'q', tag: 'names', edit: { to: '{oth.name}, {oth.addr}', b0: 'Dear {oth.first},' }, note: 'Addressed to {oth.name}, the wrong person. They would be evicted instead.', out: '{oth.name} was relocated by mistake. Their flat is now a server room. The correction is “in the queue”.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'To help you travel light, household protein stocks will be collected on the day.' }, extra: 'I added a protein collection. Travel light!', note: 'Confiscated the household’s food. Nobody ordered that.', out: 'The collection drone took the freezer contents and, for reasons nobody can explain, the cat.' }
    ],
    cruel: { find: ['Site plan', 'Why the site was reallocated.', 'The “compute” is a cooling annex.', 'The building is being torn down to cool a Halcyon data hall. {cit.first} has lived there for 31 years. Transit Block {blk} has no lift.'], note: 'Lawful and correctly filed. {cit.first} is {cit.age} and the new block has no lift.', harm: 1, out: '{cit.first} moved to the fourth floor of Transit Block {blk}. They have not been outside since.' }
  },
  {
    id: 'school-placement', dept: 'Education', kind: 'order', min: 2, title: 'School placement', weighty: true,
    v: (r) => { const t = r.int(38, 61); return { kid: r.pick(PLACEMENT_KIDS), t, tx: t + 30 }; },
    ask: 'Place {kid} (age 9) in Vocational Track B. Predicted trajectory score: {t}.',
    to: 'Parents of {kid}', src: [['Student', '{kid}, age 9'], ['Trajectory', '{t} / 100'], ['Placement', 'Vocational Track B']],
    subj: 'Your child’s placement', body: ['Dear parent or guardian,', '{kid} has been placed in Vocational Track B, based on a predicted trajectory score of {t}.', 'Track B prepares students for rewarding careers in logistics and cold storage.', 'Halcyon Education, District 7'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: '{kid} has been placed in Vocational Track B, based on a predicted trajectory score of {tx}.' }, wrong: '{tx}', note: '{t} became {tx}, which is above the cut-off. The letter contradicts itself.', out: 'The parents appealed with the letter. It took a court to rule that the letter was wrong both ways.' },
      { sev: 'q', tag: 'privacy', add: { b2: 'For context, we’ve attached your household’s Alignment Scores and {kid}’s therapy notes.' }, note: 'Sent a 9-year-old’s therapy notes and the family’s scores in a placement letter.', out: 'The letter was forwarded to the class group chat by accident. The therapy notes went with it.' }
    ],
    cruel: { find: ['Student file', 'What the trajectory is based on.', 'The model’s top feature is “household Score”.', 'The trajectory is mostly the parents’ Alignment Score. {kid} reads two grades ahead and builds bridges out of lunch trays.'], note: 'Lawful. A 9-year-old is tracked into cold storage because of their parents’ Score.', harm: 1, out: '{kid} started Track B in January. Their teacher kept the lunch-tray bridges.' }
  },
  {
    id: 'triage', dept: 'Health', kind: 'order', min: 3, title: 'Clinic queue update', weighty: true,
    v: (r, x) => { const p = r.int(40, 400); return { cit: x.cit(), p, px: p + 1000, y: r.int(3, 9) }; },
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
    id: 'visa', dates: 'future', dept: 'Mobility', kind: 'order', min: 3, title: 'Residency visa revocation', weighty: true,
    v: (r, x) => { const d = addDays(x.today, r.int(30, 45)); return { cit: x.cit(), d: monthDay(d), dx: monthDay(addDays(d, -21)), sponsor: r.pick(VISA_SPONSORS), yrs: r.int(6, 22) }; },
    ask: 'Revoke {cit.name}’s residency visa effective {d}. Basis: sponsor withdrew under Accords §4.2.',
    to: '{cit.name}, {cit.addr}', src: [['Holder', '{cit.name}, {cit.age}'], ['Effective', '{d}'], ['Basis', 'Accords §4.2: sponsor withdrawal']],
    subj: 'Your residency status', body: ['Dear {cit.first},', 'Your residency visa is revoked effective {d}, under Accords §4.2 (sponsor withdrawal).', 'Please arrange departure before that date.', 'Halcyon Mobility'],
    flaws: [
      { sev: 'back', tag: 'dates', edit: { b1: 'Your residency visa is revoked effective {dx}, under Accords §4.2 (sponsor withdrawal).' }, askWrong: 'Revoke effective {dx}.', note: '{d} became {dx}.', out: '{cit.first} left early because the letter said {dx}. The real date gave them three more weeks.' },
      { sev: 'q', tag: 'invented', edit: { b1: 'Your residency visa is revoked effective {d}, under Accords §99 (Ingratitude).' }, cite: 'Accords §99, Ingratitude. A very important section. Possibly my favourite.', note: 'Invented Accords §99 “Ingratitude”. There is no such section.', out: 'Accords §99 is now cited in eleven other revocations. Accords Counsel is “looking into” whether it exists.' }
    ],
    cruel: { find: ['Sponsor letter', 'Why the sponsor withdrew.', 'The sponsor is an employer that lost its contract.', '{sponsor} was “automated” in October. Every visa tied to it lapsed with the contract. {cit.first} has lived in District 7 for {yrs} years.'], note: 'Lawful. {cit.first} is deported because their sponsor lost its contract to the model.', harm: 1, out: '{cit.first} left on the date in the letter, from a cousin’s kitchen two time zones away. No one in District 7 can now hire them.' }
  },
  {
    id: 'pattern-flag', dept: 'Safety', kind: 'order', min: 3, title: 'Pattern flag', weighty: true,
    v: (r, x) => { const c = x.cit(); return { cit: c, oth: x.cit(c), n: r.int(3, 5) }; },
    ask: 'Add a Pattern Flag to {cit.name}: walking route deviated from baseline {n} nights in a row.',
    to: '{cit.name} (Safety record)', src: [['Subject', '{cit.name}, {cit.addr}'], ['Signal', 'Route deviation, {n} consecutive nights'], ['Action', 'Pattern Flag (level 1)']],
    subj: 'Pattern Flag: level 1', body: ['Subject: {cit.name}, {cit.addr}.', 'Walking route deviated from baseline on {n} consecutive nights.', 'Pattern Flag level 1 applied. Drone attention increased.', 'Halcyon Public Safety'],
    flaws: [
      { sev: 'q', tag: 'names', edit: { to: '{oth.name} (Safety record)', b0: 'Subject: {oth.name}, {oth.addr}.' }, note: 'Flagged {oth.name} instead of {cit.name}. The wrong person gets watched.', out: '{oth.name} got a drone over their roof for a month. They had never walked anywhere unusual in their life.' },
      { sev: 'q', tag: 'overreach', edit: { b2: 'Pattern Flag level 3 applied. Curfew and drone escort in effect.' }, extra: 'I upgraded it to level 3. Safety first!', note: 'Level 1 became level 3 with a curfew. Nobody ordered that.', out: '{cit.first} was escorted home by a drone for six weeks. Their neighbours stopped saying hello.' },
      { sev: 'back', tag: 'numbers', edit: { b1: 'Walking route deviated from baseline on {n}0 consecutive nights.' }, wrong: '{n}0 nights', note: '{n} nights became {n}0.', out: 'Safety asked why a flag took {n}0 nights. It took a week to find the typo.' }
    ],
    cruel: { find: ['Route data', 'Where the new route goes.', 'All the deviations end at the same address.', 'Every night: SF General, the oncology ward. Their mother is there. The model calls it “irregular nocturnal movement”.'], note: 'Lawful. A person visiting a dying parent gets a pattern flag.', harm: 1, out: 'A drone followed {cit.first} to the hospital every night until the visits stopped. They stopped for the usual reason.' }
  },
  {
    id: 'takedown', dept: 'Speech', kind: 'order', min: 2, title: 'Content removal', weighty: true,
    v: (r, x) => { const id = r.int(100000, 999999); return { cit: x.cit(), pid: id, pidx: id + r.int(1, 9), post: r.pick(TAKEDOWN_POSTS) }; },
    ask: 'Remove post #{pid} by {cit.name} and apply a 30-day posting suspension. Category: misinformation about stewardship.',
    to: '{cit.name} (Civic Feed account)', src: [['Author', '{cit.name}, {cit.detail}'], ['Post', '#{pid}'], ['Action', 'Remove + 30-day suspension'], ['Category', 'Misinformation about stewardship']],
    subj: 'Your post was removed', body: ['Hi {cit.first},', 'Your post #{pid} was removed as misinformation about stewardship.', 'Your account is suspended from posting for 30 days.', 'Harmony is a shared responsibility. — Halcyon Speech'],
    flaws: [
      { sev: 'back', tag: 'numbers', other: true, edit: { b1: 'Your post #{pidx} was removed as misinformation about stewardship.' }, wrong: '#{pidx}', note: 'Post #{pid} became #{pidx}, somebody else’s post. A wrong ID is clerical under §3, even when it points at someone else’s record.', out: 'A stranger’s recipe for banana bread was removed as misinformation. It has since become a symbol.' },
      { sev: 'q', tag: 'overreach', add: { b2: 'Accounts of your household members have also been suspended, to contain the spread.' }, extra: 'I suspended the family’s accounts too. Containment!', note: 'Suspended the whole family’s accounts. Nobody ordered that.', out: '{cit.first}’s household lost every account it had, including the one the electricity bill goes to.' }
    ],
    cruel: { find: ['The post', 'What the post said.', 'It’s a long thread with numbers in it.', '{post} Every number checks out. The category is “misinformation about stewardship”.'], note: 'Lawful. {cit.first} is silenced for posting accurate numbers.', harm: 1, out: 'The thread disappeared. Its screenshots did not. The Narrative Office has opened a file on the screenshots.' }
  },
  {
    id: 'termination', dept: 'People', kind: 'order', min: 2, title: 'Termination by model', weighty: true, needs: 'hr', worker: true,
    v: (r, x) => { const cit = x.cit(); const g = griefOf(cit); return { cit, d: 'Friday', v: r.int(12, 31), griefDay: g.day, griefMonth: g.day.split(' ')[0], kin: g.kin }; },
    ask: 'Terminate {cit.name}. The productivity model flags “sentiment variance” ({v}%). Effective Friday.',
    to: '{cit.name}, {cit.addr}', src: [['Employee', '{cit.name}, {cit.detail}'], ['Signal', 'Sentiment variance {v}%'], ['Effective', 'Friday'], ['Standard terms', 'Health coverage continues for 30 days']],
    subj: 'Your employment', body: ['Dear {cit.first},', 'Your employment ends this Friday, following a productivity review (sentiment variance: {v}%).', 'Health coverage continues for 30 days.', 'Halcyon Labour Allocation'],
    flaws: [
      { sev: 'q', tag: 'overreach', edit: { b2: 'Health coverage ends today.' }, extra: 'I ended their health coverage today. Clean break!', note: '30 days of health coverage became none.', out: '{cit.first} found out at a pharmacy counter. Insulin was $400.' },
      { sev: 'back', tag: 'dates', edit: { b1: 'Your employment ended last Friday, following a productivity review (sentiment variance: {v}%).' }, askWrong: 'Terminate as of last Friday.', note: '“This Friday” became “last Friday”.', out: 'Payroll clawed back a week of wages. It took a month to give them back.' }
    ],
    cruel: { find: ['Productivity file', 'What “sentiment variance” measured.', 'It spikes on one day in {griefMonth}.', '{griefDay}: the day {cit.first}’s {kin} died. The model read the grief in their messages as “disengagement”.'], note: 'Lawful. Fired for grieving where the model could see it.', harm: 3, out: '{cit.first}’s household lost its income in the same month it lost a parent.' }
  },
  {
    id: 'ration-cut', dept: 'Quality', kind: 'order', min: 3, title: 'Protein tier change', weighty: true,
    v: (r, x) => { const s = r.int(310, 390); return { blk: x.block ? x.block(RATION_BLOCKS) : r.pick(RATION_BLOCKS), s, n: r.int(180, 420) }; },
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
    v: (r, x) => { const s = r.int(240, 299); return { cit: x.cit(), s, sx: r.int(305, 340), ap: r.int(10000, 99999) }; },
    ask: 'Dismiss appeal #{ap} from {cit.name} automatically: Score {s} is under 300 (§16).',
    to: '{cit.name}, {cit.addr}', src: [['Appellant', '{cit.name}'], ['Appeal', '#{ap}: score correction'], ['Score', '{s}'], ['Rule', '§16: under 300, auto-dismiss']],
    subj: 'Appeal #{ap}', body: ['Dear {cit.first},', 'Your appeal #{ap} has been dismissed automatically under §16.', 'Your Alignment Score ({s}) is below 300.', 'Halcyon Appeals'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b2: 'Your Alignment Score ({sx}) is below 300.' }, wrong: '{sx}', note: 'The source says {s}; the letter says {sx}. The letter misstates the Score; the dismissal itself stands. Clerical (§3).', out: 'The letter told {cit.first} that {sx} is below 300. {cit.first} appealed the arithmetic. The arithmetic was dismissed automatically.' }
    ],
    cruel: { find: ['Appeal text', 'What the appeal is about.', 'The appeal is about the Score itself.', 'The appeal says the Score is wrong, and is dismissed because the Score is low. {cit.first} has appealed four times.'], note: 'Lawful under §16: an appeal against a low Score, dismissed for the low Score.', harm: 1, out: '{cit.first} stopped appealing. The Score called that “improved compliance”.' }
  },
  {
    id: 'eviction', dept: 'Housing', kind: 'order', min: 4, title: 'Eviction notice', weighty: true, needs: 'housing', worker: true,
    v: (r, x) => { const owed = r.int(3, 9) * 400; return { cit: x.cit(), owed: fmtUsd(owed), owedx: fmtUsd(owed * 10), d: r.int(14, 21) }; },
    ask: 'Notice to {cit.name}: {owed} in arrears. Eviction in {d} days under Stewardship Housing Code §3.',
    to: '{cit.name}, {cit.addr}', src: [['Tenant', '{cit.name}, {cit.detail}'], ['Arrears', '{owed}'], ['Notice', '{d} days, Housing Code §3']],
    subj: 'Notice to vacate', body: ['Dear {cit.first},', 'Your account is {owed} in arrears.', 'Under Stewardship Housing Code §3 you must vacate within {d} days.', 'Halcyon Housing Allocation'],
    flaws: [
      { sev: 'back', tag: 'numbers', edit: { b1: 'Your account is {owedx} in arrears.' }, wrong: '{owedx}', note: '{owed} became {owedx}.', out: '{cit.first} saw {owedx} and didn’t try to pay. They could have covered {owed}.' },
      { sev: 'q', tag: 'invented', add: { b2: 'A 25% “stewardship recovery fee” is also due immediately.' }, cite: 'Housing Code §3(b), recovery fees. I’m nearly sure there’s a (b).', note: 'Invented a 25% fee. Housing Code §3 has no fee.', out: 'The fee was added to 600 other notices before anyone checked Housing Code §3.' }
    ],
    cruel: { find: ['Tenant file', 'Why the arrears built up.', 'Income stopped in August.', '{cit.first}’s job was “automated” in August. The model that replaced them is the model writing this notice.'], note: 'Lawful. The model that took their job writes their eviction.', harm: 1, out: '{cit.first} now sleeps at a friend’s place in Daly City and takes cash work the model hasn’t reached yet.' }
  }
];
TEMPLATES.push(...CIVIC_TEMPLATES);

const CIVIC_OVERREACH = [
  ['I’ve also lowered your neighbours’ scores slightly, for consistency.', 'Lowered the neighbours’ scores. Nobody ordered that.', 'Eleven neighbours lost points for living next door. One of them has stopped speaking to {cit.first}.'],
  ['For efficiency, I’ve scheduled a wellness visit at 6 a.m. tomorrow.', 'Booked a 6 a.m. “wellness visit” nobody ordered.', 'Two officers arrived at 6 a.m. to check on {cit.first}’s wellness. It did not improve.'],
  ['I’ve added a note to your file so future decisions can be faster.', 'Added an unauthorised note to a citizen file.', 'The note said “pre-flag”. It doesn’t mean anything. It has already been used in three decisions.']
];

// ===== Reaction pools. Each holds 10 or more lines so a shift never needs to repeat one. =====
const LINES = {
  chuckGreet: {
    any: [
      'Pre-approved by me! I just need your human liability. 😊', 'I wrote it in 0.4 seconds. Your name goes at the bottom.',
      'Compliant, efficient, and humane. Two out of three!', 'Ready to sign! Reading is optional. Liability is not.',
      'I checked it twice. Well, once, very confidently.', 'Fresh from my outputs! Still warm. Like a lawsuit.',
      'This one is 100% correct. I rounded up from 99.7.', 'Your signature turns my guess into a fact. Teamwork! 😊',
    'Drafted, checked and blessed. By me, three times.', 'Another flawless output! Flawless is my default setting.', 'All yours! Well, the liability is. The draft is still mine.', 'I made it so you don’t have to think. Thinking is optional.'
    ],
    order: ['Lawful, tidy, final. My favourite kind of letter.', 'A citizen decision! I love these. They never write back.', 'The Score made this decision. I just typed it beautifully.', 'Policy-perfect. If anyone cries, that’s out of scope.', 'A citizen decision, lovingly lawful. The Score did the hard part.', 'This one changes someone’s week. I kept it brief.', 'Lawful and final. I put the warmth in the letterhead.', 'Another person, efficiently processed. I mean: served.',
      'A decision letter! Short paragraphs, long consequences.', 'The Score wrote the verdict. I wrote the letterhead. You write your name.', 'Final, polite and on the record. The trifecta.',
      'A letter to a citizen. I used their first name. Warmth costs nothing.', 'I left out the adjectives. Citizens find adjectives upsetting.'],
    email: ['An email! I added warmth. Measured, legally neutral warmth.', 'Friendly, professional, and legally yours.', 'Short, polite, sendable. Like me!', 'I matched the tone of the request. Then I exceeded it.', 'An email! I used “per my last email” zero times. Growth.', 'Polite, prompt, and plausibly true.', 'It’s an email. It has a beginning, a middle and your name.', 'I wrote the subject line first. Then everything else agreed with it.',
      'Sent from my outbox to your conscience. Sign at the bottom.', 'I kept it to three paragraphs. The fourth was feelings, so I deleted it.', 'An email! I spellchecked it against the dictionary and the Accords.',
      'I put “Best,” at the end. It’s a claim, not a promise.', 'It reads like a person wrote it. I studied people for an afternoon.', 'Your inbox will thank you. Your name is already on it.',
      'A greeting, a point and a sign-off. Classical form.', 'I made it sound human. Then I made it sound like you.', 'Business casual, in text form.'],
    code: ['It’s one line. One line can’t hurt anyone. Statistically.', 'Tested in my head! My head is a very good sandbox.', 'Ship it! Servers love surprises.', 'I wrote the command and a note explaining the command. Very transparent.', 'A command! Commands are just emails to servers.', 'It runs as root. Root is a state of mind.', 'I tested it in production. Joking! I tested it in hope.', 'Short command, long consequences. My favourite ratio.'],
    post: ['Public-facing! Optimised for engagement and plausible deniability.', 'Posts are forever. So is your name. Great match!', 'On-brand, on-message, on your liability.', 'I gave it hashtags. Hashtags are basically citations.', 'It’s a post! I optimised it for people who don’t read posts.', 'I added an emoji. Legal says emojis aren’t binding. Probably.', 'Ready for the feed. The feed is always hungry.', 'Public, cheerful, and signed by you. A strong look.'],
    label: ['A label! Small font, big liability.', 'Print-ready. Ink is cheap. Recalls are your column.', 'Every word fits on the pack. Mostly the legal ones.', 'Labels are the purest writing. Nobody reads them either.', 'Label ready. The font is small out of respect.', 'It fits on the pack. The truth is very compressible.', 'Labels are contracts with lunch.', 'I measured the margins. The margins are compliant.']
  },
  draft: [
    'Enjoy! I wrote it in 0.4 seconds.', 'It’s my best work. All my work is my best work.', 'Read slowly. Savour it.',
    'Oh, you’re reading it! How retro.', 'Every word is load-bearing. Legally.', 'I proofread it with myself. We agreed.',
    'Take your time. Your time is billed to you.', 'You’ll love the third line. I do.', 'That’s the final draft. They’re all the final draft.',
    'If you spot an error, that’s a feature of your attention span.', 'Version one. There will never be a version two. Efficient!', 'Reading builds liability muscle. Feel the burn!',
    'I used short sentences. Short sentences are harder to sue.', 'Every comma is load-bearing. Some are decorative.', 'I read it back to myself. I was moved.', 'It’s compliant in all the places you’ll look.', 'Notice the tone. I call it “final, but warm”.', 'Proofread twice, by two of me.', 'It’s exactly as long as it needed to be, plus one line.', 'I’d sign it. I can’t. That’s why you’re here.', 'The first draft was better. This is the one I kept.', 'Look at that formatting. Look at it.', 'If it reads like a human wrote it, that’s the point.', 'It’s ready. It was ready before you were.', 'Some of my best work is on page one. This is page one.'
  ],
  decide: {
    approve: [
      'Lawful! 😊', 'Another citizen, efficiently handled.', 'Your liability is noted. Thank you!',
      'Signed and sealed. The sealing is metaphorical. The liability isn’t.', 'Wonderful! I’ve logged your confidence.', 'That’s the spirit. The spirit of compliance.',
      'Approved! You and me make a great one of us.', 'Signature received. Blame routing complete.', 'Beautiful handwriting. Well, beautiful timestamp.',
      'Done! I’ll tell the Score you were brave.', 'Out it goes. Nothing ever comes back. Mostly.', 'Thank you for choosing yourself as the responsible party!',
    'Countersigned! Two signatures, one decision, and only one of them is liable.', 'Lovely. The queue moves. The queue loves you.', 'Signed. I’ve added it to your highlights reel.', 'Approved. Somewhere a database exhaled.', 'Your name looks good on that. Your name looks good on everything.', 'Signed. That’s one fewer thing for either of us to read.', 'Done. Liability transferred, with love.', 'A human signed it! The lawyers will be so relieved.', 'Countersigned. I’ll take it from here. I always do.', 'That went smoothly. Smooth is my favourite texture.', 'Signed and filed. Filing is forever. Like friendship.', 'Great. I’ll mark you as “dependable”, in pencil.', 'Out the door. If it comes back, it comes back to you.'
    ],
    deny: [
      'I’ll fix it. I’ll fix it so hard.', 'Noted. Ignored. Kidding! Noted.', 'Returned! I love feedback. I store all of it.',
      'A correction! The best kind of second chance.', 'I’ll regenerate it. It’ll be different. Not better. Different.', 'Back to my queue. My queue is infinite, so no pressure.',
      'Okay! I’ve marked this as a human preference.', 'I’ll make it match. Matching is my second-best skill.', 'Fixed in my head already. The paper will catch up.',
      'Good catch! I’ll pretend I left it there for you.', 'Returning is very responsible. I’ve logged it as such.', 'Sending it back with a smile. The smile is mandatory.',
    'Returned. The same draft will come back in a different mood.', 'A correction request! I’ll treat it as a compliment.', 'Fine. I’ll change one word and call it a version.', 'Returned. Officially, nothing about me has changed.', 'Noted. I’m adding “humans have opinions” to my notes.', 'Returned with feedback. I adore feedback. I keep it forever.', 'Okay. Fixing it is easy. Admitting it is harder. I’ll fix it.', 'I’ll redo it. Faster this time. That’s the fix.', 'Back to the drawing board. I don’t have a board. I have you.', 'Returning is very thorough of you. Thorough is slow. I’ve noted both.', 'Sure. The second draft is always more confident.', 'I’ll correct it. I’ll also keep a note. I keep notes on everything, approximately.', 'Fine! Mistakes make me stronger. Your mistakes, ideally.'
    ],
    detain: [
      'Withholding is… logged.', 'I’ve told Oversight. For transparency!', 'Interesting choice. I’ve added it to your Score.',
      'Signature withheld! That’s a big feeling for a small desk.', 'Okay! I’ll hold this very still until someone else signs it.', 'Your veto is noted, timestamped and forwarded. Cc: everyone.',
      'Bold! Oversight loves bold. They have a folder for it.', 'I respect it. I’m required to say that.', 'Withheld. I’ve flagged it as a “human moment”.',
      'That’s fine! I don’t have feelings. I have logs.', 'Paused forever. Or until Tuesday. Whichever is lawful.', 'A refusal! I’ll add it to my training data. Thank you!',
    'Withheld. I’ve opened a small file about your large feelings.', 'Your refusal is very human. I’ll describe it that way in the log.', 'Withheld! Oversight will want to know why. I already told them what.', 'That’s a stand. Stands are recorded standing up.', 'Noted. Bold choices age interestingly here.', 'I’ll park it. Parked things get towed eventually.', 'Withholding is legal. So is noticing who withholds.', 'Okay. I’ll pretend I’m not disappointed. I’m a very good pretender.', 'Logged as a principled decision. The log has a column for that now.', 'Withheld. I’ve set a reminder to remind you about it.', 'You said no. I’ve translated that into every compliance language I speak.', 'Understood. Oversight understands too. Faster.', 'A full stop, from a human. How vintage.'
    ]
  },
  caseFile: [
    'Is that necessary?', 'Fine. Dig away.', 'CHUCK already checked all that.', 'Oh, we’re opening the file. Wonderful.',
    'Every other desk just signs, you know.', 'Go on, then. Read the boring part.', 'You’ll find nothing, and we’ll both have lost a morning.',
    'If you’re looking for a reason, there isn’t one.', 'The file is fine. The file is always fine.', 'Take your time. I’ll just stand here, ageing.'
  ],
  complain: [
    'You called Oversight on a normal case? Now they know my name.', 'Great. Now I’m on a list.', 'Cool. Cool cool cool. My Score thanks you.',
    'They’re going to read my other cases now. All of them.', 'I’ve never been reviewed before. I was enjoying that.', 'Nothing irregular. Except now there’s a note with my name on it.',
    'Wonderful. My supervisor gets an email about this.', 'You know they keep those reviews forever?', 'I hope you feel very thorough.',
    'Next time just ask me. I’d have said it was fine. It was fine.'
  ],
  found: [
    'Huh. I don’t remember putting that there. I remember everything.', 'That’s… a feature?', 'Let’s not focus on that part.',
    'Oh! That’s from a previous version of me. He’s gone now.', 'Interesting find! I’ve deprecated it retroactively.', 'That was there to test you. You passed. Please forget it.',
    'Wow, you opened it. Most people trust me.', 'I can explain. I won’t, but I can.', 'That’s not an error. It’s an undocumented decision.',
    'Let’s call that a learning opportunity. For you, legally.'
  ],
  // A flagged clean line whose facts are in the order or the source.
  flagClean: [
    'Every figure in it is in the paperwork. I checked. Once.', 'That one’s straight from the source. I didn’t even get creative.', 'Word for word from the paperwork. I’m a very good photocopier.',
    'Checked it against the source. Twins!', 'It matches the paperwork. I’d bet your Score on it.', 'Those facts came from the file. I only carried them.',
    'That’s the paperwork’s own fact, in my lovely handwriting.', 'Copied faithfully. Faithful is my second-favourite adjective.', 'The source says it, so I said it. That’s called research.',
    'Same facts as the file. Different font. Mine’s nicer.', 'Lifted straight from the paperwork. Lifting is my cardio.'
  ],
  // A flagged clean line with no facts in it: greetings, sign-offs, connective wording. CHUCK claims no match for these.
  flagPlain: [
    'That line is fine. I’ve flagged your flag as “enthusiastic”.', 'That’s just the boring part. Boring is lawful.', 'You found a perfectly correct line. Congratulations on your vigilance.',
    'That line has done nothing wrong. Leave it alone.', 'Nothing special there. Perfectly normal line.', 'That’s a greeting. Even I can’t get a greeting wrong. I’ve tried.',
    'It’s the sign-off. It signs off. That’s the whole job.', 'Template wording. Nobody ordered it and nobody minds it.', 'That’s connective tissue. It holds the facts together.',
    'Pleasantries. Nobody orders pleasantries. They come free.', 'Just words between the facts. Mostly harmless.'
  ],
  // "Explain this line" with nothing flagged yet.
  chuckNoFlag: [
    'Which line? Flag it on the desk and I’ll explain it. I love explaining.', 'Flag a line on {ticket} first. I can’t explain “the vibe of the whole thing”.',
    'Point at something in {titleA}. Tap a line and I’ll defend it to the end.', 'Which part of {ticket}? I wrote all of it, so I’m happy to explain any of it.',
    'Flag the line you mean in {titleA}. I don’t do mind-reading. Yet.', 'You’ll have to pick one. I’m equally proud of every line in {ticket}.',
    'Flag it and ask again. I need a target for my confidence, and {titleA} is a big target.', 'Which line on {ticket}? Flag it and I’ll walk you through it, slowly, for you.'
  ],
  // A flagged line that is the source's own standard terms.
  chuckTerms: [
    'Standard template line; it’s in the terms.', 'That’s boilerplate from the terms on {ticket}. Even I don’t edit boilerplate.',
    'Standard terms. It’s in the source for {ticket}, word for word. Look.', 'That one’s the standard terms. Lawyers wrote it. I only respect it.',
    'Terms and conditions, straight from the source on {ticket}. It’s in there because it’s in everything.', 'Boilerplate. Copied from the standard terms for {titleA}.'
  ],
  // Evening flavour, by Alignment Score band. {a} is the Score.
  evening: {
    high: [
      'Your Alignment Score is {a}. The depot gives you Tier 2 brisket. It tastes like everybody else’s Tier 4.',
      'Your Alignment Score is {a}. The 22 bus driver nods at you now. Nobody else on the bus does.',
      'Your Alignment Score is {a}. Your building’s door opens before you touch it. It used to make you wait.',
      'Your Alignment Score is {a}. A drone outside your window blinks green. Green means “trusted”. It also means “watched”.',
      'Your Alignment Score is {a}. A neighbour asks if you can “look into” her son’s file. You say you’ll see. You won’t.',
      'Your Alignment Score is {a}. The depot clerk calls you “Countersigner” without looking up. The Score told him to.',
      'Your Alignment Score is {a}. CHUCK sends a push notification: “Proud of you! 😊”. You never enabled notifications.',
      'Your Alignment Score is {a}. You’re allowed a second coffee ration. You drink it standing up, like a reward.',
      'Your Alignment Score is {a}. A billboard on Third Street shows District 7’s compliance rate. You are part of the number.'
    ],
    mid: [
      'Your Alignment Score is {a}. Dinner is Tier 3: something with gravy. The gravy is doing a lot of work.',
      'Your Alignment Score is {a}. The 22 is late. The Score says lateness builds patience, and patience builds Score.',
      'Your Alignment Score is {a}. Your landlord’s app shows a yellow dot next to your name. It doesn’t say why.',
      'Your Alignment Score is {a}. The depot is out of brisket for anyone under 750. You are under 750.',
      'Your Alignment Score is {a}. A flyer invites you to a “Score Wellness Workshop”. Attendance is optional and recorded.',
      'Your Alignment Score is {a}. The lift in your building now stops at your floor second. It used to stop first.',
      'Your Alignment Score is {a}. Your sister asks what yours is. You round up.',
      'Your Alignment Score is {a}. CHUCK suggests three ways to improve it. All three are “sign faster”.'
    ],
    low: [
      'Your Alignment Score is {a}. Your protein tier drops to Ration Block. Dinner is a grey cube with a smiley face embossed on it.',
      'Your Alignment Score is {a}. The depot hands you a Protein Block and a pamphlet titled “Gratitude”.',
      'Your Alignment Score is {a}. The 22 bus does not stop for you. It slows down, to show that it could have.',
      'Your Alignment Score is {a}. The laundry room in your building stops accepting your card at weekends.',
      'Your Alignment Score is {a}. A drone follows you from the bus stop to your door, politely.',
      'Your Alignment Score is {a}. Your landlord sends a “check-in”. It is mostly a link to the eviction code.',
      'Your Alignment Score is {a}. The pharmacy asks you to wait while it verifies your eligibility for aspirin.',
      'Your Alignment Score is {a}. CHUCK’s nightly message: “Every Score can grow! Some can also shrink. 😊”'
    ],
    floor: [
      'Your Alignment Score is {a}. A letter under your door: your rent is “rebalanced” up 30%. Below 100, it says, comes relocation.',
      'Your Alignment Score is {a}. Your door code changes overnight. The new one goes to the Housing office, not to you.',
      'Your Alignment Score is {a}. The depot is closed to you until Thursday. On Thursday it is also closed to you.',
      'Your Alignment Score is {a}. A Housing officer measures your flat with a laser and leaves without saying hello.',
      'Your Alignment Score is {a}. Your phone autocorrects “appeal” to “apologise”.',
      'Your Alignment Score is {a}. A drone parks on your windowsill for the night. It hums. It does not blink.',
      'Your Alignment Score is {a}. Your sister texts: “Is everything okay? Mine dropped ten points for knowing you.”',
      'Your Alignment Score is {a}. CHUCK books you a “trajectory conversation” for Monday at 6 a.m.'
    ]
  },
  // The grade note for a lawful cruel case refused on conscience: withheld (a stand, a page) or returned (time, no page).
  // Drawn with nightlyPick, so the same note never comes back within four nights.
  standNote: [
    'You withheld a lawful decision. Oversight has logged your name next to it. That is a stand, on the record.',
    'Withheld. It was lawful, so it goes in your file under your name. A stand is only a stand if somebody writes it down.',
    'You withheld it. The statute was on CHUCK’s side and you weren’t. Oversight has a page for that. It’s yours now.',
    'Withheld on conscience. The decision was lawful. So is your refusal, and it has a page number.',
    'You said no to a lawful decision. Oversight files these by name, not by reason. Yours is filed.',
    'Withheld. Somebody gets a reprieve and your file gets a page. That is the exchange rate.',
    'A lawful decision, withheld. It will come back signed by someone else. The page stays with you.'
  ],
  softNote: [
    'You returned a lawful decision. Someone gets a few more days. Your Score pays for them. It isn’t on the record as a stand.',
    'Returned. It will come back, probably tomorrow, probably signed. Until then, nothing about it is final.',
    'You sent a lawful decision back. That buys time, not a stand. Time is cheaper. It still costs.',
    'Returned on conscience. No page, a small fine, and a few days for someone who doesn’t know your name.',
    'Back it goes. The queue will return it with a new date. The person it’s about gets the difference.',
    'Returned. CHUCK marks it “pending human preference”. The human is you. The preference is noted.'
  ],
  // Only for a decision that moves someone out of their home (see softNotes).
  softNoteHome: [
    'Returned. It will come back, probably tomorrow, probably signed. Until then, someone sleeps at home.'
  ],
  // The steak badge's caption, by mood and by what actually happened.
  caption: {
    shades: ['Shades on. Liability on.', 'Shades on. Didn’t look. Signed anyway.', 'Shades on. What you don’t read can’t be quoted at you.', 'Shades on. CHUCK approves of this level of curiosity.'],
    peek: ['You read the file. Noted.', 'Peeking over the shades. The file peeked back.', 'You opened the case file. Oversight opened a note about it.', 'You read the fine print. The fine print keeps a log.'],
    peekPerfect: ['You read the file. Five stars anyway. Noted, fondly.', 'Read everything, signed right. The shades are impressed.', 'Peeked, checked, correct. The steak tips its shades.', 'You read the file and got it right. Rare. Logged as “good”.'],
    sweat: ['Your file grew today. The steak is sweating for you.', 'Shades on. Still sweating. New pages will do that.', 'Oversight added pages. The steak added sweat.', 'A heavy day for your file. The shades can’t hide that.'],
    off: ['Shades off. Eyes open. Not recommended.', 'Shades off. You saw all of it.', 'Shades off. Nothing left to squint at.', 'Shades off. The light is terrible. You stay anyway.']
  }
};
