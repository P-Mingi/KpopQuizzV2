// Bunnyverse, lot 4 B6 (the installable hub): the texts the PWA brings. The UI lane's FAQ reads PWA_FAQ; the orchestrator wires it.

/** The FAQ question and its answer: can Bunnyverse go on the home screen. */
export const PWA_FAQ = {
  question: 'Can I add Bunnyverse to my home screen?',
  answer:
    'Yes. On Android and desktop Chrome or Edge, open the browser menu and choose Install app or Add to Home screen. On iPhone and iPad, open Bunnyverse in Safari, tap Share, then Add to Home Screen. It opens full screen like an app. It works as a shortcut to the site, so you still need a connection to play.',
} as const;

/** The fixed notification the service worker shows (public/brand/hub/sw.js holds the same words; a test keeps them equal). */
export const PUSH_NOTIFICATION = { title: 'Your packs are ready', body: 'Your stack is full. Open a pack on Bunnyverse.', url: '/kpopcards' } as const;
