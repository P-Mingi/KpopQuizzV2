// The legal notice (mentions légales) of kpopquiz.org, /legal: French law (LCEN, article 6) asks every website to name its publisher,
// its publication director and its host. One place for the text and for the facts the owner still has to give: a
// [BRACKETED] line below is written once. While one is left the page says noindex and stays out of the sitemap.
// Publisher (owner, 2026-10-25): the register names Louis Pecchia, entrepreneur individuel; no trade register line (an EI is not in it).
// (The same notice is on OtakuQuiz and FandomVerse in the run O1 tree, which reads these strings from its copy file.)

export const LEGAL = {
  site: 'KpopQuiz',
  domain: 'kpopquiz.org',
  // hello@ is the only routed mailbox of kpopquiz.org (owner, 2026-10-25).
  email: 'hello@kpopquiz.org',
  privacyUrl: 'https://kpopquiz.org/privacy',
  /** The day the text was written, for the sitemap lastmod. */
  written: '2026-10-24',
  title: 'Legal notice',
  sub: 'Mentions légales',
  description: 'Legal notice (mentions légales) of KpopQuiz: who publishes kpopquiz.org, the publication director, the host and where to read the privacy policy.',
  lede: 'The information that French law asks every website to give (article 6 of the LCEN, the law of 21 June 2004 on confidence in the digital economy) about KpopQuiz (kpopquiz.org).',
  publisher: 'Louis Pecchia, entrepreneur individuel (EI), 3560 chemin des Lauves, 13100 Aix-en-Provence, France',
  form: 'Entrepreneur individuel (EI)',
  siren: 'SIREN 109 686 634, SIRET du siège 109 686 634 00014',
  vat: 'TVA non applicable, article 293 B du CGI',
  director: 'Louis Pecchia',
  // The publisher's phone (owner, 2026-10-25).
  phone: '+33 7 81 55 70 19',
  host: {
    name: 'Vercel Inc.',
    // Printed on vercel.com/legal/privacy-notice (address) and vercel.com/legal/dmca-policy (the only number vercel.com prints).
    address: '440 N Barranca Avenue #4133, Covina, CA 91723, United States',
    phone: '+1 559 288 7060',
  },
} as const;

/** The [BRACKETED] lines still printed on the page: empty once the owner has filled every fact. */
export function legalPlaceholders(): string[] {
  return [LEGAL.form, LEGAL.siren, LEGAL.director, LEGAL.phone].filter((v) => /^\[[^\]]+\]$/.test(v));
}

/** True when the page can be found by search engines: no placeholder is left. */
export function legalIsComplete(): boolean {
  return legalPlaceholders().length === 0;
}
