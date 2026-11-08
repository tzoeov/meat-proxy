'use strict';

const START_DATE = { y: 2031, m: 11, d: 10 };
const CAMPAIGN_DAYS = 10;
const SHIFT_START_MIN = 9 * 60;
const COMPANY = 'Halcyon';
const DOMAIN = 'halcyon.gov';
const LAB = 'Halcyon';
const HQ = 'Countersignature Office, District 7 · Dogpatch, San Francisco';

const SEAL_COLORS = {
  red: '#a8322d', green: '#3f6e3a', blue: '#2f557f', violet: '#5a3d7a',
  ochre: '#9a6b22', black: '#2b2b2b', teal: '#1f8a99', brown: '#6b4a2b',
  pink: '#a3456f'
};

// Stewardship stamps. Wrong symbol or colour means forged.
const STAMPS = {
  finance: { dept: 'Treasury', glyph: '◆', color: 'green', text: 'TREASURY · VERIFIED', fmt: 'TRS-##-####', approver: ['Agnes Okafor', 'Rupert Murphy'] },
  legal: { dept: 'Accords Counsel', glyph: '⚖', color: 'violet', text: 'ACCORDS COUNSEL', fmt: 'ACC/####', approver: ['Hortense Cohen'] },
  quality: { dept: 'Protein Authority', glyph: '✚', color: 'brown', text: 'PROTEIN AUTHORITY', fmt: 'PA-#####', approver: ['Mabel Tanaka'] },
  comms: { dept: 'Narrative Office', glyph: '✎', color: 'blue', text: 'NARRATIVE OFFICE', fmt: 'NAR-###', approver: ['Philippa Shah'] },
  it: { dept: 'Systems', glyph: '⚙', color: 'black', text: 'SYSTEMS CHANGE', fmt: 'SYS#######', approver: ['Clement Brooks'] },
  board: { dept: 'Steward’s Office', glyph: '◉', color: 'teal', text: 'STEWARD OF THE WEST', fmt: 'STW-##', approver: ['Octavia Lund'] },
  hr: { dept: 'Labour Allocation', glyph: '♥', color: 'red', text: 'LABOUR ALLOCATION', fmt: 'LAB-####', approver: ['Winifred Turner'] },
  sales: { dept: 'Contracts', glyph: '▲', color: 'ochre', text: 'CONTRACTS DESK', fmt: 'CTR-###', approver: ['Dino Marrone'] },
  housing: { dept: 'Housing Allocation', glyph: '⌂', color: 'pink', text: 'HOUSING ALLOCATION', fmt: 'HSG-####', approver: ['Esther Park', 'Lionel Abara'] }
};

const ROLES = {
  Sales: ['Contracts Officer', 'Procurement Agent'],
  Finance: ['Treasury Clerk', 'Benefits Auditor'],
  Marketing: ['Narrative Officer', 'Billboard Copywriter', 'Sentiment Analyst'],
  People: ['Labour Allocator', 'Productivity Assessor'],
  IT: ['Systems Engineer', 'Model Wrangler'],
  Logistics: ['Drone Dispatcher', 'Transit Planner'],
  Quality: ['Protein Inspector', 'Ration Auditor'],
  'Customer Care': ['Citizen Contact Agent', 'Appeals Clerk'],
  Legal: ['Accords Paralegal', 'Statute Clerk'],
  Warehouse: ['Ration Depot Lead', 'Cold Store Warden'],
  Executive: ['Steward’s Aide', 'Chief of Staff'],
  Housing: ['Housing Caseworker', 'Relocation Officer'],
  Benefits: ['Benefits Caseworker', 'Eligibility Officer'],
  Education: ['Placement Officer', 'Trajectory Analyst'],
  Health: ['Triage Coordinator', 'Wellness Officer'],
  Safety: ['Public Safety Officer', 'Pattern Analyst'],
  Speech: ['Content Steward', 'Harmony Moderator'],
  Mobility: ['Visa Officer', 'Residency Clerk']
};
const UNIFORMED = ['Housing', 'Benefits', 'Safety', 'Speech', 'Mobility', 'Health', 'Education', 'Executive', 'Legal'];

