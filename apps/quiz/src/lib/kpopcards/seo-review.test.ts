// SEO-LAUNCH-1 review (2026-11-24), fixes 9, 10 and 17: the period and the golden rhythm come from the contract, the publisher of the game is the @id of the network,
// and the odds, the lobby chips and the help page link to each other.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HUB_ORGANIZATION_ID } from '@/lib/site/jsonld';

import { KC } from './contract';
import { cardsGameJsonLd, landingQuestions } from './seo';

const src = (rel: string): string => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

describe('fix 9: numbers from one source', () => {
  it('the landing answers print the period of the contract', () => {
    const how = landingQuestions().find((q) => q.id === 'how')!;
    expect(how.more[0]).toContain(`every ${KC.PERIOD_MIN} minutes`);
  });
  it('the lobby, the odds box and the help page type neither the period nor the golden rhythm', () => {
    const lobby = src('components/cards/lobby-view.tsx');
    expect(lobby).toContain('{KC.PERIOD_MIN}:00');
    expect(lobby).toContain('Every {KC.GOLDEN_EVERY}th pack is golden');
    expect(lobby).not.toMatch(/>10:00</);
    expect(lobby).not.toContain('Every 10th');
    expect(src('components/cards/odds-box.tsx')).not.toContain('Every 10th');
    const faq = src('components/cards/cards-faq.tsx');
    expect(faq).not.toContain('PERIOD_S');
    expect(faq).toContain('KC.PERIOD_MIN');
  });
});

describe('fix 10: the publisher of the game is the Organization of the network', () => {
  it('is a bare @id, as gameJsonLd of the daily games', () => {
    expect(cardsGameJsonLd(null).publisher).toEqual({ '@id': HUB_ORGANIZATION_ID });
  });
});

describe('fix 17: contextual links', () => {
  it('the Gold chips of the lobby and the guarantee of the help page link to the odds page', () => {
    const lobby = src('components/cards/lobby-view.tsx');
    expect(lobby.match(/<Link href=\{kcPath\.odds\}>/g)?.length).toBe(2);
    expect(src('components/cards/cards-faq.tsx')).toMatch(/<Link href=\{kcPath\.odds\}>\{RARITY_LABEL\.UR\} guarantee<\/Link>/);
  });
  it('the disclaimer line of the landing links Bunnyverse to /about', () => {
    expect(src('components/cards/cards-landing.tsx')).toContain('KpopCards is made by <Link href="/about">Bunnyverse</Link>.');
  });
});
