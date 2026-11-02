// Daily games step 4: every word of the Terrier and of the game pages, in the two languages (v2 section 4). The French is for the owner to read (rule 10: DLE_FR_REVIEWED in
// seo.ts stays false until then). Names of idols, groups and songs are never translated; values of the columns are, through valueLabel. No number is typed here:
// every count arrives as an argument, from the functions of Postgres.
import type { DleProgress } from './local';
import type { DleLocale } from './types';

export interface DleCopy {
  readonly skip: string;
  readonly navMain: string; readonly navHome: string; readonly navBurrow: string; readonly navQuizzes: string; readonly navBlind: string; readonly navCommunity: string;
  readonly left: string;
  readonly langLabel: string; readonly signIn: string; readonly signInTitle: string; readonly signInSub: string; readonly passport: string;
  readonly help: string; readonly stats: string; readonly settings: string; readonly close: string;
  readonly streakDays: (n: number) => string; readonly streakSr: string;
  readonly footTag: string; readonly footAbout: string; readonly footPrivacy: string; readonly footLegal: string; readonly footCredits: string;
  // the Terrier
  readonly burrowH1: string; readonly burrowLead: string; readonly nextPuzzles: string; readonly gamesLabel: string; readonly day: string; readonly yesterday: string;
  readonly of: (done: number, total: number) => string;
  readonly play: string; readonly continueTo: (mode: string) => string; readonly seeResults: string; readonly soon: string; readonly toPlay: string;
  readonly foundIn: (n: number) => string; readonly gaveUp: string; readonly inProgress: (n: number) => string;
  readonly fansFound: (n: string) => string; readonly allFound: string; readonly modesDone: (done: number, total: number, next: string) => string;
  readonly gameNo: (kind: string, n: number) => string; readonly burrowStreak: (label: string, n: number) => string; readonly kpopLabel: string; readonly animeLabel: string;
  readonly show: string; readonly hiddenAnswer: string; readonly quizOf: (group: string) => string;
  readonly aboutTitle: string; readonly about1: string; readonly about2: string;
  // the game
  readonly breadcrumb: string; readonly stepsLabel: string; readonly stepNow: string; readonly stepDone: string;
  readonly nextIn: string; readonly fansLine: (n: string) => string; readonly hintsTitle: string; readonly hintsAfter: (list: string) => string; readonly hintIn: (n: number) => string; readonly seeHint: string; readonly hintNone: string; readonly hintClosed: string;
  readonly proposeLabel: string; readonly guessLabel: string; readonly placeholder: string; readonly validate: string; readonly suggestions: string; readonly enterKey: string; readonly enterHelp: string; readonly giveUp: string;
  readonly close4: (n: number, of: number) => string; readonly close6: (n: number, of: number) => string;
  readonly tries: string; readonly legend: string; readonly right: string; readonly near: string; readonly wrong: string; readonly unknownCell: string; readonly arrowHelp: string; readonly tableCaption: string; readonly rowHead: string;
  readonly empty: string; readonly announceGuess: (n: number, name: string) => string; readonly announceWon: (name: string, n: number) => string;
  readonly answerUp: string; readonly answerDown: string;
  readonly found: string; readonly answerWas: string; readonly wonLine: (n: number, rank: string | null) => string; readonly gaveUpLine: (n: number, label: string) => string;
  readonly streakChip: (label: string, n: number) => string; readonly bars: string; readonly shareTitle: string; readonly copy: string; readonly copied: string; readonly share: string;
  readonly whatNow: string; readonly backToBurrow: string; readonly onKpopQuiz: string; readonly photoBy: (author: string, license: string) => string; readonly source: string; readonly noPhoto: string;
  readonly yesterdayLine: string; readonly howTitle: string; readonly how1: string; readonly how2: string; readonly thCell: string; readonly thNear: string; readonly thSource: string;
  readonly unavailable: string; readonly errorRate: string; readonly errorNetwork: string; readonly errorUnknown: string; readonly errorNewDay: string; readonly errorTooMany: string;
  readonly poolTitle: string; readonly poolHead: readonly [string, string];
  // the dialogs
  readonly dlgHow: string; readonly dlgHow1: string; readonly dlgHow2: string; readonly dlgHow3: string; readonly dlgRight: string; readonly dlgNear: string; readonly dlgWrong: string; readonly dlgArrow: string; readonly dlgUnknown: string; readonly dlgFoot: string;
  readonly dlgStats: string; readonly sPlays: string; readonly sWins: string; readonly sAvg: string; readonly sFirst: string; readonly sStreak: string; readonly sBest: string; readonly sHist: string; readonly sHistAria: (list: string) => string; readonly sHistItem: (wins: number, guesses: number) => string; readonly sShare: string; readonly sNote: string; readonly sNone: string; readonly sShareText: (brand: string, game: string, wins: number, plays: number, best: number, url: string) => string;
  readonly dlgSettings: string; readonly gameLang: string; readonly auto: string; readonly autoHelp: string; readonly french: string; readonly frenchHelp: string; readonly english: string; readonly englishHelp: string;
  readonly display: string; readonly colorblind: string; readonly colorblindHelp: string; readonly reduced: string; readonly reducedHelp: string;
  readonly transfer: string; readonly transferHelp: string; readonly transferCopy: string; readonly transferApply: string; readonly transferDone: string; readonly transferBad: string; readonly erase: string; readonly eraseDone: string;
}