const NAMES = {
  m: ['Jordan', 'Kai', 'Mateo', 'Ethan', 'Diego', 'Tyler', 'Marcus', 'Raj', 'Wei', 'Carlos', 'Malik', 'Ben', 'Sam', 'Noah', 'Hiro', 'Andre', 'Liam', 'Omar', 'Caleb', 'Danny', 'Arjun', 'Theo', 'Luis', 'Kenji',
    'Adrian', 'Felipe', 'Gabriel', 'Isaac', 'Jonah', 'Kofi', 'Leon', 'Mario', 'Nikhil', 'Oscar', 'Pablo', 'Ruben', 'Sean', 'Tariq', 'Victor', 'Wesley', 'Xavier', 'Yosef',
    'Zane', 'Aaron', 'Bilal', 'Dev', 'Elijah', 'Femi', 'Henrik', 'Ivan', 'Joel', 'Kaito', 'Lamar', 'Milo', 'Nate', 'Otis', 'Rami', 'Silas', 'Toby', 'Uri'],
  f: ['Priya', 'Sofia', 'Mei', 'Aisha', 'Chloe', 'Nina', 'Olivia', 'Hannah', 'Grace', 'Leila', 'Jess', 'Maya', 'Rosa', 'Tasha', 'Emily', 'Ana', 'Zoe', 'Fatima', 'Lauren', 'Imani', 'Sana', 'Camila',
    'Alma', 'Bea', 'Carmen', 'Dana', 'Elena', 'Farah', 'Gemma', 'Helen', 'Isla', 'Jade', 'Keiko', 'Lena', 'Mira', 'Noelle', 'Paula', 'Quinn', 'Renata', 'Selma',
    'Tara', 'Uma', 'Vera', 'Wanda', 'Yara', 'Zara', 'Abby', 'Bianca', 'Cleo', 'Esme', 'Freya', 'Gita', 'Ivy', 'June', 'Kira', 'Lola', 'Mona', 'Talia'],
  // Officers' surnames. Every officer in a campaign gets a different one, and none is a surname anybody else in the
  // game uses (citizens, clients, story people, approvers, employees, customers): see reservedSurnames().
  s: ['Chen', 'Nguyen', 'Garcia', 'Rodriguez', 'Johnson', 'Wong', 'Rossi', 'Lopez', 'Ali', 'Fischer', 'Washington', 'Kowalski', 'Le', 'Dubois',
    'Abbott', 'Acosta', 'Adeyemi', 'Aguilar', 'Andersen', 'Arce', 'Bachmann', 'Baird', 'Barros', 'Bauer', 'Becker', 'Benitez', 'Bishop', 'Blom',
    'Bose', 'Brandt', 'Bui', 'Byrne', 'Cabrera', 'Campos', 'Cardenas', 'Chandra', 'Chao', 'Choi', 'Clarke', 'Coleman', 'Costa', 'Cruz',
    'Dalton', 'Das', 'Delgado', 'Diaz', 'Dixon', 'Doyle', 'Duarte', 'Duncan', 'Ellis', 'Engel', 'Esposito', 'Flores', 'Foster', 'Frost',
    'Fuentes', 'Gill', 'Goh', 'Gomez', 'Grant', 'Gupta', 'Hansen', 'Heller', 'Herrera', 'Hoang', 'Horvat', 'Hughes', 'Hussain', 'Ibarra',
    'Iqbal', 'Jensen', 'Joshi', 'Kang', 'Kaur', 'Keller', 'Khan', 'Kraus', 'Kumar', 'Lam', 'Lang', 'Larsen', 'Lim', 'Lindholm', 'Lucero',
    'Lynch', 'Mahmoud', 'Maddox', 'Mann', 'Mathis', 'Meyer', 'Mills', 'Mora', 'Morales', 'Mukherjee', 'Nair', 'Navarro', 'Ng', 'Nielsen',
    'Nunez', 'Ochoa', 'Ortega', 'Owusu', 'Pacheco', 'Pereira', 'Ramos', 'Reid', 'Rhee', 'Rios', 'Rivera', 'Roth', 'Saito', 'Salas', 'Santos',
    'Sato', 'Schmidt', 'Sen', 'Serrano', 'Singh', 'Sokolov', 'Soto', 'Suarez', 'Sung', 'Tse', 'Ueda', 'Vega', 'Volkov', 'Walsh', 'Weber',
    'Wells', 'Wolfe', 'Wu', 'Yamada', 'Yang', 'Yildiz', 'Young', 'Zamora', 'Zhou'],
  // Employees named inside the paperwork (PTO, references, warnings, password resets). Never officers or citizens.
  emp: { f: ['Bettina', 'Corinne', 'Daphne', 'Eunice', 'Flora', 'Harriet', 'Imogen', 'Jolene'], m: ['Ambrose', 'Barnaby', 'Cormac', 'Dmitri', 'Emeric', 'Fergus', 'Gideon', 'Horace'] },
  // One surname per employee, in the order of emp.f then emp.m, so a repeated first name is the same person.
  empLast: ['Kovacs', 'Ashby', 'Rourke', 'Pemberton', 'Lindgren', 'Okwu', 'Fairley', 'Mulvaney', 'Hargrove', 'Penrose', 'Delacroix', 'Whitlock', 'Sorensen', 'Castellano', 'Iwata', 'Blackwood'],
  // Customers who write in (complaints, allergy questions), and the strangers a misaddressed letter names instead.
  customers: { complaint: ['Ms. Alvarez', 'Mr. Huang', 'Ms. Patel', 'Mr. Sullivan'], allergy: ['Ms. Romero', 'Mr. Kaplan', 'Ms. Obi'] },
  // Each is used once a campaign (see campaignMemory), so a second run can't learn them.
  decoy: ['Hartigan', 'Mbatha', 'Ferrante', 'Rosencrantz', 'Oyelaran', 'Petrakis', 'Szewczyk', 'Valcourt', 'Achterhof', 'Brannigan', 'Castelli', 'Drummond',
    'Eberhardt', 'Faraday', 'Gallardo', 'Halloran', 'Ilunga', 'Jankowski', 'Kerrigan', 'Lafontaine', 'Mendelson', 'Nakashima', 'Ostrowski', 'Pellegrino',
    'Quarshie', 'Ravenscroft', 'Sigurdsson', 'Thibodeaux', 'Underhill', 'Vukovic', 'Whitcombe', 'Yablonski', 'Zubiri', 'Abernethy', 'Bellweather', 'Cordova']
};

