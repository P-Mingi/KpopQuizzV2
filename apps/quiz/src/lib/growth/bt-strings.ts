// V12 blindtest landings (SYSTEM.md 4): the strings of the v11 day-mode game, per
// language. The game, the results and the challenge row take an optional `strings`
// prop; without it they use BT_STRINGS_EN, which is word for word what those
// components printed before the prop existed, so English output is unchanged.
//
// Scope: a free run started from a landing (the game bar, the orb, the question,
// the reveal, the results, the share text, the challenge row). The daily and the
// friend's challenge intro only run on /blindtest and stay English.
//
// Review status: the landing copy (lib/growth/bt-landing.ts) is the prototype's.
// The fr, es and id GAME strings below are not in the prototype: they were written
// for this file with the prototype's own vocabulary (extrait / manche / titre,
// fragmento / ronda, potongan lagu / ronde) and are listed in reports/G3.md for a
// native review before the flag goes on. Song titles and artist names are never
// translated.
//
// Client-safe: no import, plain data and pure functions.

export type BtLang = 'en' | 'fr' | 'es' | 'id';

export interface BtStrings {
  /** BCP 47 code, also the `lang` of the game root when it is not English. */
  lang: BtLang;
  /** Thousands separator of the language (1,860 / 1 860 / 1.860). */
  num: (n: number) => string;
  /** 1520 -> "1.5s" / "1,5 s". */
  secs: (ms: number) => string;

  // Game bar
  quit: string;
  progress: (song: number, total: number, right: number) => string;
  pts: string;
  replay: string;
  mute: string;

  // Orb and state line
  tap: string;
  secondsLeft: (s: number) => string;
  picking: string;
  songOf: (song: number, total: number) => string;
  listening: string;
  tapToPlay: string;
  loadingClip: string;

  // Question and answers
  artistRound: string;
  songRound: string;
  whoSings: string;
  whichSong: string;
  answers: string;
  yourPick: string;
  gettingReady: string;

  // Reveal
  correct: string;
  timeUp: string;
  missed: string;
  coverAlt: (title: string, artist: string) => string;
  songBy: (title: string, artist: string) => string;
  nextIn: (last: boolean, seconds: number) => string;
  seeResults: string;
  next: string;
  speed: (bonus: number) => string;
  /** Live region after each answer. */
  announce: (kind: 'correct' | 'timeout' | 'missed', points: number, song: { title: string; artist: string } | null) => string;

  // Results
  runTitle: (playlist: string) => string;
  resultHeading: (score: number, total: number, title: string) => string;
  scoreLabel: (score: number, total: number) => string;
  points: (formatted: string) => string;
  bestCombo: string;
  averageAnswer: string;
  fastestAnswer: string;
  playAgain: string;
  share: string;
  yourSongs: string;
  yourSongsSub: string;
  clipButton: (playing: boolean, title: string) => string;
  shareTitle: string;
  shareLine2: (points: string, combo: number) => string;
  shareText: (score: number, total: number) => string;
  challengeNote: string;

  // Challenge row
  challengeRow: string;
  copyLink: string;
  linkCopied: string;
  linkCopied48: string;
  linkReady48: string;
  copyFailed: string;
  linkFailed: string;

  // Start errors (use-run.ts reports them in English; see localizeRunError)
  errNotEnough: string;
  errNoSongs: string;
  errStart: string;
}

const enLabel = (score: number, total: number): string => {
  if (total > 0 && score >= total) return 'Perfect ear';
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.8) return 'Sharp listener';
  if (pct >= 0.6) return 'Solid fan';
  if (pct >= 0.4) return 'Getting there';
  return 'Keep listening';
};

/** Picks one of five labels with the thresholds of lib/ux-v1/p6/points.ts scoreLabel. */
const label5 = (l: readonly [string, string, string, string, string]) => (score: number, total: number): string => {
  if (total > 0 && score >= total) return l[0];
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.8) return l[1];
  if (pct >= 0.6) return l[2];
  if (pct >= 0.4) return l[3];
  return l[4];
};