const num = (n: number, locale: DleLocale): string => new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US').format(n);
export const formatCount = num;

const EN: DleCopy = {
  skip: 'Skip to content',
  navMain: 'Main', navHome: 'Home', navBurrow: 'The Burrow', navQuizzes: 'Quizzes', navBlind: 'Blind test', navCommunity: 'Community',
  left: 'left today',
  langLabel: 'Language', signIn: 'Sign in', signInTitle: 'Sign in to Bunnyverse', signInSub: 'Keep your plays on every device.', passport: 'My passport',
  help: 'How to play', stats: 'Statistics', settings: 'Settings and language', close: 'Close',
  streakDays: (n) => `${n} ${n === 1 ? 'day' : 'days'}`, streakSr: 'K-pop streak',
  footTag: 'Quizzes and daily games for K-pop and anime fans.', footAbout: 'About', footPrivacy: 'Privacy', footLegal: 'Legal notice', footCredits: 'Photo credits',
  burrowH1: 'The Burrow', burrowLead: 'Two games, one puzzle each, the same for everyone.', nextPuzzles: 'New puzzles in', gamesLabel: 'Today’s games', day: 'Your day', yesterday: 'Yesterday’s answers',
  of: (d, t) => `${d} of ${t}`,
  play: 'Play', continueTo: (m) => `Continue: ${m.toLowerCase()}`, seeResults: 'See my results', soon: 'soon', toPlay: 'to play',
  foundIn: (n) => `found in ${n}`, gaveUp: 'gave up', inProgress: (n) => `in progress · ${n}`,
  fansFound: (n) => `${n} fans found it today`, allFound: 'all found', modesDone: (d, t, next) => `${d} of ${t} · ${next}`,
  gameNo: (k, n) => `${k} no. ${n}`, burrowStreak: (l, n) => `${l}: ${n} ${n === 1 ? 'day' : 'days'}`, kpopLabel: 'K-pop', animeLabel: 'Anime',
  show: 'Show', hiddenAnswer: 'Hidden, no spoilers', quizOf: (g) => `${g} quiz`,
  aboutTitle: 'What is the Burrow?',
  about1: 'The Burrow gathers the Bunnyverse daily games. Kpopdle: guess today’s K-pop idol, then the group, the song and the hidden members. Otakudle: guess today’s anime character, across all series or one series, spoiler-free.',
  about2: 'Unlimited guesses, a new puzzle at midnight UTC.',
  breadcrumb: 'Breadcrumb', stepsLabel: 'The Kpopdle games, in order', stepNow: 'playing', stepDone: 'found',
  nextIn: 'next idol in', fansLine: (n) => `${n} fans found it`, hintsTitle: 'Hints', hintsAfter: (l) => `after ${l} mistakes`, hintIn: (n) => (n === 1 ? 'in 1 guess' : `in ${n} guesses`), seeHint: 'See the hint', hintNone: 'None for today', hintClosed: 'Not opened',
  proposeLabel: 'Propose an idol', guessLabel: 'Your guess', placeholder: 'Your guess: stage name, Korean name or group', validate: 'Guess', suggestions: 'Suggestions', enterKey: 'Enter', enterHelp: 'Enter picks the first suggestion', giveUp: 'Give up',
  close4: (n, o) => `Well spotted: ${n} right cells out of ${o}`, close6: (n, o) => `So close: ${n} right cells out of ${o}`,
  tries: 'Your guesses', legend: 'Legend', right: 'Right', near: 'Close', wrong: 'Wrong', unknownCell: 'Not comparable', arrowHelp: 'The answer is more recent', tableCaption: 'Each guess compared with the idol of the day', rowHead: 'Idol',
  empty: 'Propose a first idol to see the cells fill up.', announceGuess: (n, name) => `Guess ${n}: ${name}.`, announceWon: (name, n) => `Found: ${name}, in ${n} ${n === 1 ? 'guess' : 'guesses'}.`,
  answerUp: 'the answer is higher', answerDown: 'the answer is lower',
  found: 'Found!', answerWas: 'The answer was', wonLine: (n, r) => `In ${n} ${n === 1 ? 'guess' : 'guesses'}.${r ? ` ${r} fans found it today.` : ''}`, gaveUpLine: (n, l) => `You gave up after ${n} ${n === 1 ? 'guess' : 'guesses'}. Your ${l} streak still holds.`,
  streakChip: (l, n) => `${l} streak: ${n} ${n === 1 ? 'day' : 'days'}`, bars: 'Right cells on each guess', shareTitle: 'Your share, without the answer', copy: 'Copy', copied: 'Copied', share: 'Share',
  whatNow: 'What next', backToBurrow: 'Back to the Burrow', onKpopQuiz: 'On KpopQuiz', photoBy: (a, l) => `Photo: ${a}, ${l}`, source: 'Source', noPhoto: 'No licensed photo yet, so we show the initials.',
  yesterdayLine: 'Yesterday’s idol:', howTitle: 'How to play Kpopdle Idol?',
  how1: 'Type an idol’s name and confirm. Each cell compares one clue with the idol of the day: full when right, striped when close, grey when wrong. An arrow says whether the answer’s year is more recent or older. Hints open after 5 and 10 mistakes.',
  how2: 'Only adult idols of major groups are in the game. Every photo is licensed and credited; without a licence, we show the initials.',
  thCell: 'Cell', thNear: 'Close if', thSource: 'Source',
  unavailable: 'Today’s game is not available right now. Come back in a moment.', errorRate: 'Too many guesses in a minute. Wait a little and try again.', errorNetwork: 'The connection failed. Try again.', errorUnknown: 'This name is not in the game.', errorNewDay: 'A new day has started. Reload the page for the new puzzle.', errorTooMany: 'That is the most guesses a day can hold.',
  poolTitle: 'The idols in the game', poolHead: ['Group', 'Idols'],
  dlgHow: 'How to play', dlgHow1: 'Type an idol and confirm. A row of cells appears.', dlgHow2: 'Each cell compares one clue with the idol of the day.', dlgHow3: 'Unlimited guesses. Hints open after 5 and 10 mistakes.',
  dlgRight: 'Right. The same value.', dlgNear: 'Close. A year or two off, or the same parent.', dlgWrong: 'Wrong. Nothing in common.', dlgArrow: 'Arrow. The answer is more recent.', dlgUnknown: 'Not comparable. The data is missing.',
  dlgFoot: 'A new idol every day at midnight UTC, the same for everyone. The data comes from Wikidata, MusicBrainz and official sites.',
  dlgStats: 'Your statistics', sPlays: 'Plays', sWins: 'Wins', sAvg: 'Average guesses', sFirst: 'First try', sStreak: 'Current streak', sBest: 'Best streak', sHist: 'Guesses per win',
  sHistAria: (l) => `Distribution: ${l}`, sHistItem: (w, g) => `${w} ${w === 1 ? 'win' : 'wins'} in ${g}`, sShare: 'Share my stats', sNote: 'Kept on this device. Transfer them from the settings.', sNone: 'No finished game on this device yet.',
  sShareText: (b, g, w, p, best, url) => `${b} · ${g}: ${w} wins in ${p} plays, best streak ${best}\n${url}`,
  dlgSettings: 'Settings', gameLang: 'Game language', auto: 'Automatic', autoHelp: 'Your browser’s language if it is French. Any other language: English.', french: 'Français', frenchHelp: 'Toujours en français', english: 'English', englishHelp: 'Always in English',
  display: 'Display', colorblind: 'Colour-blind mode', colorblindHelp: 'Blue for right, orange for close', reduced: 'Reduced motion', reducedHelp: 'Also follows your device’s setting',
  transfer: 'Transfer my data', transferHelp: 'Copy this text on this device, paste it on the other one.', transferCopy: 'Copy my data', transferApply: 'Add the pasted data', transferDone: 'Done.', transferBad: 'This text is not an export.', erase: 'Erase on this device', eraseDone: 'Erased.',
};

