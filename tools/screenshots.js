// SPDX-License-Identifier: Apache-2.0
// Renders the README screenshots from the real screensaver assets.
//
//   npm i -D playwright && npx playwright install chromium
//   node tools/screenshots.js
//
// Each shot loads assets/eilik/index.html with the same options KS passes to a
// published renderer. Shots marked with a pose freeze the running scene and set
// the face classes directly, so a random idle activity can be captured on demand.
const { chromium } = require('playwright');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = 'file://' + path.join(ROOT, 'assets/eilik/index.html');
const OUT = path.join(ROOT, 'docs/images');

const opts = (o) => '#' + encodeURIComponent(JSON.stringify(Object.assign(
  { state: 'idle', eye: '#35E0FF', bg: '#000000', listen: '#7CFF8A',
    think: '#FFC857', speak: '#FF8AD8', size: 100, mouth: false, sleepMin: 10 }, o)));

const float = (fx, ch, x, y, color) => {
  const s = document.createElement('span');
  s.textContent = ch;
  s.style.cssText = `left:${x}vmin;top:${y}vmin;opacity:1;animation:none`;
  if (color) s.style.color = color;
  fx.appendChild(s);
};

const shots = [
  { name: 'state-idle', o: { state: 'idle' }, pose: f => { f.className = 'idle'; } },
  { name: 'state-listening', o: { state: 'listening' }, wait: 900 },
  { name: 'state-thinking', o: { state: 'thinking' }, wait: 1200 },
  { name: 'state-speaking', o: { state: 'speaking', mouth: true }, wait: 900,
    pose: f => { f.classList.add('happy', 'm-smile'); } },
  { name: 'idle-love', o: { state: 'idle' },
    pose: (f, float) => {
      f.className = 'idle happy blush m-smile';
      const fx = f.querySelector('.fx');
      [[0, 0], [4, -6], [7, -12]].forEach(([x, y]) => float(fx, '♥', x, y, '#ff6fa5'));
    } },
  { name: 'idle-whistle', o: { state: 'idle' },
    pose: (f, float) => {
      f.className = 'idle b-up m-o';
      f.style.setProperty('--lx', '5vmin');
      f.style.setProperty('--ly', '-3vmin');
      float(f.querySelector('.fx'), '♪', 4, -3);
    } },
  { name: 'state-sleep', o: { state: 'idle' },
    pose: f => { f.className = 'idle sleep'; f.style.setProperty('--ly', '2vmin'); } },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 760, height: 440 }, deviceScaleFactor: 2 });
  for (const s of shots) {
    await page.goto('about:blank'); // a hash-only change would not re-run the renderer
    await page.goto(ENTRY + opts(s.o));
    await page.waitForTimeout(s.wait || 600);
    if (s.pose) {
      await page.evaluate('for (let i = 1; i < 99999; i++) clearTimeout(i), clearInterval(i)');
      // Drop stray idle effects and recenter before the pose sets its own look.
      await page.evaluate("const f = document.getElementById('face');"
        + "f.querySelector('.fx').innerHTML = '';"
        + "f.style.setProperty('--lx', '0'); f.style.setProperty('--ly', '0');");
      await page.evaluate(`(${s.pose})(document.getElementById('face'), ${float})`);
      await page.waitForTimeout(700);
    }
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    console.log('wrote docs/images/' + s.name + '.png');
  }
  await browser.close();
})();