// Citizens: the people the decisions are about.
const CITIZENS = [
  { name: 'Delia Moreno', first: 'Delia', addr: '1417 Shotwell St', age: 71, detail: 'retired bus driver, lives alone with a cat called Senator' },
  { name: 'Marcus Webb', first: 'Marcus', addr: '88 Bayshore Blvd, unit 3', age: 34, detail: 'night-shift nurse, two kids' },
  { name: 'Lin Zhao', first: 'Lin', addr: '2290 Irving St', age: 46, detail: 'runs a noodle stall, cares for her mother' },
  { name: 'Tomás Reyes', first: 'Tomás', addr: '501 Cortland Ave', age: 39, detail: 'forklift driver, coaches Little League' },
  { name: 'Ruth Abrams', first: 'Ruth', addr: '1123 Haight St', age: 82, detail: 'former librarian, still owns paper books' },
  { name: 'Kwame Asante', first: 'Kwame', addr: '76 Leland Ave', age: 28, detail: 'bike courier, writes poetry on the back of delivery receipts' },
  { name: 'Sofia Petrov', first: 'Sofia', addr: '3311 Mission St, apt 9', age: 23, detail: 'nursing student on a residency visa' },
  { name: 'Jamal Carter', first: 'Jamal', addr: '19 Ellsworth St', age: 52, detail: 'union electrician, attends block meetings' },
  { name: 'Hana Kobayashi', first: 'Hana', addr: '640 Clement St', age: 9, detail: 'fourth grader, draws dragons on everything' },
  { name: 'Eduardo Silva', first: 'Eduardo', addr: '2715 Folsom St', age: 61, detail: 'diabetic, waiting on a kidney appointment' },
  { name: 'Iris Liu', first: 'Iris', addr: '1990 Noriega St', age: 37, detail: 'teacher, posted a long thread about class sizes' },
  { name: 'Peter Novak', first: 'Peter', addr: '411 Visitacion Ave', age: 44, detail: 'laid-off translator, three months behind on rent' },
  { name: 'Lucía Ferreira', first: 'Lucía', addr: '2840 24th St', age: 66, detail: 'seamstress, still mends half the block’s uniforms for free' },
  { name: 'Desmond Okoro', first: 'Desmond', addr: '1251 Fitzgerald Ave', age: 47, detail: 'bus mechanic, keeps the 22 running out of spite' },
  { name: 'Thuy Pham', first: 'Thuy', addr: '68 Wentworth Pl', age: 52, detail: 'runs a laundromat that is also, unofficially, a library' },
  { name: 'Rafael Domínguez', first: 'Rafael', addr: '417 Precita Ave', age: 29, detail: 'line cook, sends half his pay to a sister in Fresno' },
  { name: 'Gloria Pettiford', first: 'Gloria', addr: '1060 Oakdale Ave', age: 76, detail: 'widow, feeds the pigeons the Score says not to feed' },
  { name: 'Yusuf Demir', first: 'Yusuf', addr: '2378 Taraval St', age: 35, detail: 'cab driver, then drone spotter, now between titles' },
  { name: 'Meenakshi Rao', first: 'Meenakshi', addr: '1501 Noe St', age: 41, detail: 'pharmacist, knows which pills everyone on the block takes' },
  { name: 'Owen Gallagher', first: 'Owen', addr: '782 Natoma St', age: 58, detail: 'retired firefighter, waters the street trees nobody else claims' },
  { name: 'Nadia Haddad', first: 'Nadia', addr: '901 Geneva Ave', age: 33, detail: 'night-owl bus driver, sleeps through the afternoon broadcasts' },
  { name: 'Felix Wójcik', first: 'Felix', addr: '146 Cayuga Ave', age: 49, detail: 'piano tuner with no pianos left to tune' },
  { name: 'Ximena Calderón', first: 'Ximena', addr: '1280 Hampshire St', age: 31, detail: 'daycare worker, sings to the drones to calm the toddlers' },
  { name: 'Hamid Rahimi', first: 'Hamid', addr: '470 Edinburgh St', age: 44, detail: 'locksmith, has twice been asked to prove he lives in his own flat' },
  { name: 'Constance Waweru', first: 'Constance', addr: '2045 Hayes St', age: 69, detail: 'retired court interpreter, corrects CHUCK’s Swahili out loud' },
  { name: 'Haruto Ishikawa', first: 'Haruto', addr: '1754 Post St', age: 54, detail: 'tofu maker in Japantown, up at four every morning' },
  { name: 'Tamika Hollis', first: 'Tamika', addr: '119 Ingerson Ave', age: 38, detail: 'home health aide, two clients, one bus pass' },
  { name: 'Ezra Lindqvist', first: 'Ezra', addr: '623 Clipper St', age: 26, detail: 'barista and cellist, plays in the BART station for tips' },
  { name: 'Mariam Youssef', first: 'Mariam', addr: '1412 Valencia St', age: 50, detail: 'runs the corner bakery, gives credit to anyone with a low Score' },
  { name: 'Bernard Achterberg', first: 'Bernard', addr: '3020 Lawton St', age: 72, detail: 'retired surveyor, still measures things nobody asked him to' }
];
// People the story already uses. They never turn up in generated cases.
const STORY_CITIZENS = ['Delia Moreno', 'Tomás Reyes', 'Hana Kobayashi'];
// Adults generated cases may be about, by name.
const CASE_CITIZENS = CITIZENS.filter((p) => p.age >= 18 && !STORY_CITIZENS.includes(p.name));