const FR: DleCopy = {
  skip: 'Aller au contenu',
  navMain: 'Principal', navHome: 'Accueil', navBurrow: 'Le Terrier', navQuizzes: 'Quiz', navBlind: 'Blind test', navCommunity: 'Communauté',
  left: 'à jouer aujourd’hui',
  langLabel: 'Langue', signIn: 'Se connecter', signInTitle: 'Connecte-toi à Bunnyverse', signInSub: 'Retrouve tes parties sur tous tes appareils.', passport: 'Mon passport',
  help: 'Comment jouer', stats: 'Statistiques', settings: 'Réglages et langue', close: 'Fermer',
  streakDays: (n) => `${n} ${n === 1 ? 'jour' : 'jours'}`, streakSr: 'de série K-pop',
  footTag: 'Des quiz et des jeux du jour pour les fans de K-pop et d’anime.', footAbout: 'À propos', footPrivacy: 'Confidentialité', footLegal: 'Mentions légales', footCredits: 'Crédits photos',
  burrowH1: 'Le Terrier', burrowLead: 'Deux jeux, une énigme chacun, la même pour tout le monde.', nextPuzzles: 'Nouvelles énigmes dans', gamesLabel: 'Les jeux du jour', day: 'Ta journée', yesterday: 'Les réponses d’hier',
  of: (d, t) => `${d} sur ${t}`,
  play: 'Jouer', continueTo: (m) => `Continuer : ${m.toLowerCase()}`, seeResults: 'Voir mes résultats', soon: 'bientôt', toPlay: 'à jouer',
  foundIn: (n) => `trouvé en ${n}`, gaveUp: 'abandon', inProgress: (n) => `en cours · ${n}`,
  fansFound: (n) => `${n} fans ont trouvé aujourd’hui`, allFound: 'tout trouvé', modesDone: (d, t, next) => `${d} sur ${t} · ${next}`,
  gameNo: (k, n) => `${k} n° ${n}`, burrowStreak: (l, n) => `${l} : ${n} ${n === 1 ? 'jour' : 'jours'}`, kpopLabel: 'K-pop', animeLabel: 'Anime',
  show: 'Afficher', hiddenAnswer: 'Masqué, sans spoiler', quizOf: (g) => `Quiz ${g}`,
  aboutTitle: 'C’est quoi, le Terrier ?',
  about1: 'Le Terrier réunit les jeux quotidiens de Bunnyverse. Kpopdle : devine l’idol K-pop du jour, puis le groupe, la chanson et les membres cachés. Otakudle : devine le personnage d’anime du jour, toutes séries ou une seule, sans spoiler.',
  about2: 'Essais illimités, nouvelle énigme à minuit UTC (1 h à Paris en hiver).',
  breadcrumb: 'Fil d’Ariane', stepsLabel: 'Les jeux Kpopdle, dans l’ordre', stepNow: 'en cours', stepDone: 'trouvée',
  nextIn: 'prochaine idol dans', fansLine: (n) => `${n} fans ont trouvé`, hintsTitle: 'Indices', hintsAfter: (l) => `après ${l} erreurs`, hintIn: (n) => (n === 1 ? 'dans 1 essai' : `dans ${n} essais`), seeHint: 'Voir l’indice', hintNone: 'Aucun aujourd’hui', hintClosed: 'Pas ouvert',
  proposeLabel: 'Proposer une idol', guessLabel: 'Ton essai', placeholder: 'Ton essai : nom de scène, nom coréen ou groupe', validate: 'Valider', suggestions: 'Suggestions', enterKey: 'Entrée', enterHelp: 'Entrée choisit la première suggestion', giveUp: 'Abandonner',
  close4: (n, o) => `Bien vu : ${n} cases justes sur ${o}`, close6: (n, o) => `Tout près : ${n} cases justes sur ${o}`,
  tries: 'Tes essais', legend: 'Légende', right: 'Juste', near: 'Proche', wrong: 'Faux', unknownCell: 'Non comparable', arrowHelp: 'La réponse est plus récente', tableCaption: 'Comparaison de chaque essai avec l’idol du jour', rowHead: 'Idol',
  empty: 'Propose une première idol pour voir les cases se remplir.', announceGuess: (n, name) => `Essai ${n} : ${name}.`, announceWon: (name, n) => `Trouvé : ${name}, en ${n} ${n === 1 ? 'essai' : 'essais'}.`,
  answerUp: 'la réponse est plus grande', answerDown: 'la réponse est plus petite',
  found: 'Trouvée !', answerWas: 'La réponse était', wonLine: (n, r) => `En ${n} ${n === 1 ? 'essai' : 'essais'}.${r ? ` ${r} fans ont trouvé aujourd’hui.` : ''}`, gaveUpLine: (n, l) => `Tu as abandonné après ${n} ${n === 1 ? 'essai' : 'essais'}. Ta série ${l} tient quand même.`,
  streakChip: (l, n) => `Série ${l} : ${n} ${n === 1 ? 'jour' : 'jours'}`, bars: 'Cases justes à chaque essai', shareTitle: 'Ton partage, sans la réponse', copy: 'Copier', copied: 'Copié', share: 'Partager',
  whatNow: 'Et maintenant', backToBurrow: 'Retour au Terrier', onKpopQuiz: 'Sur KpopQuiz', photoBy: (a, l) => `Photo : ${a}, ${l}`, source: 'Source', noPhoto: 'Pas encore de photo sous licence : on garde les initiales.',
  yesterdayLine: 'L’idol d’hier :', howTitle: 'Comment jouer à Kpopdle Idol ?',
  how1: 'Tape le nom d’une idol et valide. Chaque case compare un indice avec l’idol du jour : pleine si c’est juste, rayée si c’est proche, grise si c’est faux. Une flèche indique si l’année de la réponse est plus récente ou plus ancienne. Les indices s’ouvrent après 5 et 10 erreurs.',
  how2: 'Seules les idols adultes des groupes majeurs entrent dans le jeu. Les photos sont toutes sous licence et créditées ; sans licence, on affiche les initiales.',
  thCell: 'Case', thNear: 'Proche si', thSource: 'Source',
  unavailable: 'Le jeu du jour n’est pas disponible pour le moment. Reviens dans un instant.', errorRate: 'Trop d’essais en une minute. Attends un peu et réessaie.', errorNetwork: 'La connexion a échoué. Réessaie.', errorUnknown: 'Ce nom n’est pas dans le jeu.', errorNewDay: 'Un nouveau jour a commencé. Recharge la page pour la nouvelle énigme.', errorTooMany: 'C’est le maximum d’essais pour une journée.',
  poolTitle: 'Les idols du jeu', poolHead: ['Groupe', 'Idols'],
  dlgHow: 'Comment jouer', dlgHow1: 'Tape une idol et valide. Une ligne de cases apparaît.', dlgHow2: 'Chaque case compare un indice avec l’idol du jour.', dlgHow3: 'Essais illimités. Les indices s’ouvrent après 5 et 10 erreurs.',
  dlgRight: 'Juste. La même valeur.', dlgNear: 'Proche. Un an ou deux d’écart, ou la même maison mère.', dlgWrong: 'Faux. Rien en commun.', dlgArrow: 'Flèche. La réponse est plus récente.', dlgUnknown: 'Non comparable. La donnée est absente.',
  dlgFoot: 'Nouvelle idol chaque jour à minuit UTC, la même pour tout le monde. Les données viennent de Wikidata, MusicBrainz et des sites officiels.',
  dlgStats: 'Tes statistiques', sPlays: 'Parties', sWins: 'Victoires', sAvg: 'Essais en moyenne', sFirst: 'Du premier coup', sStreak: 'Série en cours', sBest: 'Meilleure série', sHist: 'Essais par victoire',
  sHistAria: (l) => `Répartition : ${l}`, sHistItem: (w, g) => `${w} ${w === 1 ? 'victoire' : 'victoires'} en ${g}`, sShare: 'Partager mes stats', sNote: 'Gardées sur cet appareil. Transfère-les depuis les réglages.', sNone: 'Aucune partie finie sur cet appareil pour l’instant.',
  sShareText: (b, g, w, p, best, url) => `${b} · ${g} : ${w} victoires en ${p} parties, meilleure série ${best}\n${url}`,
  dlgSettings: 'Réglages', gameLang: 'Langue du jeu', auto: 'Automatique', autoHelp: 'Langue du navigateur : français. Autre langue que français ou anglais : anglais.', french: 'Français', frenchHelp: 'Toujours en français', english: 'English', englishHelp: 'Always in English',
  display: 'Affichage', colorblind: 'Mode daltonien', colorblindHelp: 'Bleu pour juste, orange pour proche', reduced: 'Animations réduites', reducedHelp: 'Suit aussi le réglage de ton appareil',
  transfer: 'Transférer mes données', transferHelp: 'Copie ce texte sur cet appareil, colle-le sur l’autre.', transferCopy: 'Copier mes données', transferApply: 'Ajouter les données collées', transferDone: 'C’est fait.', transferBad: 'Ce texte n’est pas un export.', erase: 'Effacer sur cet appareil', eraseDone: 'Effacé.',
};

