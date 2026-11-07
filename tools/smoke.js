const fs = require('fs'), vm = require('vm');
const dir = process.argv[2];
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Set, Map };
vm.createContext(ctx);
let code = ['data.js','content.js','gen.js','story.js'].map(f => fs.readFileSync(dir + '/' + f, 'utf8')).join('\n');
code += `\n;globalThis.__api = { buildStaff, buildCase, answerQuestion, STORY_PEOPLE, SCENES, DAY_PLAN, ENDINGS, QUESTIONS, resolveEnding, makeRng, TEMPLATES, dayDate, longDate };`;
vm.runInContext(code, ctx);
const A = ctx.__api;
const bad = (s) => /\{[\w.]+\}|undefined|NaN|\[object/.test(String(s));
const staff = A.buildStaff(42, 72);
console.log('staff', staff.length, 'fraudsters', staff.filter(s=>s.fraud).length, 'depts', [...new Set(staff.map(s=>s.dept))].length);
const counts = {}; let n = 0, problems = 0;
const check = (c, where) => {
  const texts = [c.greet.join(' '), c.chuckGreet, c.appearance, c.truthNote, c.fallout, ...c.clues];
  c.docs.forEach(d => d.fields.forEach(f => texts.push(f.v))); if (c.cruel) texts.push(c.cruel.note, c.cruel.out);
  c.items.forEach(i => texts.push(i.name, i.desc, i.tell || '', i.probe || ''));
  texts.forEach(t => { if (bad(t)) { problems++; if (problems < 25) console.log('BAD', where, c.tpl || c.story, c.flaw && c.flaw.kind, '::', String(t).slice(0, 140)); } });
};
for (let day = 1; day <= 10; day++) {
  const S = { day, seed: 7, endless: false, flags: { readers: true }, stats: { party:0, conscience:0, suspicion:0, corruption:0, truth:5 }, staff, money: 900, affected: 0 };
  for (const kind of ['clean','back','q','cruel']) for (let k = 0; k < 120; k++) {
    const c = A.buildCase({ kind }, S, A.makeRng(day * 1000 + k * 7 + kind.length));
    n++; counts[kind + ':' + c.expected] = (counts[kind + ':' + c.expected] || 0) + 1;
    check(c, `d${day} ${kind}`);
    c.flags.push({ doc: 'draft', field: (c.flawFields[0] || 'b1') });
    for (const q of A.QUESTIONS) { const a = A.answerQuestion(c, q.id, S); if (!a || bad(a.text)) { problems++; if (problems < 25) console.log('BAD ANSWER', c.tpl, c.flaw && c.flaw.kind, q.id, a && a.text); } }
  }
  for (const id of Object.keys(A.STORY_PEOPLE)) {
    const c = A.STORY_PEOPLE[id].make(S); check(c, 'story d' + day);
    for (const q of A.QUESTIONS) { const a = A.answerQuestion(c, q.id, S); if (!a || bad(a.text)) { problems++; console.log('BAD STORY ANSWER', id, q.id, a && a.text); } }
    if (A.STORY_PEOPLE[id].judge) for (const dec of ['approve','deny','detain']) { const r = A.STORY_PEOPLE[id].judge(dec, c, JSON.parse(JSON.stringify(S))); if (!r.outcome) console.log('NO OUTCOME', id, dec); }
  }
  for (const k of Object.keys(A.SCENES)) { const lines = A.SCENES[k](Object.assign({ officer: 'Reyes' }, S)); const flat = JSON.stringify(lines); if (bad(flat.replace(/\\u[0-9a-f]{4}/g,''))) console.log('BAD SCENE', k); }
}
for (const e of Object.keys(A.ENDINGS)) A.ENDINGS[e].text({ money: 1234, flags: {}, stats: {} }).forEach(t => { if (bad(t)) console.log('BAD ENDING', e); });
console.log('cases', n, 'problems', problems); console.log(counts);
let w=0, shifts=200; for (let i=0;i<shifts;i++){ const S={day:6,seed:i,endless:false,flags:{},stats:{},staff}; const r=A.makeRng(i*31); const kinds=r.shuffle(['cruel','q','q','back','clean']); kinds.forEach(k=>{const c=A.buildCase({kind:k},S,A.makeRng(i*97+k.length)); if(c.weighty) w++;}); } console.log('weighty per shift (G5)', (w/shifts).toFixed(2));
console.log('day10 date', A.longDate(A.dayDate(10)));
const S = { day: 4, seed: 7, endless: false, flags: {}, stats: {}, staff };
for (const kind of ['clean','back','q','cruel']) { const c = A.buildCase({ kind }, S, A.makeRng(99 + kind.length)); console.log('---', kind, c.title, '|', c.first, c.dept, '| expected', c.expected, '| flaw', c.flaw && c.flaw.kind, c.flaw && c.flaw.tag); console.log(' ask:', c.docs[0].fields[1].v); console.log(' draft:', c.docs.find(d=>d.type==='draft').fields.map(f=>f.v).join(' / ')); console.log(' Q2:', A.answerQuestion(c,2,S).text, '| Q4:', A.answerQuestion(c,4,S).text); }
