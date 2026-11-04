// Run PWA: every word of the install banner and of the offline page, in the two languages of the pages (English at /, French under /fr),
// the way lib/dle/copy.ts does it: a table per locale, the brand filled in from the registry, never typed here. The French is for the
// owner to read. No dash characters, no emoji (CLAUDE.md). Free of next/* and browser globals: the browser code and the worker builder share it.

export type PwaLocale = 'en' | 'fr';

export interface PwaCopy {
  /** The banner on Android and desktop Chrome: the native install window opens from the button. */
  readonly installTitle: string;
  readonly installBody: string;
  readonly install: string;
  /** Dismisses the banner for 30 days. */
  readonly notNow: string;
  /** The label of the close button (the cross). */
  readonly close: string;
  /** The banner on iPhone and iPad (Safari has no install window): the two gestures. */
  readonly iosTitle: string;
  readonly iosStep1: string;
  readonly iosStep2: string;
  /** The offline page, shown by the worker only when the requested page does not answer. */
  readonly offlineTitle: string;
  readonly offlineBody: string;
  readonly offlineRetry: string;
}

const EN: PwaCopy = {
  installTitle: 'Install {brand}',
  installBody: 'Open {brand} in one tap from your home screen.',
  install: 'Install',
  notNow: 'Not now',
  close: 'Close',
  iosTitle: 'Add {brand} to your home screen',
  iosStep1: 'Tap Share',
  iosStep2: 'Then tap Add to Home Screen',
  offlineTitle: 'No connection',
  offlineBody: 'You are offline. Reconnect, then try again.',
  offlineRetry: 'Try again',
};

const FR: PwaCopy = {
  installTitle: 'Installer {brand}',
  installBody: "Ouvrez {brand} en un geste depuis votre écran d'accueil.",
  install: 'Installer',
  notNow: 'Pas maintenant',
  close: 'Fermer',
  iosTitle: "Ajouter {brand} à l'écran d'accueil",
  iosStep1: 'Touchez Partager',
  iosStep2: "Puis touchez Sur l'écran d'accueil",
  offlineTitle: 'Pas de connexion',
  offlineBody: 'Vous êtes hors ligne. Reconnectez-vous, puis réessayez.',
  offlineRetry: 'Réessayer',
};

export const PWA_COPY: Readonly<Record<PwaLocale, PwaCopy>> = { en: EN, fr: FR };

/** The copy of a locale with {brand} filled in (the name of the app: KpopQuiz or Bunnyverse). */
export function pwaCopy(locale: PwaLocale, brand: string): PwaCopy {
  const fill = (s: string): string => s.replace(/\{brand\}/g, brand);
  const raw = PWA_COPY[locale];
  return {
    installTitle: fill(raw.installTitle), installBody: fill(raw.installBody), install: raw.install, notNow: raw.notNow, close: raw.close,
    iosTitle: fill(raw.iosTitle), iosStep1: raw.iosStep1, iosStep2: raw.iosStep2,
    offlineTitle: raw.offlineTitle, offlineBody: raw.offlineBody, offlineRetry: raw.offlineRetry,
  };
}