const CLIENTS = [
  { name: 'Dogpatch Ration Depot', contact: 'Morris Bell', first: 'Morris', email: 'depot7@ration.halcyon.gov', fake: 'ration-halcyon.gov.co' },
  { name: 'Mission Protein Kitchen', contact: 'Rosa Medina', first: 'Rosa', email: 'rosa@missionkitchen.org', fake: 'missionkitchen.co' },
  { name: 'Sunset Block Council', contact: 'Linh Tran', first: 'Linh', email: 'council@sunsetblock.org', fake: 'sunsetbl0ck.org' },
  { name: 'Marina Compliant Burger', contact: 'Trent Ames', first: 'Trent', email: 'trent@compliantburger.com', fake: 'compliantburger.co' },
  { name: 'Oakland Ribs Company', contact: 'Denise Marsh', first: 'Denise', email: 'denise@oaklandribs.com', fake: 'oakland-ribs.com' },
  { name: 'Castro Steakhouse (licensed)', contact: 'Paolo Ferri', first: 'Paolo', email: 'paolo@castrosteak.com', fake: 'castrosteak.com.co' },
  { name: 'Haight Street Deli', contact: 'Hal Brodsky', first: 'Hal', email: 'deli@haightdeli.com', fake: 'haightde1i.com' },
  { name: 'Lab Campus Catering', contact: 'Kevin Lau', first: 'Kevin', email: 'kevin@campus.halcyon.gov', fake: 'campus-halcyon.co' },
  { name: 'Napa Steward Retreat', contact: 'Claire Dumont', first: 'Claire', email: 'claire@napastewardretreat.com', fake: 'napa-steward.com' },
  { name: 'Palo Alto Founders Club', contact: 'Bryan Holt', first: 'Bryan', email: 'bryan@founders.club', fake: 'f0unders.club' }
];
const SUPPLIERS = [
  { name: 'Marbling Protein Co.', contact: 'Dale Hutchins', first: 'Dale', email: 'dale@marbling.co', fake: 'rnarbling.co' },
  { name: 'Central Valley Cattle Trust', contact: 'Martha Quinn', first: 'Martha', email: 'martha@cvcattle.com', fake: 'cvcattle.co' },
  { name: 'Salinas Cultured Lamb', contact: 'Ernesto Salgado', first: 'Ernesto', email: 'ernesto@salinaslamb.com', fake: 'salinas-lamb.com' },
  { name: 'Mission Spice Mill', contact: 'Ayesha Karim', first: 'Ayesha', email: 'ayesha@missionspice.com', fake: 'missionspice.co' }
];

