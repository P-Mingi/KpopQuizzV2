import pkg from '/Users/louis/IT/Dev/projects/KpopQuizzV2/node_modules/.pnpm/@playwright+test@1.63.0/node_modules/@playwright/test/index.js';
const { chromium } = pkg;
const O = process.env.O;
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, out] of [[1440, `${O}/mine-1440.png`], [390, `${O}/mine-390.png`]]) {
  const p = await b.newPage({ viewport: { width: w, height: 1400 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(20000);
  await p.goto('http://localhost:3021/games', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForSelector('.gh', { timeout: 20000 });
  await p.waitForTimeout(1500);
  await p.evaluate(async () => { await Promise.all([...document.images].map(i => (i.complete ? 0 : i.decode().catch(() => {})))); });
  const el = await p.$('.gh');
  const box = await el.boundingBox();
  await el.screenshot({ path: out });
  console.log(out.split('/').pop(), 'w=' + Math.round(box.width), 'h=' + Math.round(box.height));
  await p.close();
}
await b.close();
console.log('DONE');
