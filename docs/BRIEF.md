# Brief: turn The Outbox into MEAT PROXY

The Outbox is a satire about one company's AI. MEAT PROXY takes the same desk into a near-future US where AI labs
run the country. The law still says a human must sign off on every automated decision about a person, so that
someone can be blamed. Those humans are called **meat proxies**. The player is one.

The core joke stays: the AI writes everything, nobody reads it, and the one person who does is the one who takes
the blame. The stakes change from lawsuits to people's lives.

## Ground truth (read before changing anything)

- Repo: `~/code/meat-proxies/the-outbox` (GitHub `tzoeov/the-outbox`, served by GitHub Pages). Plain static files,
  no build step: `index.html` plus `js/{data,content,gen,story,art,audio,game}.js`.
- The engine works and is verified. A scripted headless-Chrome playthrough of all 10 days (50 items, every story
  scene, one ending) runs with zero page errors, and the generator produces 3,600 cases with no unfilled
  placeholders. **Do not rewrite the engine.** Change data, content, story, art and copy.
- What exists and stays:
  - **The shift:** 5 items, each a colleague bringing an AI draft.
  - **Three papers:** the ask, the source data and CHUCK's draft. Lines can be flagged by clicking.
  - **The envelope:** items to check and open (the "luggage").
  - **Questions:** 12, ten to CHUCK and two to the colleague.
  - **Four verbs:** send, send back, escalate, quarantine.
  - **Stamps:** department stamps with symbol, colour and reference formats.
  - **Phishing bulletin.**
  - **Shift report:** stars, pay, reputation and a "what happened next" line for every item.
  - **Story and endings:** a 10-day scripted story with 10 endings.
  - **Plumbing:** saves, settings, tutorial and the mobile layout.
- Mobile layout matters (portrait pane switcher, thumb-reach stamp bar, landscape variant, bottom-sheet modals).
  Every change must keep it working at 360×640, 390×844 and 844×390.

## The world (fill in the details, keep the shape)

- **When:** about 2031. Three AI labs (fictional names, invent them) signed the "Stewardship Accords" with the
  federal government. Agencies were replaced by "stewardship contracts". The labs now run benefits, housing,
  immigration, policing, school placement and food rationing.
- **The loophole that creates the job:** the Human Accountability Clause. Every automated decision that affects a
  person needs a human countersignature. Countersigners are personally liable. The labs hire them by the thousand,
  pay them per signature, and call them meat proxies in internal Slack. The public uses the term too.
- **San Francisco** is the labs' company town: fog, drones, billboards for the model, protein ration lines in
  Dogpatch. Marbling, the meat company, is now the licensed Protein Authority contractor for the district. Keep
  it: it makes the meat literal.
- **CHUCK** is the local instance of the lab's model, assigned to your desk. Same voice: relentlessly cheerful,
  always 100% sure, sometimes wrong. A wrong name on an invoice is funny. A wrong name on a relocation order is
  not, and CHUCK finds both equally fine.
- **"Meat"** is how the lab class talks about everyone else. Use it the way the game uses it now: as satire of
  that class, never as a joke at ordinary people's expense.

## Rename

The title should carry the brand. Pick one; the first is recommended:

1. **MEAT PROXY.** It matches the brand and needs no subtitle. Tagline: "The AI decides. You sign. You're liable."
2. **WET SIGNATURE.** Clever and bureaucratic, but loses the brand word.
3. **HUMAN IN THE LOOP.** Accurate, but sounds like a conference talk.