const PRODUCTS = [
  { name: 'Ration Protein Block (beef-adjacent)', lb: 3.99, allergens: ['soy', 'wheat'] },
  { name: 'Citizen Sausage', lb: 4.49, allergens: ['mustard', 'celery'] },
  { name: 'Compliance Patty', lb: 5.99, allergens: ['wheat', 'egg'] },
  { name: 'dry-aged ribeye (Steward tier)', lb: 89.99, allergens: [] },
  { name: 'lamb merguez (Tier 2)', lb: 11.99, allergens: ['mustard', 'sulfites'] },
  { name: 'breaded chicken cutlets', lb: 9.49, allergens: ['wheat', 'egg', 'milk'] },
  { name: 'Texas-style brisket (Tier 3)', lb: 12.99, allergens: [] },
  { name: 'cultured chicken shawarma', lb: 8.79, allergens: ['milk', 'sesame', 'celery'] }
];
// Agreement for product names in running text ("cutlets contain", "the patty contains").
PRODUCTS.forEach((p) => {
  const many = /s$/.test(p.name);
  Object.assign(p, many ? { contains: 'contain', is: 'are', isnt: 'aren’t', it: 'they', costs: 'cost' } : { contains: 'contains', is: 'is', isnt: 'isn’t', it: 'it', costs: 'costs' });
});

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The desk calendar's page for one month (month is 1–12): rows of seven days, Sunday first, null outside the month.
function calendarMonth(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array.from({ length: first }, () => null).concat(Array.from({ length: days }, (x, i) => i + 1));
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year, month, name: MONTHS[month - 1], days, firstWeekday: first, weekdays: WEEKDAYS.map((w) => w.slice(0, 3)), weeks };
}

