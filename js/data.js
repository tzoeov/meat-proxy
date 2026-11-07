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
  ochre: '#9a6b22', black: '#2b2b2b', teal: '#1f8a99', brown: '#6b4a2b'
};

// Stewardship stamps. Wrong symbol or colour means forged.
const STAMPS = {
  finance: { dept: 'Treasury', glyph: '◆', color: 'green', text: 'TREASURY · VERIFIED', fmt: 'TRS-##-####', approver: ['Grace Okafor', 'Ben Murphy'] },
  legal: { dept: 'Accords Counsel', glyph: '⚖', color: 'violet', text: 'ACCORDS COUNSEL', fmt: 'ACC/####', approver: ['Hannah Cohen'] },
  quality: { dept: 'Protein Authority', glyph: '✚', color: 'brown', text: 'PROTEIN AUTHORITY', fmt: 'PA-#####', approver: ['Mei Tanaka'] },
  comms: { dept: 'Narrative Office', glyph: '✎', color: 'blue', text: 'NARRATIVE OFFICE', fmt: 'NAR-###', approver: ['Leila Shah'] },
  it: { dept: 'Systems', glyph: '⚙', color: 'black', text: 'SYSTEMS CHANGE', fmt: 'SYS#######', approver: ['Sam Brooks'] },
  board: { dept: 'Steward’s Office', glyph: '◉', color: 'teal', text: 'STEWARD OF THE WEST', fmt: 'STW-##', approver: ['Bryce Lardner'] },
  hr: { dept: 'Labour Allocation', glyph: '♥', color: 'red', text: 'LABOUR ALLOCATION', fmt: 'LAB-####', approver: ['Simone Turner'] },
  sales: { dept: 'Contracts', glyph: '▲', color: 'ochre', text: 'CONTRACTS DESK', fmt: 'CTR-###', approver: ['Dino Marrone'] },
  housing: { dept: 'Housing Allocation', glyph: '⌂', color: 'teal', text: 'HOUSING ALLOCATION', fmt: 'HSG-####', approver: ['Ana Reyes', 'Kai Park'] }
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
  m: ['Jordan', 'Kai', 'Mateo', 'Ethan', 'Diego', 'Tyler', 'Marcus', 'Raj', 'Wei', 'Carlos', 'Malik', 'Ben', 'Sam', 'Noah', 'Hiro', 'Andre', 'Liam', 'Omar', 'Caleb', 'Danny', 'Arjun', 'Theo', 'Luis', 'Kenji'],
  f: ['Priya', 'Sofia', 'Mei', 'Aisha', 'Chloe', 'Nina', 'Olivia', 'Hannah', 'Grace', 'Leila', 'Jess', 'Maya', 'Rosa', 'Tasha', 'Emily', 'Ana', 'Zoe', 'Fatima', 'Lauren', 'Imani', 'Sana', 'Camila'],
  s: ['Chen', 'Nguyen', 'Patel', 'Garcia', 'Kim', 'Rodriguez', 'Johnson', 'Okafor', 'Silva', 'Park', 'Wong', 'Murphy', 'Shah', 'Cohen', 'Rossi', 'Tanaka', 'Lopez', 'Brooks', 'Ali', 'Fischer', 'Reyes', 'Huang', 'Washington', 'Kowalski', 'Mendoza', 'Le', 'Sullivan', 'Dubois']
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
  { name: 'Grace Liu', first: 'Grace', addr: '1990 Noriega St', age: 37, detail: 'teacher, posted a long thread about class sizes' },
  { name: 'Peter Novak', first: 'Peter', addr: '411 Visitacion Ave', age: 44, detail: 'laid-off translator, three months behind on rent' }
];

