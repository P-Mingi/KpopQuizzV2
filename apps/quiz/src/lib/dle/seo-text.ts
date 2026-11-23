// SEO-LAUNCH-1 lane D: the words of the question sections and the opening sentences of a game page (RAPPORT agent 2 section 3 and 4), in the two languages. Pure, no I/O. Every time
// comes from the calendar of the game (day.ts), never typed. The answer of the day is never here: only what the page says about the rules, the reset and who makes the game.
import { YESTERDAY_GRACE_HOURS } from './day';
import { dleGame } from './games';
import { gameLabel } from './seo';
import { MAILBOX } from '../site/registry';

import type { DleGameId } from './games';
import type { DleLocale } from './types';

/** `link`: the words the answer begins with that the page links (rule 8.1: "Bunnyverse" of "Who makes ...?" goes to /about). The text of `a` stays plain. */
export interface DleQuestion { readonly q: string; readonly a: string; readonly link?: { readonly text: string; readonly href: string } }

/** The page about the maker of the games. It exists in English only, so the French answer links to it too. */
export const ABOUT_HREF = '/about';

const hhmm = (): string => `${String(YESTERDAY_GRACE_HOURS).padStart(2, '0')}:00 UTC`;

/**
 * The paragraph that opens "How to play": the secondary queries of the cluster the page owns, in plain sentences (one URL per cluster, rule 1). "A Wordle-style game" is written once, on
 * the page of Kpopdle, and never in a title, an H1 or a meta description.
 */
export function gameIntro(game: DleGameId, locale: DleLocale): string {
  const g = dleGame(game);
  const fr = locale === 'fr';
  if (game === 'kpopdle-idol') {
    return fr
      ? 'Kpopdle est un jeu kpop quotidien pour deviner une idol K-pop : chaque jour, tu cherches l’idol du jour, la même pour tout le monde, avec des essais illimités. Une case compare un indice à la fois avec la réponse. Reviens le lendemain pour une nouvelle idol.'
      : 'Kpopdle is a daily kpop game and a K-pop idol guessing game: you guess the idol of the day, the same idol for everyone, with unlimited guesses. A Wordle-style game, it answers each guess with cells that compare one clue at a time. Come back the next day for a new idol.';
  }
  if (g.series) {
    const n = g.series.name;
    return fr
      ? `Otakudle ${n} est un jeu pour deviner un personnage de ${n} : chaque jour, tu cherches le personnage ${n} du jour, le même pour tout le monde, avec des essais illimités. Seuls des personnages de ${n} sont dans le jeu, et chaque case compare un indice à la fois avec la réponse.`
      : `Otakudle ${n} is a ${n} character guessing game: every day you guess the ${n} character of the day, the same character for everyone, with unlimited guesses. Only ${n} characters are in the game, and each guess answers with cells that compare one clue at a time.`;
  }
  return fr
    ? 'Otakudle est un jeu d’anime quotidien pour deviner un personnage : chaque jour, tu cherches le personnage d’anime du jour, le même pour tout le monde, avec des essais illimités. Chaque essai répond par des cases qui comparent un indice à la fois, et aucun indice ne spoile l’histoire.'
    : 'Otakudle is a daily anime game and an anime character guessing game: you guess the anime character of the day, the same character for everyone, with unlimited guesses. Each guess answers with cells that compare one clue at a time, and no clue spoils the story.';
}

/**
 * The three questions of a game page, each answered in its first sentence (rule 3.2). No FAQPage markup goes with them.
 * Pictures: the idol photos of Kpopdle are licensed and credited (lib/dle/idol-pictures.ts fails closed on a missing author or a licence that is not free). The anime character pictures
 * are not: since L38 (owner, 2026-11-23) they include official artwork that belongs to the studios, so the anime pages say whose they are and how to ask for a removal, never "licensed".
 */
export function gameQuestions(game: DleGameId, locale: DleLocale): readonly DleQuestion[] {
  const g = dleGame(game);
  const fr = locale === 'fr';
  const label = gameLabel(game);
  const kpop = g.universe === 'kpop';
  const sources = fr
    ? (kpop ? 'Les données viennent de Wikidata, de MusicBrainz et de sites officiels, et chaque photo est sous licence et créditée.'
      : g.series ? `Chaque colonne indique sa source dans le tableau de Comment jouer. Les images des personnages appartiennent à leurs ayants droit : pour en faire retirer une, écris à ${MAILBOX}.`
      : `Les données viennent de Wikidata et de Wikipedia. Les images des personnages appartiennent à leurs ayants droit : pour en faire retirer une, écris à ${MAILBOX}.`)
    : (kpop ? 'The data comes from Wikidata, MusicBrainz and official sites, and every photo is licensed and credited.'
      : g.series ? `Each column lists its source in the table under How to play. Character pictures belong to their rights holders. To have one removed, write to ${MAILBOX}.`
      : `The data comes from Wikidata and Wikipedia. Character pictures belong to their rights holders. To have one removed, write to ${MAILBOX}.`);
  const grace = hhmm();
  if (fr) {
    return [
      { q: `Quand ${label} se réinitialise-t-il ?`, a: `${label} se réinitialise à minuit UTC. ${kpop ? 'Une nouvelle idol s’ouvre' : 'Un nouveau personnage s’ouvre'} à ce moment pour tout le monde, et la page affiche le compte à rebours.` },
      { q: 'Peut-on jouer les jours passés ?', a: `Non. ${label} n’a pas d’archive : chaque jour a ${kpop ? 'une idol' : 'un personnage'}, et seul ${kpop ? 'celle' : 'celui'} du jour se joue. Une partie commencée avant minuit UTC peut encore se finir jusqu’à ${grace}. À partir de ${grace}, la page montre ${kpop ? 'l’idol' : 'le personnage'} d’hier${kpop ? '' : ', fermé par défaut pour ne rien spoiler'}.` },
      { q: `Qui fait ${label} ?`, a: `Bunnyverse fait ${label}. C’est un jeu de fans non officiel, sans lien avec ${kpop ? 'les artistes ni leurs agences' : 'les studios ni les éditeurs des séries'}. ${sources}`, link: { text: 'Bunnyverse', href: ABOUT_HREF } },
    ];
  }
  return [
    { q: `When does ${label} reset?`, a: `${label} resets at midnight UTC. A new ${kpop ? 'idol' : 'character'} opens at that moment for everyone, and the page counts down to it.` },
    { q: 'Can I play past days?', a: `No. ${label} has no archive: each day has one ${kpop ? 'idol' : 'character'}, and only the ${kpop ? 'idol' : 'character'} of the day can be played. A game you started before midnight UTC can still be finished until ${grace}. From ${grace}, the page shows yesterday’s ${kpop ? 'idol' : 'character'}${kpop ? '' : ', closed by default so it spoils nothing'}.` },
    { q: `Who makes ${label}?`, a: `Bunnyverse makes ${label}. It is an unofficial fan game, with no tie to ${kpop ? 'the artists or their agencies' : 'the studios or publishers of the series'}. ${sources}`, link: { text: 'Bunnyverse', href: ABOUT_HREF } },
  ];
}
