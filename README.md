# MEAT PROXY

San Francisco, 2031. AI labs run the country under the Stewardship Accords. The law still says a human must
countersign every automated decision about a person, so that someone can be blamed. That human is you.

A Meat Proxies game. Play it at **https://tzoeov.github.io/meat-proxy/**.

## Run locally

Plain static files, no build step. Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Code

| File | What it holds |
|---|---|
| `js/data.js` | World constants: statutes, stamps, citizens, the civic feed, the Oversight bulletin |
| `js/content.js` | Request templates (contractor items and civic decisions), CHUCK's and colleagues' lines |
| `js/gen.js` | Staff roster and case generator, CHUCK's answers |
| `js/story.js` | The 10-day story, scenes and endings |
| `js/art.js` | Pixel portraits, uniforms, the office scene, title screen |
| `js/audio.js` | Synthesised music, ambience and effects |
| `js/game.js` | Game loop, desk UI, scoring, saves, menus |

## Checks

- `node tools/smoke.js js`: the content and rules gate. It generates 10,828 cases across all ten days plus endless and
  exits non-zero on any problem. It checks that every flaw tag maps to a statute clause and is graded by it, that each
  slot kind gets its verdict, that every flaw is visible on the papers, that approve cases carry a valid seal, ink,
  reference and approver, that the bulletin follows `DAY_PLAN` and §13, that late-game flaws appear only from day 6,
  that story cases have their own CHUCK lines and second versions, and that 100 simulated shifts never repeat a line.
  It also checks that each day's answer key changes from campaign to campaign, and that a source which leaves a weekday
  out only does so for dates on the desk calendar's pages.
- `node tools/logic.mjs`: drives the real game in headless Chrome over `file://`: every outcome and its report label,
  ending precedence for all 12 endings, the reload-in-evening file warning, focus and keyboard rules, phone tutorial
  wording, share text and endless escalation, the mother's bill state by state, and a structural save fuzz (every field
  of a real save set to each damaging value, then Continue and act). Every page runs on a seeded `Math.random`
  (`LOGIC_SEED` picks another), so a run repeats exactly. Exits non-zero on failure.
- `node tools/play.mjs`: plays the whole campaign in headless Chrome plus three phone viewports and reports page
  errors.

`logic.mjs` and `play.mjs` need `playwright-core`: point `PW_HOME` at a `package.json` whose `node_modules` has it.

`docs/BRIEF.md` is the brief this game was built from.
