// V-BUILDER-3 step 3 proof: the ingest CORE (security-critical, pure).
//   - reEncode STRIPS EXIF, bounds size, rejects SVG + non-image, keeps GIF, hashes for dedupe.
//   - fetchExternalImage is SSRF-hardened (https only, private/link-local IPs blocked).
//   npx tsx scripts/vb3-image-ingest-verify.mts
import sharp from 'sharp';
import { reEncode, fetchExternalImage } from '../src/lib/verse/image-ingest';

let failed = 0;
const check = (name: string, cond: boolean, detail = '') => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`); if (!cond) failed++; };

// a red 8x8 PNG + a JPEG carrying EXIF
const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 220, g: 40, b: 80 } } }).png().toBuffer();
const jpegWithExif = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 200, b: 90 } } })
  .withExif({ IFD0: { Copyright: 'KPOPQUIZ_EXIF_MARKER', Software: 'secret-camera' } }).jpeg().toBuffer();
const gif = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).gif().toBuffer();

console.log('\n(a) reEncode');
{
  const r = await reEncode(png);
  check('valid PNG accepted', !('error' in r));
  if (!('error' in r)) { check('  ext/mime png', r.ext === 'png' && r.mime === 'image/png'); check('  has sha256 hash', /^[a-f0-9]{64}$/.test(r.hash)); }
}
{
  // EXIF STRIP: the source jpeg has EXIF; the re-encoded output must not.
  const srcMeta = await sharp(jpegWithExif).metadata();
  check('source jpeg carries EXIF (test fixture valid)', !!srcMeta.exif);
  const r = await reEncode(jpegWithExif);
  check('jpeg accepted', !('error' in r));
  if (!('error' in r)) {
    const outMeta = await sharp(r.out).metadata();
    check('  EXIF STRIPPED from the stored bytes', !outMeta.exif);
  }
}
{
  const r1 = await reEncode(png); const r2 = await reEncode(png);
  check('DEDUPE: same bytes -> identical hash', !('error' in r1) && !('error' in r2) && (r1 as { hash: string }).hash === (r2 as { hash: string }).hash);
}
{
  const r = await reEncode(gif);
  check('GIF accepted + kept as gif', !('error' in r) && (r as { ext: string }).ext === 'gif');
}
{
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const r = await reEncode(svg);
  check('SVG REJECTED (XSS gate)', 'error' in r && /SVG/.test((r as { error: string }).error));
}
{
  const r = await reEncode(Buffer.from('this is definitely not an image at all'));
  check('non-image rejected', 'error' in r);
}

console.log('\n(b) fetchExternalImage SSRF hardening');
{
  const cases: [string, RegExp][] = [
    ['http://example.com/x.png', /https/],
    ['https://127.0.0.1/x.png', /private/],
    ['https://10.0.0.5/x.png', /private/],
    ['https://169.254.169.254/latest', /private/],   // cloud metadata endpoint
    ['https://[::1]/x.png', /private/],
    ['not a url', /valid URL/],
  ];
  for (const [u, re] of cases) {
    const r = await fetchExternalImage(u);
    check(`blocks ${u}`, 'error' in r && re.test(r.error), 'error' in r ? r.error : 'NO ERROR');
  }
}

console.log(`\nRESULT: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (image ingest core)`);
process.exit(failed === 0 ? 0 : 1);
