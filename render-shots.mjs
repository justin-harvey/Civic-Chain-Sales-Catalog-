// Render the built catalog headless and capture key views as PNGs for review.
import pw from '/home/nah/Claudia/civic-chain-test-suite/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdirSync } from 'node:fs';

const file = 'file://' + process.cwd() + '/site/index.html';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();

async function run(label, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await page.goto(file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  async function shot(name, full = true) {
    await page.waitForTimeout(300);
    await page.screenshot({ path: `shots/${label}-${name}.png`, fullPage: full });
    console.log('shot', label, name);
  }
  await shot('1-cover', false);
  await page.click('.view.active .enter');
  await shot('2-segments', true);
  await page.click('.view.active .toc[data-nav="municipal"]');
  await shot('3-municipal', true);
  await page.click('.view.active .back');
  await page.click('.view.active .toc[data-nav="hoa"]');
  await shot('4-hoa', true);
  await page.click('.view.active .back');
  await page.click('.view.active .home-link[data-nav="pricing"]');
  await shot('5-pricing', true);
  await page.close();
}

await run('desktop', { width: 1280, height: 860 });
await run('mobile', { width: 390, height: 844 });

await browser.close();
console.log('done');
