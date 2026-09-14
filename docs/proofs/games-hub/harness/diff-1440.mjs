import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// args: mine.png oracle.png cropX cropY outDiff.png label
const [mineP, oracP, cropX, cropY, outP, label] = process.argv.slice(2);
const mine = PNG.sync.read(fs.readFileSync(mineP));
const orac = PNG.sync.read(fs.readFileSync(oracP));
const cx = parseInt(cropX, 10), cy = parseInt(cropY, 10);

// crop oracle to [cx, cy, mine.width, ...] then compare over common height
const W = mine.width;
const H = Math.min(mine.height, orac.height - cy);
function cropTo(src, ox, oy, w, h) {
  const dst = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((oy + y) * src.width + (ox + x)) << 2;
      const di = (y * w + x) << 2;
      dst.data[di] = src.data[si]; dst.data[di+1] = src.data[si+1];
      dst.data[di+2] = src.data[si+2]; dst.data[di+3] = src.data[si+3];
    }
  }
  return dst;
}
const A = cropTo(mine, 0, 0, W, H);
const B = cropTo(orac, cx, cy, W, H);
const diff = new PNG({ width: W, height: H });
const nmm = pixelmatch(A.data, B.data, diff.data, W, H, { threshold: 0.14, includeAA: false, alpha: 0.4 });
fs.writeFileSync(outP, PNG.sync.write(diff));
const pct = (100 * nmm / (W * H)).toFixed(2);
console.log(`${label}: ${W}x${H}  mismatch=${nmm}px  ${pct}%`);
