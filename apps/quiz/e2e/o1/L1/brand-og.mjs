// Run O1, lane L1: the default share image (1200x630) of anime and hub, in the style of public/og-default.png
// (white card, 8 px pink bar on top, two-tone lower-case wordmark, one grey line, a row of grey pills) with the
// site's own name instead of "kpop quizz". Same renderer as the app's /api/og routes (@vercel/og, satori) and the
// same brand font (public/fonts/dm-sans-*.ttf); the colours are the ones measured on og-default.png.
//
//   node apps/quiz/e2e/o1/L1/brand-og.mjs            writes public/brand/anime/og-default.png and public/brand/hub/og-default.png
//   node apps/quiz/e2e/o1/L1/brand-og.mjs --check    exit 1 when a committed file differs from a fresh render
//
// The words come from the registry (brand name, split at "Quiz", else at "Verse", like lib/site/brand.ts) and from the copy of each site;
// do not edit the PNGs by hand: change this file and run it again.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ImageResponse } from '@vercel/og';

const QUIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PUBLIC = join(QUIZ, 'public');

// Colours and sizes measured on public/og-default.png (1200x630).
const PINK = '#ED93B1';
const INK = '#1A1A1A';
const GREY = '#6B6B6B';
const PILL = '#F5F3EF';

// Per site: the wordmark (head + tail of the registry brand name, lower case), the line under it and the pills.
const SITES = {
  anime: {
    head: 'otaku', tail: 'quiz',
    line: 'Anime quizzes made by fans.',
    pills: ['Series quizzes', 'Trivia', 'Openings', 'Which character are you', 'Daily quiz'],
  },
  hub: {
    head: 'bunny', tail: 'verse',
    line: 'One account for the fan quiz sites.',
    pills: ['Your passport', 'Your sites', 'Sign in once'],
  },
};

function font(file) {
  const b = readFileSync(join(PUBLIC, 'fonts', file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

const el = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });

function card({ head, tail, line, pills }) {
  return el('div', { width: 1200, height: 630, background: '#FFFFFF', flexDirection: 'column', alignItems: 'center', fontFamily: 'DM Sans' }, [
    el('div', { width: 1200, height: 8, background: PINK }, ''),
    el('div', { flexDirection: 'column', alignItems: 'center', marginTop: 205 }, [
      el('div', { fontSize: 64, lineHeight: 1, letterSpacing: -1 }, [
        el('span', { color: INK }, head),
        el('span', { color: PINK, marginLeft: 8 }, tail),
      ]),
      el('div', { fontSize: 25, color: GREY, marginTop: 30 }, line),
      el('div', { marginTop: 52, gap: 12 }, pills.map((p) => el('div', { height: 32, padding: '0 16px', borderRadius: 16, background: PILL, color: GREY, fontSize: 16, alignItems: 'center' }, p))),
    ]),
  ]);
}

const FONTS = [
  { name: 'DM Sans', data: font('dm-sans-400.ttf'), weight: 400, style: 'normal' },
  { name: 'DM Sans', data: font('dm-sans-700.ttf'), weight: 700, style: 'normal' },
];

const check = process.argv.includes('--check');
let differs = 0;
for (const [site, words] of Object.entries(SITES)) {
  const res = new ImageResponse(card(words), { width: 1200, height: 630, fonts: FONTS });
  const png = Buffer.from(await res.arrayBuffer());
  const file = join(PUBLIC, 'brand', site, 'og-default.png');
  if (check) {
    let have = null;
    try { have = readFileSync(file); } catch { /* missing */ }
    if (!have || !have.equals(png)) { differs += 1; console.log(`differs: public/brand/${site}/og-default.png`); }
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, png);
    console.log(`wrote public/brand/${site}/og-default.png (${png.length} bytes)`);
  }
}
if (check) { console.log(`og-default check, differing files: ${differs}`); process.exit(differs ? 1 : 0); }
