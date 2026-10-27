// Run O1, lot H2a: the white rabbit of the two doors (the rabbit of public/mascot/mascot-default.png in white, its face in the colour of the
// tile behind it). The body of the rabbit is dark, so its opacity is how dark each pixel is; the white sticker edge and the eyes become clear.
//   node apps/quiz/e2e/o1/H1/H2a/rabbit-white.mjs     writes apps/quiz/src/components/hub/home/rabbit-white.png
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const QUIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const require = createRequire(join(QUIZ, 'package.json'));
const sharp = require('sharp');

const { data, info } = await sharp(join(QUIZ, 'public/mascot/mascot-default.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < info.width * info.height; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const dark = Math.min(1, Math.max(0, (0.62 - lum) / 0.62));
  out[i * 4] = 255; out[i * 4 + 1] = 255; out[i * 4 + 2] = 255;
  out[i * 4 + 3] = Math.round(a * dark);
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(join(QUIZ, 'src/components/hub/home/rabbit-white.png'));
console.log('written', info.width, 'x', info.height);
