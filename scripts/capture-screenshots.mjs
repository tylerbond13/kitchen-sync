// Capture a screenshot of each game screen for the CURRENT running build and
// save them to docs/screenshots/v<version>/. Builds a visual archive of the
// game's progression, one folder per release.
//
// Usage:
//   npm start                    # in one terminal (serves http://localhost:3000)
//   npm i puppeteer-core --no-save   # one-time (drives your installed Chrome)
//   node scripts/capture-screenshots.mjs
//
// Env: BASE_URL (default http://localhost:3000), CHROME_PATH (auto-detected on mac).
//
// Captures the game in its native landscape-phone orientation (844×390 @2x),
// plus a portrait home shot. Uses a fresh browser profile every run, so it
// always lands on a clean first-visit state.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH || (
  process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/google-chrome'
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const version = await fetch(`${BASE}/api/version`).then((r) => r.json()).then((v) => v.version).catch(() => 'dev');
  const outDir = path.join('docs', 'screenshots', `v${version}`);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Capturing v${version} → ${outDir}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  const landscape = () => page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const portrait  = () => page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await landscape();

  const shot = async (name) => {
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`  ✓ ${name}.png`);
  };
  const step = async (name, fn) => {
    try { await fn(); await sleep(600); await shot(name); }
    catch (e) { console.warn(`  ✗ ${name} skipped: ${e.message}`); }
  };
  const click = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) throw new Error('no ' + s);
    el.click();
  }, sel);

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  // Skip the one-time welcome card so shots show the standard home screen
  await page.evaluate(() => { try { document.getElementById('btn-welcome-done')?.click(); } catch (_) {} });
  await sleep(1500); // fonts + art settle

  // 1. Home (landscape two-pane)
  await step('home', async () => {});

  // 2. What's-new changelog
  await step('changelog', async () => { await click('#btn-whatsnew-home'); });
  await page.evaluate(() => document.getElementById('btn-changelog-close')?.click()).catch(() => {});

  // 3. Lobby (landscape card pager — lands on Levels)
  await step('lobby-levels', async () => {
    await page.evaluate(() => { const i = document.getElementById('name-input'); if (i && !i.value) i.value = 'Archivist'; });
    await click('#btn-create');
    await page.waitForFunction(() => document.getElementById('screen-lobby')?.classList.contains('active'), { timeout: 8000 });
    await sleep(1200);
  });

  // 4. Milestones panel
  await step('milestones', async () => { await click('#btn-milestones'); });
  await page.evaluate(() => document.getElementById('btn-milestones-close')?.click()).catch(() => {});

  // 5. Character grid (Smash-style modal)
  await step('characters', async () => { await click('#btn-change-chef'); });
  await page.evaluate(() => document.getElementById('btn-chef-modal-close')?.click()).catch(() => {});

  // 6. Shop (swipe the pager to the Shop card)
  await step('lobby-shop', async () => {
    await page.evaluate(() => {
      const card = document.getElementById('shop-card');
      if (card) card.scrollIntoView({ inline: 'center', block: 'nearest' });
    });
  });

  // 7. In-game — start the first level, skip the tutorial, let sprites land
  await step('game', async () => {
    await page.evaluate(() => {
      const node = document.querySelector('#level-list .roadmap-node:not(.locked)') ||
                   document.querySelector('#level-list .roadmap-node') ||
                   document.querySelector('#level-list button');
      if (!node) throw new Error('no level node');
      node.click();
    });
    await page.waitForFunction(() => document.getElementById('screen-game')?.classList.contains('active'), { timeout: 8000 });
    await sleep(800);
    await page.evaluate(() => document.getElementById('btn-tutorial-skip')?.click());
    await sleep(12000); // 3.2s countdown + cold sprite prep (keying/trim) settle
  });

  // 8. Pause menu (music console + relocated tools)
  await step('pause', async () => { await click('#btn-pause'); await sleep(400); });
  await page.evaluate(() => document.getElementById('btn-resume')?.click()).catch(() => {});

  // 9. Portrait home for reference
  await step('home-portrait', async () => {
    await page.evaluate(() => document.getElementById('btn-pause')?.click());
    await sleep(300);
    await page.evaluate(() => document.getElementById('btn-exit-lobby')?.click());
    await sleep(700);
    await page.evaluate(() => document.getElementById('btn-leave')?.click());
    await sleep(800);
    await portrait();
    await sleep(600);
  });

  await browser.close();
  console.log(`Done → ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