// The space of French thousands is a narrow no-break space in Intl; a plain no-break
// space is used so the string is the same on every runtime.
const group = (n: number, sep: string): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

/** English: exactly the text game.tsx, results.tsx and challenge-link.tsx had inline. */
export const BT_STRINGS_EN: BtStrings = {
  lang: 'en',
  num: (n) => Math.round(n).toLocaleString('en-US'),
  secs: (ms) => `${(ms / 1000).toFixed(1)}s`,

  quit: 'Quit blindtest',
  progress: (song, total, right) => `Song ${song} of ${total}, ${right} right`,
  pts: 'pts',
  replay: 'Replay the clip',
  mute: 'Mute the clip',

  tap: 'Tap to play the clip',
  secondsLeft: (s) => `${s} seconds left`,
  picking: 'Picking your songs',
  songOf: (song, total) => `Song ${song} of ${total}`,
  listening: 'listening',
  tapToPlay: 'tap to play',
  loadingClip: 'loading clip',

  artistRound: 'Artist round',
  songRound: 'Song round',
  whoSings: 'Who sings this?',
  whichSong: 'Which song is this?',
  answers: 'Answers',
  yourPick: 'Your pick',
  gettingReady: 'Getting your songs ready',

  correct: 'Correct',
  timeUp: 'Time is up',
  missed: 'Missed',
  coverAlt: (title, artist) => `${title} by ${artist}, cover art`,
  songBy: (title, artist) => `${title} by ${artist}`,
  nextIn: (last, seconds) => `${last ? 'Results' : 'Next song'} in ${seconds} seconds`,
  seeResults: 'See results',
  next: 'Next',
  speed: (bonus) => `speed +${bonus}`,
  announce: (kind, points, song) => {
    const head = kind === 'correct' ? `Correct, plus ${points} points.` : kind === 'timeout' ? 'Time is up.' : 'Missed.';
    return song ? `${head} ${song.title} by ${song.artist}.` : head;
  },

  runTitle: (playlist) => `${playlist} blindtest`,
  resultHeading: (score, total, title) => `${score}/${total} on the ${title}`,
  scoreLabel: enLabel,
  points: (formatted) => `${formatted} points`,
  bestCombo: 'Best combo',
  averageAnswer: 'Average answer',
  fastestAnswer: 'Fastest answer',
  playAgain: 'Play again',
  share: 'Share',
  yourSongs: 'Your songs',
  yourSongsSub: 'Play any clip again',
  clipButton: (playing, title) => `${playing ? 'Stop' : 'Play'} the ${title} clip`,
  shareTitle: 'Share your blindtest',
  shareLine2: (points, combo) => `${points} points · best combo x${combo}`,
  shareText: (score, total) => `I scored ${score}/${total} on the kpopquiz.org K-pop Blind Test. Can you beat me?`,
  challengeNote: 'They play your exact songs · 48 hours',

  challengeRow: 'Challenge a friend with these exact songs',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  linkCopied48: 'Link copied. It works for 48 hours.',
  linkReady48: 'Your link is ready below. It works for 48 hours.',
  copyFailed: 'Copy failed. Long-press the link to copy it.',
  linkFailed: 'Could not create the link. Try again.',

  errNotEnough: 'Not enough songs for this pick. Try another.',
  errNoSongs: 'No songs found. Try another pick.',
  errStart: 'Could not start the game. Check your connection.',
};