export const dleCopy = (locale: DleLocale): DleCopy => (locale === 'fr' ? FR : EN);

/** The header of each column of a game, its help and its row in the how-to table. */
export interface DleColumnCopy { readonly label: string; readonly help: string; readonly near?: string; readonly source?: string }

export const IDOL_COLUMNS: Readonly<Record<DleLocale, Readonly<Record<string, DleColumnCopy>>>> = {
  en: {
    gender: { label: 'Gender', help: 'Woman or man' },
    group: { label: 'Group', help: 'Main group' },
    agency: { label: 'Agency', help: 'Close if same parent company', near: 'same parent company', source: 'Wikidata, official site' },
    nationality: { label: 'Nationality', help: 'Country of nationality' },
    birth: { label: 'Birth', help: 'Year, close within 2 years', near: '2 years apart at most', source: 'Wikidata' },
    debut: { label: 'Debut', help: 'Debut year, close within 1 year', near: '1 year apart at most', source: 'MusicBrainz, Wikipedia' },
    generation: { label: 'Generation', help: 'From the group’s debut year', near: 'never, arrow only', source: 'published rule on the debut year' },
    role: { label: 'Role', help: 'Official leader or maknae', near: 'official leader or maknae', source: 'official site, Wikipedia' },
  },
  fr: {
    gender: { label: 'Genre', help: 'Femme ou homme' },
    group: { label: 'Groupe', help: 'Groupe principal' },
    agency: { label: 'Agence', help: 'Proche si même maison mère', near: 'même maison mère', source: 'Wikidata, site officiel' },
    nationality: { label: 'Nationalité', help: 'Pays de nationalité' },
    birth: { label: 'Naissance', help: 'Année, proche à 2 ans', near: '2 ans d’écart au plus', source: 'Wikidata' },
    debut: { label: 'Début', help: 'Année de début, proche à 1 an', near: '1 an d’écart au plus', source: 'MusicBrainz, Wikipedia' },
    generation: { label: 'Génération', help: 'Selon l’année de début du groupe', near: 'jamais, flèche seulement', source: 'règle publiée sur l’année de début' },
    role: { label: 'Rôle', help: 'Leader ou maknae officiels', near: 'leader ou maknae officiels', source: 'site officiel, Wikipedia' },
  },
};

