// The legal notice (mentions légales) of kpopquiz.org, /legal: French law (LCEN, article 6) asks every website to name its publisher,
// its publication director and its host. One place for the text and for the facts the owner still has to give: the three
// [BRACKETED] lines below are each written once. While one is left the page says noindex and stays out of the sitemap.
// (The same notice is on OtakuQuiz and FanQuiz in the run O1 tree, which reads these strings from its copy file.)

export const LEGAL = {
  site: 'KpopQuiz',
  domain: 'kpopquiz.org',
  email: 'contact@kpopquiz.org',
  privacyUrl: 'https://kpopquiz.org/privacy',
  /** The day the text was written, for the sitemap lastmod. */
  written: '2026-10-24',
  title: 'Legal notice',
  sub: 'Mentions légales',
  description: 'Legal notice (mentions légales) of KpopQuiz: who publishes kpopquiz.org, the publication director, the host and where to read the privacy policy.',
  lede: 'The information that French law asks every website to give (article 6 of the LCEN, the law of 21 June 2004 on confidence in the digital economy) about KpopQuiz (kpopquiz.org).',
  publisher: 'Nuri, 6 rue Rémusat, 75016 Paris, France',
  // The facts the owner has not given yet, one line each, replaced before this page is meant to be found.
  form: '[FORME JURIDIQUE]',
  siren: '[SIREN]',
  director: '[DIRECTEUR DE LA PUBLICATION]',
  host: {
    name: 'Vercel Inc.',
    // Printed on vercel.com/legal/privacy-notice (address) and vercel.com/legal/dmca-policy (the only number vercel.com prints).
    address: '440 N Barranca Avenue #4133, Covina, CA 91723, United States',
    phone: '+1 559 288 7060',
  },
} as const;

/** The [BRACKETED] lines still printed on the page: empty once the owner has filled the three facts. */
export function legalPlaceholders(): string[] {
  return [LEGAL.form, LEGAL.siren, LEGAL.director].filter((v) => /^\[[^\]]+\]$/.test(v));
}

/** True when the page can be found by search engines: no placeholder is left. */
export function legalIsComplete(): boolean {
  return legalPlaceholders().length === 0;
}
