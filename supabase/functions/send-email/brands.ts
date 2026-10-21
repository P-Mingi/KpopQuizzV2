// Run O1, lot (e), lane B7: the three brands the Send Email Hook renders, a mirror of apps/quiz/src/lib/site/registry.ts
// (brand name, url, domain, NETWORK.name) because the function cannot import it. email.copy.test.ts compares the two.
import type { MailBrand, MailSite } from './render.ts';

export const BRANDS: Readonly<Record<MailSite, MailBrand>> = {
  kpop: { id: 'kpop', name: 'KpopQuiz', url: 'https://kpopquiz.org', domain: 'kpopquiz.org', network: 'FanQuiz', privacyPath: '/privacy', accent: '#E8458B' },
  anime: { id: 'anime', name: 'OtakuQuiz', url: 'https://otakuquiz.org', domain: 'otakuquiz.org', network: 'FanQuiz', privacyPath: '/privacy', accent: '#C2410C' },
  hub: { id: 'hub', name: 'FanQuiz', url: 'https://fanquiz.org', domain: 'fanquiz.org', network: 'FanQuiz', privacyPath: '/privacy', accent: '#2B2F3A' },
};