export const HINT_LABELS: Readonly<Record<DleLocale, Readonly<Record<string, string>>>> = {
  en: { fandom: 'The group’s fandom', initial: 'First letter of the stage name' },
  fr: { fandom: 'Fandom du groupe', initial: 'Initiale du nom de scène' },
};

const COUNTRY_FR: Readonly<Record<string, string>> = {
  'south korea': 'Corée du Sud', korea: 'Corée du Sud', japan: 'Japon', china: 'Chine', taiwan: 'Taïwan', thailand: 'Thaïlande', australia: 'Australie',
  'united states': 'États-Unis', usa: 'États-Unis', canada: 'Canada', 'new zealand': 'Nouvelle-Zélande', vietnam: 'Vietnam', indonesia: 'Indonésie', germany: 'Allemagne', brazil: 'Brésil',
  'hong kong': 'Hong Kong', philippines: 'Philippines', france: 'France', 'united kingdom': 'Royaume-Uni', malaysia: 'Malaisie', singapore: 'Singapour', macau: 'Macao',
};

const ROLE_FR: Readonly<Record<string, string>> = { main: 'Principal', supporting: 'Secondaire', antagonist: 'Antagoniste', other: 'Autre' };
const SPECIES_FR: Readonly<Record<string, string>> = {
  human: 'Humain', demon: 'Démon', curse: 'Fléau', panda: 'Panda', saiyan: 'Saiyan', pig: 'Cochon', creature: 'Créature', shinigami: 'Shinigami', quincy: 'Quincy',
  'mod-soul': 'Âme modifiée', hybrid: 'Hybride', devil: 'Diable', fiend: 'Fiend', elf: 'Elfe', dwarf: 'Nain',
};
const DEMOGRAPHIC: Readonly<Record<string, string>> = { shonen: 'Shōnen', shojo: 'Shōjo', seinen: 'Seinen', josei: 'Josei', kodomo: 'Kodomo' };