export const BT_STRINGS_FR: BtStrings = {
  lang: 'fr',
  num: (n) => group(n, ' '),
  secs: (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`,

  quit: 'Quitter le blind test',
  progress: (song, total, right) => `Chanson ${song} sur ${total}, ${right} ${right > 1 ? 'bonnes réponses' : 'bonne réponse'}`,
  pts: 'pts',
  replay: 'Rejouer l’extrait',
  mute: 'Couper le son',

  tap: 'Touche pour lancer l’extrait',
  secondsLeft: (s) => `${s} ${s > 1 ? 'secondes restantes' : 'seconde restante'}`,
  picking: 'On choisit tes chansons',
  songOf: (song, total) => `Chanson ${song} sur ${total}`,
  listening: 'en écoute',
  tapToPlay: 'touche pour lancer',
  loadingClip: 'chargement de l’extrait',

  artistRound: 'Manche artiste',
  songRound: 'Manche titre',
  whoSings: 'Qui chante ?',
  whichSong: 'Quelle est cette chanson ?',
  answers: 'Réponses',
  yourPick: 'Ton choix',
  gettingReady: 'On prépare tes chansons',

  correct: 'Bonne réponse',
  timeUp: 'Temps écoulé',
  missed: 'Raté',
  coverAlt: (title, artist) => `${title} de ${artist}, pochette`,
  songBy: (title, artist) => `${title} de ${artist}`,
  nextIn: (last, seconds) => `${last ? 'Résultats' : 'Chanson suivante'} dans ${seconds} ${seconds === 1 ? 'seconde' : 'secondes'}`,
  seeResults: 'Voir les résultats',
  next: 'Suivant',
  speed: (bonus) => `vitesse +${bonus}`,
  announce: (kind, points, song) => {
    const head = kind === 'correct' ? `Bonne réponse, plus ${points} points.` : kind === 'timeout' ? 'Temps écoulé.' : 'Raté.';
    return song ? `${head} ${song.title} de ${song.artist}.` : head;
  },

  runTitle: (playlist) => `blind test ${playlist}`,
  resultHeading: (score, total, title) => `${score}/${total} au ${title}`,
  scoreLabel: label5(['Oreille parfaite', 'Oreille affûtée', 'Fan solide', 'Tu progresses', 'Continue d’écouter']),
  points: (formatted) => `${formatted} points`,
  bestCombo: 'Meilleur combo',
  averageAnswer: 'Temps de réponse moyen',
  fastestAnswer: 'Réponse la plus rapide',
  playAgain: 'Rejouer',
  share: 'Partager',
  yourSongs: 'Tes chansons',
  yourSongsSub: 'Réécoute n’importe quel extrait',
  clipButton: (playing, title) => `${playing ? 'Arrêter' : 'Écouter'} l’extrait de ${title}`,
  shareTitle: 'Partage ton blind test',
  shareLine2: (points, combo) => `${points} points · meilleur combo x${combo}`,
  shareText: (score, total) => `J’ai fait ${score}/${total} au blind test K-pop de kpopquiz.org. Tu fais mieux ?`,
  challengeNote: 'Tes amis jouent exactement tes chansons · 48 heures',

  challengeRow: 'Défie tes amis sur ces mêmes chansons',
  copyLink: 'Copier le lien',
  linkCopied: 'Lien copié',
  linkCopied48: 'Lien copié. Il est valable 48 heures.',
  linkReady48: 'Ton lien est prêt ci-dessous. Il est valable 48 heures.',
  copyFailed: 'La copie a échoué. Appuie longuement sur le lien pour le copier.',
  linkFailed: 'Impossible de créer le lien. Réessaie.',

  errNotEnough: 'Pas assez de chansons pour ce choix. Essaie une autre playlist.',
  errNoSongs: 'Aucune chanson trouvée. Essaie une autre playlist.',
  errStart: 'Impossible de lancer la partie. Vérifie ta connexion.',
};

export const BT_STRINGS_ES: BtStrings = {
  lang: 'es',
  num: (n) => group(n, '.'),
  secs: (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`,

  quit: 'Salir del juego',
  progress: (song, total, right) => `Canción ${song} de ${total}, ${right} ${right === 1 ? 'acierto' : 'aciertos'}`,
  pts: 'pts',
  replay: 'Repetir el fragmento',
  mute: 'Silenciar el fragmento',

  tap: 'Toca para escuchar el fragmento',
  secondsLeft: (s) => `${s === 1 ? 'Queda 1 segundo' : `Quedan ${s} segundos`}`,
  picking: 'Eligiendo tus canciones',
  songOf: (song, total) => `Canción ${song} de ${total}`,
  listening: 'escuchando',
  tapToPlay: 'toca para escuchar',
  loadingClip: 'cargando el fragmento',

  artistRound: 'Ronda de artista',
  songRound: 'Ronda de canción',
  whoSings: '¿Quién canta?',
  whichSong: '¿Qué canción es?',
  answers: 'Respuestas',
  yourPick: 'Tu respuesta',
  gettingReady: 'Preparando tus canciones',

  correct: 'Correcto',
  timeUp: 'Se acabó el tiempo',
  missed: 'Fallaste',
  coverAlt: (title, artist) => `${title} de ${artist}, portada`,
  songBy: (title, artist) => `${title} de ${artist}`,
  nextIn: (last, seconds) => `${last ? 'Resultados' : 'Siguiente canción'} en ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`,
  seeResults: 'Ver resultados',
  next: 'Siguiente',
  speed: (bonus) => `velocidad +${bonus}`,
  announce: (kind, points, song) => {
    const head = kind === 'correct' ? `Correcto, más ${points} puntos.` : kind === 'timeout' ? 'Se acabó el tiempo.' : 'Fallaste.';
    return song ? `${head} ${song.title} de ${song.artist}.` : head;
  },

  runTitle: (playlist) => `juego de ${playlist}`,
  resultHeading: (score, total, title) => `${score}/${total} en el ${title}`,
  scoreLabel: label5(['Oído perfecto', 'Oído fino', 'Fan de verdad', 'Vas mejorando', 'Sigue escuchando']),
  points: (formatted) => `${formatted} puntos`,
  bestCombo: 'Mejor combo',
  averageAnswer: 'Tiempo medio de respuesta',
  fastestAnswer: 'Respuesta más rápida',
  playAgain: 'Jugar otra vez',
  share: 'Compartir',
  yourSongs: 'Tus canciones',
  yourSongsSub: 'Vuelve a escuchar cualquier fragmento',
  clipButton: (playing, title) => `${playing ? 'Parar' : 'Escuchar'} el fragmento de ${title}`,
  shareTitle: 'Comparte tu resultado',
  shareLine2: (points, combo) => `${points} puntos · mejor combo x${combo}`,
  shareText: (score, total) => `Acerté ${score}/${total} adivinando canciones K-pop en kpopquiz.org. ¿Me superas?`,
  challengeNote: 'Tus amigos juegan tus mismas canciones · 48 horas',

  challengeRow: 'Reta a tus amigos con estas mismas canciones',
  copyLink: 'Copiar enlace',
  linkCopied: 'Enlace copiado',
  linkCopied48: 'Enlace copiado. Funciona durante 48 horas.',
  linkReady48: 'Tu enlace está listo abajo. Funciona durante 48 horas.',
  copyFailed: 'No se pudo copiar. Mantén pulsado el enlace para copiarlo.',
  linkFailed: 'No se pudo crear el enlace. Inténtalo de nuevo.',

  errNotEnough: 'No hay suficientes canciones para esta lista. Prueba otra.',
  errNoSongs: 'No se encontraron canciones. Prueba otra lista.',
  errStart: 'No se pudo empezar la partida. Revisa tu conexión.',
};

export const BT_STRINGS_ID: BtStrings = {
  lang: 'id',
  num: (n) => group(n, '.'),
  secs: (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} dtk`,

  quit: 'Keluar dari permainan',
  progress: (song, total, right) => `Lagu ${song} dari ${total}, ${right} benar`,
  pts: 'poin',
  replay: 'Putar ulang potongan lagu',
  mute: 'Matikan suara',

  tap: 'Ketuk untuk memutar lagu',
  secondsLeft: (s) => `${s} detik lagi`,
  picking: 'Memilih lagu untukmu',
  songOf: (song, total) => `Lagu ${song} dari ${total}`,
  listening: 'sedang diputar',
  tapToPlay: 'ketuk untuk memutar',
  loadingClip: 'memuat lagu',

  artistRound: 'Ronde penyanyi',
  songRound: 'Ronde judul lagu',
  whoSings: 'Siapa penyanyinya?',
  whichSong: 'Lagu apa ini?',
  answers: 'Pilihan jawaban',
  yourPick: 'Pilihanmu',
  gettingReady: 'Menyiapkan lagu-lagumu',

  correct: 'Benar',
  timeUp: 'Waktu habis',
  missed: 'Salah',
  coverAlt: (title, artist) => `Sampul ${title} oleh ${artist}`,
  songBy: (title, artist) => `${title} oleh ${artist}`,
  nextIn: (last, seconds) => `${last ? 'Hasil' : 'Lagu berikutnya'} dalam ${seconds} detik`,
  seeResults: 'Lihat hasil',
  next: 'Lanjut',
  speed: (bonus) => `kecepatan +${bonus}`,
  announce: (kind, points, song) => {
    const head = kind === 'correct' ? `Benar, tambah ${points} poin.` : kind === 'timeout' ? 'Waktu habis.' : 'Salah.';
    return song ? `${head} ${song.title} oleh ${song.artist}.` : head;
  },

  runTitle: (playlist) => `tebak lagu ${playlist}`,
  resultHeading: (score, total, title) => `${score}/${total} di ${title}`,
  scoreLabel: label5(['Telinga sempurna', 'Pendengar jeli', 'Fans sejati', 'Makin jago', 'Terus dengarkan']),
  points: (formatted) => `${formatted} poin`,
  bestCombo: 'Kombo terbaik',
  averageAnswer: 'Rata-rata waktu jawab',
  fastestAnswer: 'Jawaban tercepat',
  playAgain: 'Main lagi',
  share: 'Bagikan',
  yourSongs: 'Lagu-lagumu',
  yourSongsSub: 'Putar lagi potongan lagu mana pun',
  clipButton: (playing, title) => `${playing ? 'Hentikan' : 'Putar'} potongan lagu ${title}`,
  shareTitle: 'Bagikan skormu',
  shareLine2: (points, combo) => `${points} poin · kombo terbaik x${combo}`,
  shareText: (score, total) => `Skorku ${score}/${total} di tebak lagu K-pop kpopquiz.org. Bisa kalahkan aku?`,
  challengeNote: 'Temanmu memainkan lagu yang sama persis · 48 jam',

  challengeRow: 'Tantang temanmu dengan lagu yang sama persis',
  copyLink: 'Salin tautan',
  linkCopied: 'Tautan disalin',
  linkCopied48: 'Tautan disalin. Berlaku selama 48 jam.',
  linkReady48: 'Tautanmu siap di bawah. Berlaku selama 48 jam.',
  copyFailed: 'Gagal menyalin. Tekan lama tautannya untuk menyalin.',
  linkFailed: 'Tautan gagal dibuat. Coba lagi.',

  errNotEnough: 'Lagu untuk playlist ini belum cukup. Coba playlist lain.',
  errNoSongs: 'Lagu tidak ditemukan. Coba playlist lain.',
  errStart: 'Permainan gagal dimulai. Periksa koneksimu.',
};

export const BT_STRINGS: Readonly<Record<BtLang, BtStrings>> = {
  en: BT_STRINGS_EN,
  fr: BT_STRINGS_FR,
  es: BT_STRINGS_ES,
  id: BT_STRINGS_ID,
};

/**
 * use-run.ts reports a failed start with one of three English sentences. A landing
 * shows the same fact in its own language; an unknown message passes through.
 */
export function localizeRunError(error: string | null, s: BtStrings): string | null {
  if (!error || s.lang === 'en') return error;
  if (error === BT_STRINGS_EN.errNotEnough) return s.errNotEnough;
  if (error === BT_STRINGS_EN.errNoSongs) return s.errNoSongs;
  if (error === BT_STRINGS_EN.errStart) return s.errStart;
  return error;
}
