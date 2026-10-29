// Run O1, lot H2a (owner, 2026-10-25): the KpopQuiz rabbit followed by the wordmark of the site, for the default share image of
// the hub (Bunnyverse) and of the anime site (OtakuQuiz), the wordmark written as the name is (Bunnyverse, OtakuQuiz). Same renderer and same face as e2e/o1/L1/brand-og.mjs (@vercel/og, public/fonts/dm-sans-*.ttf).
// The rabbit is public/mascot/mascot-default.png as kpopquiz.org's navigation draws it. The hub is ink and cream, its wordmark "Bunny" in ink
// and "verse" in the pink of the mockups (owner, 2026-10-29: HUB_WORDMARK_TAIL of src/lib/site/brand.ts, a test compares them); the anime
// site is orange.
//
//   node apps/quiz/e2e/o1/H1/H2a/brand-marks.mjs            writes public/brand/{hub,anime}/og-default.png
// The icons, favicons and logo PNGs of the two sites stay kpopquiz's bytes (owner decision D-099, routing.test.ts): they are the rabbit already.
// The wordmark of each site (2026-10-28) is public/brand/{hub,anime}/logo-primary.svg: the same rabbit and name, the name outlined in DM Sans 800.
//   node apps/quiz/e2e/o1/H1/H2a/brand-marks.mjs --check    exit 1 when a file differs from a fresh render
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ImageResponse } from '@vercel/og';

const QUIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const PUBLIC = join(QUIZ, 'public');

const RABBIT = `data:image/png;base64,${readFileSync(join(PUBLIC, 'mascot', 'mascot-default.png')).toString('base64')}`;
const PILL = '#F5F3EF';
const GREY = '#6B6B6B';
const SITES = {
  hub: {
    head: 'Bunny', tail: 'verse', ink: '#1F1B17', accent: '#D13A6E', bar: '#1F1B17',
    line: 'One account for the fan quiz sites.',
    pills: ['Your passport', 'Your sites', 'Sign in once'],
  },
  anime: {
    head: 'Otaku', tail: 'Quiz', ink: '#1F1B17', accent: '#C2410C', bar: '#C2410C',
    line: 'Anime quizzes made by fans.',
    pills: ['Series quizzes', 'Trivia', 'Openings', 'Which character are you', 'Daily quiz'],
  },
};

function font(file) {
  const b = readFileSync(join(PUBLIC, 'fonts', file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
const FONTS = [
  { name: 'DM Sans', data: font('dm-sans-400.ttf'), weight: 400, style: 'normal' },
  { name: 'DM Sans', data: font('dm-sans-700.ttf'), weight: 700, style: 'normal' },
  { name: 'DM Sans', data: font('dm-sans-800.ttf'), weight: 800, style: 'normal' },
];

const el = (type, style, children, props = {}) => ({ type, props: { ...props, style: { display: 'flex', ...style }, children } });
const img = (size) => ({ type: 'img', props: { src: RABBIT, width: size, height: size, style: { width: size, height: size } } });

function og(s) {
  return el('div', { width: 1200, height: 630, background: '#FFFFFF', flexDirection: 'column', alignItems: 'center', fontFamily: 'DM Sans' }, [
    el('div', { width: 1200, height: 8, background: s.bar }, ''),
    el('div', { flexDirection: 'column', alignItems: 'center', marginTop: 175 }, [
      el('div', { alignItems: 'center', gap: 18 }, [
        img(112),
        el('div', { fontSize: 64, lineHeight: 1, letterSpacing: -1, fontWeight: 800 }, [
          el('span', { color: s.ink }, s.head),
          el('span', { color: s.accent }, s.tail),
        ]),
      ]),
      el('div', { fontSize: 25, color: GREY, marginTop: 30 }, s.line),
      el('div', { marginTop: 52, gap: 12 }, s.pills.map((p) => el('div', { height: 32, padding: '0 16px', borderRadius: 16, background: PILL, color: GREY, fontSize: 16, alignItems: 'center' }, p))),
    ]),
  ]);
}

async function render(node, width, height) {
  return Buffer.from(await new ImageResponse(node, { width, height, fonts: FONTS }).arrayBuffer());
}

const check = process.argv.includes('--check');
let differs = 0;
async function put(site, name, png) {
  const file = join(PUBLIC, 'brand', site, name);
  let have = null;
  try { have = readFileSync(file); } catch { /* missing */ }
  if (check) {
    if (!have || !have.equals(png)) { differs += 1; console.log(`differs: public/brand/${site}/${name}`); }
  } else {
    writeFileSync(file, png);
    console.log(`wrote public/brand/${site}/${name} (${png.length} bytes)`);
  }
}
for (const [site, s] of Object.entries(SITES)) {
  await put(site, 'og-default.png', await render(og(s), 1200, 630));
}
if (check) { console.log(`brand marks check, differing files: ${differs}`); process.exit(differs ? 1 : 0); }
