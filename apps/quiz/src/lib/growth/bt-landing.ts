// V12 blindtest landings (SYSTEM.md 4): one page per language, the same game.
//
//   en  /guess-the-kpop-song           Guess the K-pop song
//   fr  /fr/blind-test-kpop            Blind test K-pop
//   es  /es/adivina-la-cancion-kpop    Adivina la canción K-pop
//   id  /id/tebak-lagu-kpop            Tebak lagu K-pop
//
// The copy is the prototype's (docs/design/growth-v12/prototype.html, view `btland`,
// tables LAND and LANGNAME), word for word. Two things differ from the prototype and
// both are the "real data only" rule: the prototype's sample numbers (4,120 songs,
// 79 group playlists, 1,204 fans) are replaced by the real counts, and a sentence
// that needs a number is left out when the number could not be read.
//
// The four pages form their own hreflang cluster (x-default = the English page).
// /blindtest keeps its own en / pt-BR pair and is not part of it. fr, es and id are
// NOT locales of lib/i18n/config.ts: only these landings exist in those languages.
//
// Client-safe: plain data and pure functions.

import { BT_STRINGS } from './bt-strings';

import type { BtLang } from './bt-strings';

export const SITE = 'https://kpopquiz.org';

export const LANDING_LANGS: readonly BtLang[] = ['en', 'fr', 'es', 'id'];

export const LANDING_PATH: Readonly<Record<BtLang, string>> = {
  en: '/guess-the-kpop-song',
  fr: '/fr/blind-test-kpop',
  es: '/es/adivina-la-cancion-kpop',
  id: '/id/tebak-lagu-kpop',
};

/** The language in its own words: the switch at the top, then the row at the bottom. */
export const LANG_SWITCH_NAME: Readonly<Record<BtLang, string>> = { en: 'English', fr: 'Français', es: 'Español', id: 'Indonesia' };
export const LANG_NAME: Readonly<Record<BtLang, string>> = { en: 'English', fr: 'Français', es: 'Español', id: 'Bahasa Indonesia' };

/** hreflang map of the cluster, as Next's `alternates.languages`. */
export function landingAlternates(): Record<string, string> {
  return { en: LANDING_PATH.en, fr: LANDING_PATH.fr, es: LANDING_PATH.es, id: LANDING_PATH.id, 'x-default': LANDING_PATH.en };
}

export interface LandingNumbers {
  /** Active songs in the pool, null when the read failed. */
  songs: number | null;
  /** Playable group playlists, null when the read failed. */
  groups: number | null;
  /** Distinct fans with a run today in bt_runs, null or 0 = not shown. */
  fansToday: number | null;
}