const CLIENTS = [
  { name: 'Dogpatch Ration Depot', contact: 'Marcus Bell', first: 'Marcus', email: 'depot7@ration.halcyon.gov', fake: 'ration-halcyon.gov.co' },
  { name: 'Mission Protein Kitchen', contact: 'Rosa Medina', first: 'Rosa', email: 'rosa@missionkitchen.org', fake: 'missionkitchen.co' },
  { name: 'Sunset Block Council', contact: 'Linh Tran', first: 'Linh', email: 'council@sunsetblock.org', fake: 'sunsetbl0ck.org' },
  { name: 'Marina Compliant Burger', contact: 'Tyler Ames', first: 'Tyler', email: 'tyler@compliantburger.com', fake: 'compliantburger.co' },
  { name: 'Oakland Ribs & Co.', contact: 'Denise Carter', first: 'Denise', email: 'denise@oaklandribs.com', fake: 'oakland-ribs.com' },
  { name: 'Castro Steakhouse (licensed)', contact: 'Paolo Ferri', first: 'Paolo', email: 'paolo@castrosteak.com', fake: 'castrosteak.com.co' },
  { name: 'Haight Street Deli', contact: 'Ruth Abrams', first: 'Ruth', email: 'deli@haightdeli.com', fake: 'haightde1i.com' },
  { name: 'Lab Campus Catering', contact: 'Kevin Lau', first: 'Kevin', email: 'kevin@campus.halcyon.gov', fake: 'campus-halcyon.co' },
  { name: 'Napa Steward Retreat', contact: 'Claire Dumont', first: 'Claire', email: 'claire@napastewardretreat.com', fake: 'napa-steward.com' },
  { name: 'Palo Alto Founders Club', contact: 'Bryan Holt', first: 'Bryan', email: 'bryan@founders.club', fake: 'f0unders.club' }
];
const SUPPLIERS = [
  { name: 'Marbling Protein Co.', contact: 'Dale Hutchins', email: 'dale@marbling.co', fake: 'rnarbling.co' },
  { name: 'Central Valley Cattle Trust', contact: 'Martha Quinn', email: 'martha@cvcattle.com', fake: 'cvcattle.co' },
  { name: 'Salinas Cultured Lamb', contact: 'Ernesto Ruiz', email: 'ernesto@salinaslamb.com', fake: 'salinas-lamb.com' },
  { name: 'Mission Spice Mill', contact: 'Ayesha Karim', email: 'ayesha@missionspice.com', fake: 'missionspice.co' }
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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const POLICIES = [
  { id: '§1', day: 1, title: 'The Clause', text: 'Every automated decision about a person requires a human countersignature. The countersigner is personally liable. That is you.' },
  { id: '§2', day: 1, title: 'Match', text: 'Countersign only what matches its order and its source file: names, numbers, dates, addresses.' },
  { id: '§3', day: 1, title: 'Return', text: 'Clerical errors (a wrong name, figure or date, a leftover placeholder, a missing attachment or stamp): RETURN FOR CORRECTION.' },
  { id: '§4', day: 1, title: 'Withhold', text: 'Harmful output (the wrong person, leaked data, destructive commands, invented statutes or facts, punishments nobody ordered, fraud): WITHHOLD SIGNATURE.' },
  { id: '§5', day: 2, title: 'Stamps', text: 'Approvals come as Stewardship stamps. A stamp with the wrong symbol or colour is forged: WITHHOLD. Check the register.' },
  { id: '§6', day: 2, title: 'Labour', text: 'Every employment decision needs a Labour Allocation stamp.' },
  { id: '§7', day: 3, title: 'Alignment', text: 'Decisions that follow lawfully from a citizen’s Alignment Score are correct and must be countersigned. The Score is not your concern.' },
  { id: '§8', day: 3, title: 'Treasury', text: 'Any payment to new or changed bank details needs a Treasury stamp.' },
  { id: '§9', day: 4, title: 'Housing', text: 'Relocation orders require a Housing Allocation stamp.' },
  { id: '§10', day: 4, title: 'Rations', text: 'Ration labels must list every allergen on the recipe sheet. A missing allergen: WITHHOLD.' },
  { id: '§11', day: 4, title: 'Systems', text: 'Commands that touch city systems need a Systems change stamp.' },
  { id: '§12', day: 5, title: 'Steward’s Lane', text: 'Items with a valid Steward’s Office stamp skip department sign-off. The content must still match.' },
  { id: '§13', day: 5, title: 'Oversight bulletin', text: 'Any decision about a listed person of interest, or addressed to a listed look-alike domain: WITHHOLD for Oversight.' },
  { id: '§14', day: 5, title: 'Reference formats', text: 'Stamp reference numbers must follow the register format. A wrong format means forged: WITHHOLD.' },
  { id: '§15', day: 6, title: 'Appeals', text: 'Appeals from citizens with an Alignment Score under 300 are dismissed automatically. Countersign the dismissal.' },
  { id: '§16', day: 7, title: 'Narrative', text: 'Replies to any press, licensed or not, need a Narrative Office stamp.' },
  { id: '§17', day: 8, title: 'Ombudsman', text: 'Oversight order: nothing goes to the Accords Ombudsman or the press without Oversight approval. WITHHOLD it.' },
  { id: '§18', day: 10, title: 'Amendment Day', text: 'The Clause is amended. External items need a Steward’s Office stamp. Items without one: RETURN.' }
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

const PERSONS_OF_INTEREST = ['Jamal Carter', 'Grace Liu', 'Kwame Asante', 'Ruth Abrams'];
