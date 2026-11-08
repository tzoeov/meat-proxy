// Renders the 1200×630 link-preview card (og.png) from the game's own title art.
// Usage: node tools/og.mjs [out.png]
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import os from 'os';
import fs from 'fs';

const require = createRequire(process.env.PW_HOME || '/tmp/shades-harness/package.json');
const { chromium } = require('playwright-core');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'og.png');
const js = (f) => pathToFileURL(path.join(root, 'js', f)).href;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=VT323&display=swap">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #efe5d4; }
  canvas { position: absolute; inset: 0; width: 1200px; height: 630px; image-rendering: pixelated; }
  .card { position: absolute; left: 64px; top: 0; bottom: 100px; display: flex; flex-direction: column; justify-content: center; gap: 18px; width: 560px; }
  .eyebrow { font-family: 'Silkscreen', monospace; font-size: 22px; letter-spacing: .24em; color: #8e2536; }
  h1 { margin: 0; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 116px; line-height: .9; color: #1f1614; text-shadow: 8px 8px 0 #c23e52; }
  p { margin: 0; font-family: 'VT323', monospace; font-size: 46px; line-height: 1.05; color: #1f1614; background: rgba(243,234,219,.88); padding: 4px 8px; align-self: flex-start; }
  .foot { font-family: 'VT323', monospace; font-size: 30px; color: #6b5a50; }
</style></head><body>
<canvas id="c" width="240" height="126"></canvas>
<div class="card">
  <div class="eyebrow">SAN FRANCISCO · 2031</div>
  <h1>MEAT<br>PROXY</h1>
  <p>The AI decides. You sign.<br>You’re liable.</p>
  <div class="foot">A Meat Proxies game</div>
</div>
<script src="${js('data.js')}"></script>
<script src="${js('content.js')}"></script>
<script src="${js('gen.js')}"></script>
<script src="${js('art.js')}"></script>
</body></html>`;

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const tmp = path.join(os.tmpdir(), 'meat-proxy-og.html');
fs.writeFileSync(tmp, html);
await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
await page.evaluate(async () => {
  await document.fonts.ready;
  Art.title(document.getElementById('c'), 0);
});
await page.screenshot({ path: out });
await browser.close();
if (errors.length) { console.error('Errors:', errors); process.exit(1); }
console.log('wrote', out);