export interface LandingCopy {
  lang: BtLang;
  path: string;
  /** <title> (the root layout adds " | KpopQuiz"). */
  title: string;
  /** H1 in three parts: plain text, then the highlighted part around "K-pop". */
  h1: { pre: string; emPre: string; emPost: string };
  /** The H1 as one string (breadcrumb, JSON-LD, Open Graph). */
  h1Text: string;
  /** Lead: the promise, the two real counts, the terms. */
  leadIntro: string;
  leadNumbers: (songs: string, groups: string) => string;
  leadTail: string;
  eyebrow: (fans: string, n: number) => string;
  start: string;
  live: string;
  trust: readonly [string, string, string];
  playlistsHeading: string;
  allPlaylists: string;
  howHeading: string;
  steps: ReadonlyArray<{ title: string; body: string }>;
  faqHeading: string;
  faqFree: { q: string; a: string };
  faqSongsQ: string;
  faqSongsA: (songs: string, groups: string) => string;
  faqFriends: { q: string; a: string };
  /** "Also in" before the links to the other three pages. */
  other: string;
  /** "300 songs" on a theme cover. */
  songsCount: (n: string) => string;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const LANDING_COPY: Readonly<Record<BtLang, LandingCopy>> = {
  en: {
    lang: 'en',
    path: LANDING_PATH.en,
    title: 'Guess the K-pop song: free K-pop blind test',
    h1: { pre: 'Guess the ', emPre: '', emPost: ' song' },
    h1Text: 'Guess the K-pop song',
    leadIntro: 'Hear ten seconds, pick the song.',
    leadNumbers: (songs, groups) => `${songs} songs, ${groups} group playlists,`,
    leadTail: 'free and no account needed.',
    eyebrow: (fans, n) => `${fans} ${n === 1 ? 'fan' : 'fans'} playing today`,
    start: 'Start guessing',
    live: 'Play with friends',
    trust: ['Free, no account', 'Real song clips', 'Works on your phone'],
    playlistsHeading: 'Pick a playlist',
    allPlaylists: 'All playlists',
    howHeading: 'How it works',
    steps: [
      { title: 'Listen', body: 'A ten-second clip plays, usually the chorus.' },
      { title: 'Pick', body: 'Four choices. Name the song, or the artist on some rounds.' },
      { title: 'Score', body: 'Right and fast wins more points. Share your score or challenge a friend.' },
    ],
    faqHeading: 'Questions',
    faqFree: { q: 'Is it free?', a: 'Yes. Every playlist is free and you do not need an account.' },
    faqSongsQ: 'How many songs are there?',
    faqSongsA: (songs, groups) => `${songs} songs from the first generation of K-pop to the fifth, and ${groups} groups have their own playlist.`,
    faqFriends: { q: 'Can I play with friends?', a: 'Yes. Host a live game on a big screen and everyone answers on their phone.' },
    other: 'Also in',
    songsCount: (n) => `${n} songs`,
  },
  fr: {
    lang: 'fr',
    path: LANDING_PATH.fr,
    title: 'Blind test K-pop gratuit : devine la chanson',
    h1: { pre: 'Blind test ', emPre: '', emPost: '' },
    h1Text: 'Blind test K-pop',
    leadIntro: 'Écoute dix secondes, trouve la chanson.',
    leadNumbers: (songs, groups) => `${songs} chansons, ${groups} playlists de groupes,`,
    leadTail: 'gratuit et sans compte.',
    eyebrow: (fans, n) => `${fans} ${n === 1 ? 'fan joue' : 'fans jouent'} aujourd’hui`,
    start: 'Lancer le blind test',
    live: 'Jouer entre amis',
    trust: ['Gratuit, sans compte', 'Vrais extraits', 'Sur ton téléphone'],
    playlistsHeading: 'Choisis une playlist',
    allPlaylists: 'Toutes les playlists',
    howHeading: 'Comment ça marche',
    steps: [
      { title: 'Écoute', body: 'Un extrait de dix secondes, souvent le refrain.' },
      { title: 'Choisis', body: 'Quatre réponses. Trouve le titre, ou l’artiste selon les manches.' },
      { title: 'Marque des points', body: 'Plus tu réponds vite et juste, plus tu gagnes de points. Partage ton score ou défie tes amis.' },
    ],
    faqHeading: 'Questions fréquentes',
    faqFree: { q: 'C’est gratuit ?', a: 'Oui. Toutes les playlists sont gratuites et aucun compte n’est nécessaire.' },
    faqSongsQ: 'Combien de chansons ?',
    faqSongsA: (songs, groups) => `${songs} chansons, de la première à la cinquième génération de la K-pop, et ${groups} groupes ont leur propre playlist.`,
    faqFriends: { q: 'On peut jouer à plusieurs ?', a: 'Oui. Lance une partie en direct sur un grand écran, chacun répond depuis son téléphone.' },
    other: 'Aussi disponible en',
    songsCount: (n) => `${n} chansons`,
  },
  es: {
    lang: 'es',
    path: LANDING_PATH.es,
    title: 'Adivina la canción K-pop gratis',
    h1: { pre: 'Adivina la ', emPre: 'canción ', emPost: '' },
    h1Text: 'Adivina la canción K-pop',
    leadIntro: 'Escucha diez segundos y elige la canción.',
    leadNumbers: (songs, groups) => `${songs} canciones, ${groups} listas de grupos,`,
    leadTail: 'gratis y sin cuenta.',
    eyebrow: (fans, n) => `${fans} ${n === 1 ? 'fan' : 'fans'} jugando hoy`,
    start: 'Empezar a adivinar',
    live: 'Jugar con amigos',
    trust: ['Gratis, sin cuenta', 'Fragmentos reales', 'Funciona en tu móvil'],
    playlistsHeading: 'Elige una lista',
    allPlaylists: 'Todas las listas',
    howHeading: 'Cómo funciona',
    steps: [
      { title: 'Escucha', body: 'Suena un fragmento de diez segundos, casi siempre el estribillo.' },
      { title: 'Elige', body: 'Cuatro opciones. Adivina la canción, o el artista en algunas rondas.' },
      { title: 'Suma puntos', body: 'Acertar rápido da más puntos. Comparte tu resultado o reta a tus amigos.' },
    ],
    faqHeading: 'Preguntas frecuentes',
    faqFree: { q: '¿Es gratis?', a: 'Sí. Todas las listas son gratis y no necesitas cuenta.' },
    faqSongsQ: '¿Cuántas canciones hay?',
    faqSongsA: (songs, groups) => `${songs} canciones, de la primera a la quinta generación del K-pop, y ${groups} grupos tienen su propia lista.`,
    faqFriends: { q: '¿Puedo jugar con amigos?', a: 'Sí. Crea una partida en vivo en una pantalla grande y cada uno responde desde su móvil.' },
    other: 'También en',
    songsCount: (n) => `${n} canciones`,
  },
  id: {
    lang: 'id',
    path: LANDING_PATH.id,
    title: 'Tebak lagu K-pop gratis',
    h1: { pre: 'Tebak ', emPre: 'lagu ', emPost: '' },
    h1Text: 'Tebak lagu K-pop',
    leadIntro: 'Dengarkan sepuluh detik, lalu tebak lagunya.',
    leadNumbers: (songs, groups) => `${songs} lagu, ${groups} playlist grup,`,
    leadTail: 'gratis tanpa akun.',
    eyebrow: (fans) => `${fans} fans bermain hari ini`,
    start: 'Mulai menebak',
    live: 'Main bareng teman',
    trust: ['Gratis, tanpa akun', 'Potongan lagu asli', 'Bisa di HP'],
    playlistsHeading: 'Pilih playlist',
    allPlaylists: 'Semua playlist',
    howHeading: 'Cara bermain',
    steps: [
      { title: 'Dengarkan', body: 'Potongan lagu sepuluh detik diputar, biasanya bagian reff.' },
      { title: 'Pilih', body: 'Empat pilihan. Tebak judul lagu, atau penyanyinya di beberapa ronde.' },
      { title: 'Kumpulkan poin', body: 'Benar dan cepat dapat poin lebih banyak. Bagikan skormu atau tantang temanmu.' },
    ],
    faqHeading: 'Pertanyaan umum',
    faqFree: { q: 'Apakah gratis?', a: 'Ya. Semua playlist gratis dan tidak perlu akun.' },
    faqSongsQ: 'Ada berapa lagu?',
    faqSongsA: (songs, groups) => `${songs} lagu dari generasi pertama sampai kelima, dan ${groups} grup punya playlist sendiri.`,
    faqFriends: { q: 'Bisa main bareng teman?', a: 'Bisa. Buat permainan live di layar besar, lalu semua menjawab dari HP masing-masing.' },
    other: 'Juga tersedia dalam',
    songsCount: (n) => `${n} lagu`,
  },
};

const hasCounts = (n: LandingNumbers): n is LandingNumbers & { songs: number; groups: number } =>
  typeof n.songs === 'number' && n.songs > 0 && typeof n.groups === 'number' && n.groups > 0;

/** The lead under the H1. Without the two counts the middle part is left out. */
export function landingLead(copy: LandingCopy, n: LandingNumbers): string {
  const num = BT_STRINGS[copy.lang].num;
  if (!hasCounts(n)) return `${copy.leadIntro} ${cap(copy.leadTail)}`;
  return `${copy.leadIntro} ${copy.leadNumbers(num(n.songs), num(n.groups))} ${copy.leadTail}`;
}

/** The meta description: the promise, how a round works, the terms. No number, so it never goes stale. */
export function landingDescription(copy: LandingCopy): string {
  return `${copy.leadIntro} ${copy.steps[1]!.body} ${cap(copy.leadTail)}`;
}

/** The eyebrow, or null: only a real count above zero is shown. */
export function landingEyebrow(copy: LandingCopy, n: LandingNumbers): string | null {
  const fans = n.fansToday;
  if (typeof fans !== 'number' || !Number.isFinite(fans) || fans < 1) return null;
  return copy.eyebrow(BT_STRINGS[copy.lang].num(fans), Math.round(fans));
}

/** The FAQ as shown AND as FAQPage JSON-LD (one list, so the two cannot differ). */
export function landingFaq(copy: LandingCopy, n: LandingNumbers): Array<{ q: string; a: string }> {
  const num = BT_STRINGS[copy.lang].num;
  return [
    copy.faqFree,
    ...(hasCounts(n) ? [{ q: copy.faqSongsQ, a: copy.faqSongsA(num(n.songs), num(n.groups)) }] : []),
    copy.faqFriends,
  ];
}

export function landingFaqJsonLd(copy: LandingCopy, n: LandingNumbers): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: copy.lang,
    mainEntity: landingFaq(copy, n).map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** KpopQuiz > the page. The first name is the brand, the same in every language. */
export function landingBreadcrumbJsonLd(copy: LandingCopy): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'KpopQuiz', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: copy.h1Text, item: `${SITE}${copy.path}` },
    ],
  };
}