Rename everything the player sees: title, menu, tab title, tagline, storage keys (new namespace, so old Outbox
saves don't collide), and the repo or Pages path if the owner wants it (see Open decisions).

## Rules for tone (hard)

- **Fiction only.** No real companies, labs, politicians, parties, agencies or events. Satirise mechanisms
  (surveillance, scores, compliance theatre, blame laundering, deportation by algorithm), not sides. It must not
  read as commentary on a specific real administration.
- **Two of five.** In a normal shift at most about 2 of the 5 items carry real human weight. The rest stay everyday
  absurdity (ration labels, lab PR, a drone delivering the wrong thing). Wall-to-wall atrocity is exhausting and
  preachy.
- **The comedy comes from paperwork.** A relocation order addressed to `[CITIZEN NAME]`. A citation of a statute
  CHUCK invented on day 3. A score downgrade for "low alignment" because someone read a paper book.
- **No gore, no slurs, no torture.** Violence happens off the page and arrives as a fallout line.
- **The player is never forced to do evil.** Every cruel-but-lawful item must be refusable, at a visible price.

## Mechanics: what changes

1. **Rename the verbs** (keep the same functions and keys):
   - Send → **Countersign**.
   - Send back → **Return for correction**.
   - Escalate → **Request oversight** (2 per shift).
   - Quarantine → **Withhold signature**.
2. **"Lawful but cruel" becomes a regular item class.** It does not replace send, send back and quarantine; it
   sits alongside them. The policy says countersign, and the report scores it as correct. A hidden Conscience
   ledger records it. Today only scripted story items do this. Make it part of normal shifts: about 1 per shift
   from day 3.
3. **Two ledgers, shown honestly.**
   - **Compliance** is pay and reputation, as now.
   - **Conscience** is hidden during play and revealed at the end of the shift as a single line: "4 people were
     affected by what you signed today."
   - Endings read both.
4. **Your own score.** The player has a Citizen Alignment Score (e.g. 0–1000) shown in the top bar. It moves with
   compliance, suspicion and refusals. Below thresholds:
   - smaller protein ration (flavour text in the evening);
   - then rent;
   - then a relocation notice addressed to you.

   This replaces money as the felt pressure; keep money as a secondary number.
5. **Policies become Statutes.** Rewrite the 18 policies as Accords statutes (same day-by-day release). Add 2–3
   that only make sense here, for example:
   - "Appeals filed by a citizen with an Alignment Score under 300 are dismissed automatically."
   - "Relocation orders require a Housing stamp and a Transit slot."
6. **The phishing bulletin becomes the Oversight bulletin.** It keeps look-alike domains, and adds "persons of
   interest" whose cases are flagged. A countersignature on their file is a Directorate test. This is the old
   wanted-bulletin idea from The Last Checkpoint, rebuilt for this world; do not copy its structure wholesale.

## Content to write

Rewrite `content.js` `TEMPLATES` to about 30 request types, each with:
- a correct version;
- 1–2 fixable flaws (return);
- 1–2 harmful flaws (withhold);
- where it fits, a lawful-but-cruel version.

Every flaw must be checkable against the ask, the source or the envelope; no unwinnable items. Mix:

- **Weighty (≈40%):** alignment score downgrades, benefit denials, eviction and relocation orders, school placement
  by "predicted trajectory", medical triage queues, visa revocations, predictive-policing flags, content takedowns
  with account bans, termination by productivity model, protein ration cuts for a block.
- **Absurd (≈60%):** lab press releases, billboard copy for the model, drone delivery apologies, ration-pack labels
  (allergens still matter), Marbling protein orders, CEO keynote scripts, "voluntary" wellness check-ins, an
  intern's AI-written poem for the Steward's birthday.

Keep and adapt what fits from the current pool: invented citations, digits swapped, wrong recipients, BCC leaks,
destructive commands (now on city systems), overreach ("I've also relocated their neighbours, for efficiency").

## Story (10 days, rewrite `story.js`)

Keep the current spine, re-cast:

| Today | Becomes |
|---|---|
| Marta, your manager | District supervisor who has signed 200,000 decisions and remembers four of them |
| Ravi and the Readers | An underground of countersigners who read every decision |
| Ines, AI Governance | Oversight: the lab's internal security, polite and everywhere |
| Dino and his bribes | A signature broker who sells fast-track countersigns |
| Nika, the journalist | Runs an offline print paper, the only press the labs can't throttle |
| Frank, the Quality whistleblower | A lab safety researcher with proof the model's error rate is hidden |
| Bryce, the CEO | The Steward of the West, the lab CEO now running the region |
| Project RIBEYE | Project something-else: the model is quietly being allowed to sign *without* proxies. Proxies keep the liability, but lose the actual veto. |
| Autonomy Day | The day the Clause is amended |

Same structure: a mid-shift scene on day 3, an inspection on day 9 and a final choice on day 10.

**Endings: 10.** At least one where you get out, one where you get caught, one where you are promoted into the
machine, one where the truth gets out, and one where you are simply replaced. Every ending must read both ledgers.

## Art and sound

- **Same pixel engine and desk.** The window shows drones, a lab billboard and fog. The cold room door becomes a
  ration locker. A wall poster becomes a "Your Alignment Matters" notice.
- **CHUCK's monitor** gets the lab's logo. Add one new mood, `pleased-with-itself`.
- **Title screen:** the steak mascot stays (it's the brand), now wearing a lanyard with a countersigner badge,
  under a drone.
- **Palette:** keep the butcher-paper base, and add a cold "lab" accent (a clinical cyan or sodium orange) used
  only for lab-owned surfaces. Keep the contrast fixes: no functional text under 11px, AA contrast.
- **Audio:** same synth engine. Menu: a slow, thinned-out version of the current lounge tune. Shifts: a quieter loop.
  Add drone hum to ambience on some days.

## Gates (the work is not done until all pass)

| # | Gate | How to measure |
|---|---|---|
| G1 | No regressions | Scripted headless-Chrome playthrough of all 10 days at 1280×800, plus one shift at 390×844 and 844×390: zero page errors, an ending reached. (A previous harness is at `/tmp/lc-test/play.mjs` and uses `playwright-core` from `/tmp/shades-harness`; recreate it inside the repo as `tools/play.mjs` if `/tmp` is gone.) |
| G2 | Clean generator | 3,600+ generated cases across all days: zero unfilled `{placeholders}`, `undefined` or `NaN`; every case's verdict matches its kind |
| G3 | Every flaw is findable | For each template flaw, name the paper or envelope item where the player can see it. List any that are unfindable and fix them |
| G4 | Tone | A fresh reviewer agent with no context reads 5 random shifts plus every story scene and flags anything that names a real entity, reads as partisan, or is cruel for its own sake. Zero flags |
| G5 | Weight balance | Over 200 generated shifts, weighty items average 1.5–2.5 per shift |
| G6 | Mobile | Screenshots at 360×640, 390×844 and 844×390 of menu, briefing, desk with a draft open, report: nothing clipped, stamp bar reachable, no horizontal scroll |
| G7 | Shipped | Pushed to the repo, GitHub Pages build `built`, live URL returns the new title |

## Open decisions (ask the owner before starting)

1. Title: MEAT PROXY (recommended), WET SIGNATURE, or HUMAN IN THE LOOP.
2. Transform in place (the current Outbox disappears from `tzoeov.github.io/the-outbox`), or new repo
   `tzoeov/meat-proxy` and leave The Outbox as it is. Recommended: new repo, so the finished Outbox stays playable.
3. Whether the lab names should nod at real labs (risky, dates fast) or be fully invented (recommended).

## Deliverables

1. The transformed game, live.
2. A gate table with measured values (G1–G7).
3. One line per new template, saying where its flaws show.
4. Anything cut, one line each, with why.
