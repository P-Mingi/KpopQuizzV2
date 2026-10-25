// Run O1, lot H2a: stacks the design block, the page block and their diff of compare.mjs into one image to look at.
//   node apps/quiz/e2e/o1/H1/H2a/stack.mjs <cmpDir>/<case> <block> <outFile>
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const [dir, n, out] = process.argv.slice(2);
const files = ['design', 'impl', 'diff'].map((p) => join(dir, `${p}-${n}.png`));
const metas = await Promise.all(files.map((f) => sharp(f).metadata()));
const W = Math.max(...metas.map((m) => m.width));
const H = metas.reduce((a, m) => a + m.height + 8, 0);
let top = 0;
const layers = [];
for (const [i, f] of files.entries()) { layers.push({ input: await sharp(f).toBuffer(), left: 0, top }); top += metas[i].height + 8; }
await sharp({ create: { width: W, height: H, channels: 3, background: '#bbbbbb' } }).composite(layers).png().toFile(out);
