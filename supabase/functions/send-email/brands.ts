// Run O1, lot (e), lane B7: the three brands the Send Email Hook renders, a mirror of apps/quiz/src/lib/site/registry.ts
// (brand name, url, domain, NETWORK.name) because the function cannot import it. email.copy.test.ts compares the two.
import type { MailBrand, MailSite } from './render.ts';

export const BRANDS: Readonly<Record<MailSite, MailBrand>> = {
  kpop: { id: 'kpop', name: 'KpopQuiz', url: 'https://kpopquiz.org', domain: 'kpopquiz.org', network: 'FandomVerse', privacyPath: '/privacy', accent: '#E8458B' },
  anime: { id: 'anime', name: 'OtakuQuiz', url: 'https://fandomverse.org/anime', domain: 'fandomverse.org', network: 'FandomVerse', privacyPath: '/privacy', accent: '#C2410C' },
  hub: { id: 'hub', name: 'FandomVerse', url: 'https://fandomverse.org', domain: 'fandomverse.org', network: 'FandomVerse', privacyPath: '/privacy', accent: '#2B2F3A' },
};