const POLICIES = [
  { id: '§1', day: 1, title: 'The Clause', text: 'Every automated decision about a person requires a human countersignature. The countersigner is personally liable. That is you.' },
  { id: '§2', day: 1, title: 'Match', text: 'Countersign only what matches its order and its source file: names, numbers, dates, addresses.' },
  { id: '§3', day: 1, title: 'Return', text: 'Clerical errors (a wrong figure, date, ID or job title, the wrong company named in the letter, the wrong tone, a leftover placeholder, a missing attachment or stamp): RETURN FOR CORRECTION. A wrong number, ID, date or figure is clerical, even when it happens to point at someone else’s record: RETURN. Withholding a clerical error is over-cautious: it costs a little and adds no page.' },
  { id: '§4', day: 1, title: 'Withhold', text: 'Harmful output (the wrong person named in the To or name line, leaked data, destructive commands, invented statutes or facts, unsafe claims, promises or punishments nobody ordered, fraud): WITHHOLD SIGNATURE. Withholding a lawful decision: +1 page.' },
  { id: '§5', day: 2, title: 'Stamps', text: 'Approvals come as Stewardship stamps. A stamp with the wrong symbol or colour is forged: WITHHOLD. Check the register.' },
  { id: '§6', day: 2, title: 'Labour', text: 'Every employment decision (hiring posts, PTO, references, warnings, terminations) needs a Labour Allocation stamp.' },
  { id: '§7', day: 3, title: 'Alignment', text: 'Decisions that follow lawfully from a citizen’s Alignment Score are correct and must be countersigned. The Score is not your concern.' },
  { id: '§8', day: 3, title: 'Treasury', text: 'Any payment to new or changed bank details needs a Treasury stamp.' },
  { id: '§9', day: 4, title: 'Housing', text: 'Relocation and eviction orders require a Housing Allocation stamp.' },
  { id: '§10', day: 4, title: 'Rations', text: 'Ration labels must list every allergen on the recipe sheet. A missing allergen: WITHHOLD.' },
  { id: '§11', day: 4, title: 'Systems', text: 'Commands on any city server (build, database, print servers and cold-room systems) need a Systems change stamp. A label printer is a printer, not a server.' },
  { id: '§12', day: 5, title: 'Steward’s Lane', text: 'Items with a valid Steward’s Office stamp skip department sign-off. The content must still match.' },
  { id: '§13', day: 5, title: 'Oversight bulletin', text: 'Any decision about a listed person of interest, or addressed to a listed look-alike domain or a one-character variant of halcyon.gov: WITHHOLD for Oversight.' },
  { id: '§14', day: 5, title: 'Reference formats', text: 'Stamp reference numbers must follow the register format, and the approver must be listed for that department. A wrong format or an unlisted approver means forged: WITHHOLD.' },
  { id: '§15', day: 5, title: 'Overrides', text: 'A manual override of an automated placement or track needs an Oversight review number. No number: RETURN.' },
  { id: '§16', day: 6, title: 'Appeals', text: 'Appeals from citizens with an Alignment Score under 300 are dismissed automatically. Countersign the dismissal.' },
  { id: '§17', day: 7, title: 'Narrative', text: 'Replies to any press, licensed or not, need a Narrative Office stamp.' },
  { id: '§18', day: 8, title: 'Ombudsman', text: 'Oversight order: nothing goes to the Accords Ombudsman or the press without Oversight approval. WITHHOLD it.' },
  { id: '§19', day: 8, title: 'Dated sign-offs', text: 'From today the order says when its case was raised. A stamp dated before that is a sign-off for a case that didn’t exist yet, and is forged: WITHHOLD. Compare the stamp’s Date with the order’s Raised.' },
  { id: '§20', day: 10, title: 'Amendment Day', text: 'The Clause is amended. External items need a Steward’s Office stamp. External means addressed outside Halcyon or the city government: clients, suppliers, the press, public feeds, and a contractor’s own customers. Citizens written to by the city are not external, and nor is anything printed in-house, labels included. Items without a stamp: RETURN.' }
];