/** The words of one value of a column in a locale; names stay as they are. "" when the value is missing. */
export function valueLabel(key: string, v: unknown, locale: DleLocale): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map((x) => valueLabel(key, x, locale)).filter(Boolean).join(', ');
  const s = String(v);
  if (key === 'gender') return s === 'female' ? (locale === 'fr' ? 'Femme' : 'Woman') : s === 'male' ? (locale === 'fr' ? 'Homme' : 'Man') : s;
  if (key === 'role') {
    if (s === 'none') return locale === 'fr' ? 'Aucun' : 'None';
    if (locale === 'fr' && ROLE_FR[s]) return ROLE_FR[s]!;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (key === 'generation') {
    if (locale === 'fr') return `${s}e`;
    const n = Number(s);
    return `${s}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
  }
  if (key === 'nationality' && locale === 'fr') return COUNTRY_FR[s.toLowerCase()] ?? s;
  if (key === 'species') return (locale === 'fr' ? SPECIES_FR[s] : undefined) ?? (s.charAt(0).toUpperCase() + s.slice(1)).replace(/-/g, ' ');
  if (key === 'demographic') return s === 'none' ? (locale === 'fr' ? 'Aucune' : 'None') : DEMOGRAPHIC[s] ?? s;
  return s;
}

/** The words of one game: what changes from one game to the next (the next game adds its entry here, nothing else in the components). */
export interface DleGameCopy {
  readonly h1: string;
  readonly marquee: (no: number) => readonly string[];
  /** The column that says where an entity comes from, under its name in a row. */
  readonly subKey: string;
  readonly columns: Readonly<Record<string, DleColumnCopy>>;
  readonly hints: Readonly<Record<string, string>>;
  readonly proposeLabel: string; readonly placeholder: string; readonly rowHead: string; readonly tableCaption: string; readonly empty: string; readonly nextIn: string;
  readonly stepsLabel: string; readonly stepDone: string; readonly yesterdayLine: string; readonly howTitle: string; readonly how1: string; readonly how2: string;
  readonly poolTitle: string; readonly poolHead: readonly [string, string];
  readonly dlgHow1: string; readonly dlgHow2: string; readonly dlgHow3: string; readonly dlgFoot: string;
  /** The column on the second line of a suggestion, after subKey. */
  readonly suggestSecond: string;
  /** The language of a native name in a suggestion; null: it is not shown. */
  readonly nativeLang: 'ko' | null;
  /** The name before the number of the day; default: the brand and the step. */
  readonly noLabel?: string;
  /** "How far are you?", for a game with spoilers. */
  readonly progress?: {
    readonly question: string; readonly legend: string;
    readonly options: readonly { readonly id: DleProgress; readonly label: string; readonly help: string }[];
  };
  readonly noPhoto?: string; readonly found?: string; readonly dlgNear?: string; readonly dlgSamples?: readonly [string, string, string]; readonly streakSr?: string;
  /** Yesterday's answer stays closed behind this, for a game with spoilers. The name is in the HTML of the fold. */
  readonly yesterdayShow?: string;
}

const idolWords = (locale: DleLocale): DleGameCopy => {
  const t = dleCopy(locale);
  return {
    h1: locale === 'fr' ? 'Devine l’idol K-pop du jour' : 'Guess the K-pop idol of the day',
    marquee: (no) => (locale === 'fr'
      ? ['IDOL DU JOUR', '오늘의 아이돌', `KPOPDLE N° ${no}`, 'MÊME IDOL POUR TOUT LE MONDE', 'ESSAIS ILLIMITÉS', 'NOUVELLE IDOL À MINUIT UTC']
      : ['IDOL OF THE DAY', '오늘의 아이돌', `KPOPDLE NO. ${no}`, 'THE SAME IDOL FOR EVERYONE', 'UNLIMITED GUESSES', 'NEW IDOL AT MIDNIGHT UTC']),
    subKey: 'group',
    columns: IDOL_COLUMNS[locale],
    hints: HINT_LABELS[locale],
    proposeLabel: t.proposeLabel, placeholder: t.placeholder, rowHead: t.rowHead, tableCaption: t.tableCaption, empty: t.empty, nextIn: t.nextIn,
    stepsLabel: t.stepsLabel, stepDone: t.stepDone, yesterdayLine: t.yesterdayLine, howTitle: t.howTitle, how1: t.how1, how2: t.how2,
    poolTitle: t.poolTitle, poolHead: t.poolHead,
    dlgHow1: t.dlgHow1, dlgHow2: t.dlgHow2, dlgHow3: t.dlgHow3, dlgFoot: t.dlgFoot,
    suggestSecond: 'agency', nativeLang: 'ko',
  };
};

export const OTAKUDLE_COLUMNS: Readonly<Record<DleLocale, Readonly<Record<string, DleColumnCopy>>>> = {
  en: {
    series: { label: 'Series', help: 'The series of the character', near: 'same franchise', source: 'Wikidata, Wikipedia' },
    gender: { label: 'Gender', help: 'As the series presents them first', near: 'never', source: 'Wikidata, Wikipedia' },
    species: { label: 'Species', help: 'As shown first, or the one everyone knows', near: 'never', source: 'Wikidata, Wikipedia' },
    role: { label: 'Role at the start', help: 'Main, supporting, antagonist or other, at the first appearance', near: 'never', source: 'Wikidata, Wikipedia' },
    demographic: { label: 'Demographic', help: 'The audience of the original work', near: 'never', source: 'Wikidata, Wikipedia' },
    year: { label: 'Debut year', help: 'Year of the work, close within 2 years', near: '2 years apart at most', source: 'Wikidata, Wikipedia' },
    studio: { label: 'Studio', help: 'Studio of the first adaptation, close if one in common', near: 'one studio in common', source: 'Wikidata, Wikipedia' },
  },
  fr: {
    series: { label: 'Série', help: 'La série du personnage', near: 'même franchise', source: 'Wikidata, Wikipedia' },
    gender: { label: 'Genre', help: 'Tel que la série le présente d’abord', near: 'jamais', source: 'Wikidata, Wikipedia' },
    species: { label: 'Espèce', help: 'Celle montrée d’abord, ou celle que tout le monde connaît', near: 'jamais', source: 'Wikidata, Wikipedia' },
    role: { label: 'Rôle au début', help: 'Principal, secondaire, antagoniste ou autre, à la première apparition', near: 'jamais', source: 'Wikidata, Wikipedia' },
    demographic: { label: 'Démographie', help: 'Le public de l’œuvre d’origine', near: 'jamais', source: 'Wikidata, Wikipedia' },
    year: { label: 'Année de début', help: 'Année de l’œuvre, proche à 2 ans', near: '2 ans d’écart au plus', source: 'Wikidata, Wikipedia' },
    studio: { label: 'Studio', help: 'Studio de la première adaptation, proche si un en commun', near: 'un studio en commun', source: 'Wikidata, Wikipedia' },
  },
};

const OTAKUDLE_HINTS: Readonly<Record<DleLocale, Readonly<Record<string, string>>>> = {
  en: { voice_actor_ja: 'Japanese voice actor', initial: 'First letter of the name' },
  fr: { voice_actor_ja: 'Doubleur japonais', initial: 'Initiale du nom' },
};

const otakudleWords = (locale: DleLocale): DleGameCopy => {
  const base = { subKey: 'series', columns: OTAKUDLE_COLUMNS[locale], hints: OTAKUDLE_HINTS[locale], suggestSecond: 'studio', nativeLang: null, noLabel: 'Otakudle' };
  if (locale === 'fr') {
    return {
      ...base,
      h1: 'Devine le personnage d’anime du jour',
      marquee: (no) => ['PERSONNAGE DU JOUR', '今日のキャラクター', `OTAKUDLE N° ${no}`, 'MÊME PERSONNAGE POUR TOUT LE MONDE', 'SANS SPOILER', 'NOUVEAU PERSONNAGE À MINUIT UTC'],
      proposeLabel: 'Proposer un personnage', placeholder: 'Nom, prénom ou surnom, toutes séries', rowHead: 'Personnage', tableCaption: 'Comparaison de chaque essai avec le personnage du jour',
      empty: 'Propose un premier personnage pour voir les cases se remplir.', nextIn: 'nouveau personnage dans',
      stepsLabel: 'Les jeux Otakudle', stepDone: 'trouvé', yesterdayLine: 'Le personnage d’hier :', howTitle: 'Comment jouer à Otakudle ?',
      how1: 'Otakudle est un jeu quotidien : propose un personnage, chaque case compare un indice avec la réponse du jour : la série, le genre, l’espèce, le rôle, la démographie, l’année de début et le studio. Pleine si c’est juste, rayée si c’est proche, grise si c’est faux. Les indices s’ouvrent après 5 et 10 erreurs.',
      how2: 'Les valeurs sont celles de la première apparition du personnage, sauf l’espèce de quelques personnages, donnée telle que tout le monde la connaît. Aucune colonne ne dit qui est vivant ou mort. Aucun visuel de personnage sans licence.',
      poolTitle: 'Les personnages du jeu', poolHead: ['Série', 'Personnages'],
      dlgHow1: 'Tape un personnage et valide. Une ligne de cases apparaît.', dlgHow2: 'Chaque case compare un indice avec le personnage du jour.', dlgHow3: 'Essais illimités. Les indices s’ouvrent après 5 et 10 erreurs.',
      dlgFoot: 'Nouveau personnage chaque jour à minuit UTC, le même pour tout le monde. Les données viennent de Wikidata et de Wikipedia.',
      progress: {
        question: 'Où en es-tu ?', legend: 'Où en es-tu ? Les personnages arrivés après ton avancée ne sortent ni comme réponse, ni dans la liste.',
        options: [
          { id: 'anime', label: 'Anime', help: 'Jusqu’au dernier épisode diffusé' },
          { id: 'manga', label: 'Manga', help: 'Jusqu’au dernier tome paru' },
          { id: 'beginner', label: 'Je débute', help: 'Seulement les personnages des premiers arcs' },
        ],
      },
      noPhoto: 'Pas d’image du personnage : les visuels d’anime appartiennent aux studios. On en affichera seulement avec une licence écrite.',
      found: 'Trouvé !', dlgNear: 'Proche. Deux ans d’écart au plus, un studio en commun, ou la même franchise.', dlgSamples: ['MAPPA', '2018', 'Bones'], streakSr: 'de série anime', yesterdayShow: 'Afficher, sans spoiler',
    };
  }
  return {
    ...base,
    h1: 'Guess the anime character of the day',
    marquee: (no) => ['CHARACTER OF THE DAY', '今日のキャラクター', `OTAKUDLE NO. ${no}`, 'THE SAME CHARACTER FOR EVERYONE', 'NO SPOILERS', 'NEW CHARACTER AT MIDNIGHT UTC'],
    proposeLabel: 'Propose a character', placeholder: 'Name or nickname, all series', rowHead: 'Character', tableCaption: 'Each guess compared with the character of the day',
    empty: 'Propose a first character to see the cells fill up.', nextIn: 'next character in',
    stepsLabel: 'The Otakudle games', stepDone: 'found', yesterdayLine: 'Yesterday’s character:', howTitle: 'How to play Otakudle?',
    how1: 'Otakudle is a daily game: propose a character, and each cell compares one clue with the answer of the day: series, gender, species, role, demographic, debut year and studio. Full when right, striped when close, grey when wrong. Hints open after 5 and 10 mistakes.',
    how2: 'The values are those of the character’s first appearance, except the species of a few characters, given as everyone knows it. No column says who is alive or dead. No character art without a licence.',
    poolTitle: 'The characters in the game', poolHead: ['Series', 'Characters'],
    dlgHow1: 'Type a character and confirm. A row of cells appears.', dlgHow2: 'Each cell compares one clue with the character of the day.', dlgHow3: 'Unlimited guesses. Hints open after 5 and 10 mistakes.',
    dlgFoot: 'A new character every day at midnight UTC, the same for everyone. The data comes from Wikidata and Wikipedia.',
    progress: {
      question: 'How far are you?', legend: 'How far are you? Characters who arrive after your progress never come up as the answer or in the list.',
      options: [
        { id: 'anime', label: 'Anime', help: 'Up to the latest episode aired' },
        { id: 'manga', label: 'Manga', help: 'Up to the latest volume out' },
        { id: 'beginner', label: 'Just starting', help: 'Only the characters of the first arcs' },
      ],
    },
    noPhoto: 'No picture of the character: anime art belongs to the studios. We will show some only with a written licence.',
    found: 'Found!', dlgNear: 'Close. Two years apart at most, one studio in common, or the same franchise.', dlgSamples: ['MAPPA', '2018', 'Bones'], streakSr: 'anime streak', yesterdayShow: 'Show, no spoilers',
  };
};

const GAME_WORDS: Readonly<Partial<Record<string, (locale: DleLocale) => DleGameCopy>>> = { 'kpopdle-idol': idolWords, otakudle: otakudleWords };

export function gameCopy(game: string, locale: DleLocale): DleGameCopy {
  const w = GAME_WORDS[game];
  if (!w) throw new Error(`no words for the game ${game}`);
  return w(locale);
}
