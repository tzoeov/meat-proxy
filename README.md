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

- `node tools/smoke.js js`: generates 4,800 cases across all ten days and fails loudly on any unfilled placeholder.
- `node tools/play.mjs`: plays the whole campaign in headless Chrome plus three phone viewports and reports page
  errors. Needs `playwright-core`; point `PW_HOME` at a `package.json` whose `node_modules` has it.

`docs/BRIEF.md` is the brief this game was built from.