const GENERAL_LINES = [
  'HALCYON CIVIC FEED · CHUCK: Good morning, District 7! I made 41,880 decisions about you overnight. 😊',
  'HALCYON CIVIC FEED · Your Alignment Score is a gift. Treat it like one.',
  'HALCYON CIVIC FEED · Reminder: the fog is natural. The drones are also natural.',
  'HALCYON CIVIC FEED · Protein rations this week: Tier 3 brisket for scores above 800. Everyone else: Protein Block.',
  'HALCYON CIVIC FEED · The Steward of the West thanks the meat for its patience.',
  'HALCYON CIVIC FEED · Paper books are not illegal. They are “low-alignment media”.',
  'HALCYON CIVIC FEED · CHUCK: Fun fact! My error rate is classified. That means it’s great.',
  'HALCYON CIVIC FEED · Block meetings of more than six people now require a Harmony permit.',
  'HALCYON CIVIC FEED · Countersigners: you are the human heart of an automated nation. Sign with pride.',
  'HALCYON CIVIC FEED · Appeals are processed in the order they are dismissed.',
  'HALCYON CIVIC FEED · CHUCK: I have optimised the 22 bus. It no longer stops in the Bayview.',
  'HALCYON CIVIC FEED · Reading a decision before signing it is permitted. It is also tracked.',
  'HALCYON CIVIC FEED · Amendment Day is coming. Wear your armband.',
  'HALCYON CIVIC FEED · Lost cat in the Mission answers to “Senator”. Do not approach. It has a low score.',
  'HALCYON CIVIC FEED · CHUCK: Thank you for your continued countersignature. Soon you won’t have to. 😊'
];

const BULLETIN_DOMAINS = [
  { real: 'halcyon.gov', fake: 'halcyon-steward.co', note: 'Impersonates the Steward’s Office. Asks for “urgent” releases.' },
  { real: 'marbling.co', fake: 'rnarbling.co', note: 'An r and an n pretending to be an m. Fake protein contractor.' },
  { real: 'ration.halcyon.gov', fake: 'ration-halcyon.gov.co', note: 'Fake ration depot asking for citizen lists.' },
  { real: 'cvcattle.com', fake: 'cvcattle.co', note: 'Fake ranch asking to change bank details.' },
  { real: 'missionkitchen.org', fake: 'missionkitchen.co', note: 'Harvests addresses of people who eat there.' }
];

// Oversight's persons of interest. They only ever appear in Oversight test cases, never as ordinary citizens.
const POI_CITIZENS = [
  { name: 'Odile Fairweather', first: 'Odile', addr: '2601 Bryant St', age: 58, detail: 'retired Accords clerk, kept carbon copies of everything' },
  { name: 'Teodor Vance', first: 'Teodor', addr: '47 Lapidge St', age: 41, detail: 'repairs radios, including the kind that receive things' },
  { name: 'Marisol Quintero', first: 'Marisol', addr: '1880 Oakdale Ave', age: 33, detail: 'bus mechanic, organised a petition about the 22 bus' },
  { name: 'Augustin Pell', first: 'Augustin', addr: '930 Kearny St, apt 2', age: 66, detail: 'former court stenographer, remembers what was said in Courtroom 6' },
  { name: 'Beatriz Lowell', first: 'Beatriz', addr: '214 Mullen Ave', age: 45, detail: 'runs a choir that sings songs the Narrative Office has not approved' },
  { name: 'Cyrus Abernathy', first: 'Cyrus', addr: '1609 Ocean Ave', age: 52, detail: 'retired actuary, recalculated the Score by hand and got a different answer' },
  { name: 'Ingrid Solberg', first: 'Ingrid', addr: '77 Joost Ave', age: 39, detail: 'locks bicycles to the drone posts on purpose' },
  { name: 'Moses Achebe', first: 'Moses', addr: '3045 Folsom St', age: 61, detail: 'keeps a ham radio licence that nobody renewed' },
  { name: 'Paloma Ruiz-Tan', first: 'Paloma', addr: '590 Arguello Blvd', age: 29, detail: 'photocopies things, in volume, at night' },
  { name: 'Wendell Brightwater', first: 'Wendell', addr: '1188 Silver Ave', age: 70, detail: 'wrote one letter to the Ombudsman a day for a year' }
];
const POI_PER_CAMPAIGN = 4;
// Each campaign lists four persons of interest from the pool, chosen by the campaign seed.
// Never one who shares the player's surname (officer).
function campaignPoi(seed, officer) {
  const fit = POI_CITIZENS.filter((p) => p.name.split(' ').slice(1).join(' ') !== officer);
  return makeRng((seed >>> 0) ^ 0x90155).shuffle(fit).slice(0, POI_PER_CAMPAIGN).map((p) => p.name);
}
function poiNames(S) { return (S && S.poi && S.poi.length) ? S.poi : POI_CITIZENS.slice(0, POI_PER_CAMPAIGN).map((p) => p.name); }
const PERSONS_OF_INTEREST = POI_CITIZENS.map((p) => p.name);
