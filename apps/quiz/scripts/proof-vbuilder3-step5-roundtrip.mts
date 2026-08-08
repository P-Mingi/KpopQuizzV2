// V-BUILDER-3 step 5 - HERO OVERRIDE round-trip + reset + hostile-input receipt.
// The identity overrides live in the presentation META (presentation.hero) and ride the
// SAME draft rail as every block edit:
//   composition.meta.hero
//     -> compositionToPresentation -> JSON -> validatePresentation (save)
//     -> JSON -> presentationToComposition (reload)
// Asserts: all five override fields survive intact; a RESET (clearing meta.hero) writes an
// absent hero (parity: absent === data-driven default); and a hostile EXTERNAL image URL is
// rejected by the schema clamp (L-047, never hotlinked).
//   pnpm -C apps/quiz exec tsx scripts/proof-vbuilder3-step5-roundtrip.mts
import { compositionToPresentation, presentationToComposition } from '../src/lib/verse/composition/convert';
import { validatePresentation } from '../src/lib/verse/presentation/validate';
import type { Composition } from '../src/lib/verse/composition/types';
import type { HeroIdentity } from '../src/lib/verse/presentation/types';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
let failures = 0;
const check = (name: string, cond: boolean, detail = ''): void => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
  if (!cond) failures += 1;
};

const HERO: HeroIdentity = {
  banner: 'space/7/banner-9a8b.webp',
  avatar: 'space/7/avatar-1c2d.webp',
  displayName: 'STELLAR',
  tagline: 'Twelve stars, one sky.',
  chips: [{ label: 'Debut', value: '2018' }, { value: '12 members' }],
};

const withHero = (hero: HeroIdentity | undefined): Composition => ({
  version: 1,
  meta: hero ? { accent: '#6633ff', hero } : { accent: '#6633ff' },
  sections: [{ id: 'home', width: 'wide', blocks: [
    { id: 'blk-intro-0', type: 'intro', zone: 'main' },
    { id: 'blk-vitals-0', type: 'vitals', zone: 'main' },
    { id: 'blk-members-0', type: 'members', zone: 'main' },
    { id: 'blk-discography-0', type: 'discography', zone: 'main' },
  ] }],
});

// ---- SAVE + RELOAD round-trip ----------------------------------------------
const saved = validatePresentation(clone(compositionToPresentation(withHero(HERO))));
check('save accepted', saved.ok && saved.errors.length === 0, saved.errors.join(' | ') || 'ok');
if (!saved.ok || !saved.value) { console.log(`\nstep-5 round-trip FAILED`); process.exit(1); }
check('validator kept presentation.hero', !!saved.value.hero, JSON.stringify(saved.value.hero));

const reloaded = presentationToComposition(clone(saved.value));
const outHero = reloaded.meta?.hero as HeroIdentity | undefined;
check('banner override intact', outHero?.banner === HERO.banner, String(outHero?.banner));
check('avatar override intact', outHero?.avatar === HERO.avatar, String(outHero?.avatar));
check('displayName override intact', outHero?.displayName === HERO.displayName, String(outHero?.displayName));
check('tagline override intact', outHero?.tagline === HERO.tagline, String(outHero?.tagline));
check('vitals chips intact', JSON.stringify(outHero?.chips) === JSON.stringify(HERO.chips), JSON.stringify(outHero?.chips));

// ---- RESET (clear the hero) -> absent === data-driven default ---------------
const resetSaved = validatePresentation(clone(compositionToPresentation(withHero(undefined))));
check('reset save accepted', resetSaved.ok, resetSaved.errors.join(' | ') || 'ok');
check('after reset, presentation.hero is ABSENT (parity: default look)', resetSaved.value?.hero === undefined,
  JSON.stringify(resetSaved.value?.hero));

// ---- HOSTILE: an external image URL must be rejected (L-047) ----------------
const hostile = validatePresentation(clone(compositionToPresentation(withHero({ banner: 'https://evil.example/x.jpg', displayName: 'ok' }))));
const bannerDropped = !hostile.value?.hero?.banner;
const gotSentence = hostile.errors.some((e) => /uploaded image|external URL|our own storage/i.test(e));
// The whole save fails with a human sentence (hostile value never persists).
check('external banner URL rejected (dropped or save-blocked with a sentence)', bannerDropped || !hostile.ok,
  hostile.ok ? JSON.stringify(hostile.value?.hero) : hostile.errors.join(' | '));
check('rejection carries a human sentence about uploaded-only images', gotSentence || !hostile.ok,
  hostile.errors.join(' | ') || '(clamped silently)');

console.log(`\nstep-5 hero round-trip + reset: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
