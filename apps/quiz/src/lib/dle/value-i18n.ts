// Daily games of one series (CR-024): the words of the values that change in French. One small table, keyed by the value as the data stores it (024 and the file L15-A2-series-games.sql). Most values stay identical
// in the two languages (Saiyan, East Blue, Zoan, a saga's name): they are not in the table and are shown as they are. The names of characters are never translated, and neither are the names of
// Devil Fruits or of techniques. The French is for the owner to read with the rest of it (DLE_FR_REVIEWED in seo.ts stays false). Pure, no I/O.
import type { DleLocale } from './types';

/** An English value, as stored, to its French words. A crew, an organisation, a race, a planet, a series. */
export const VALUE_FR: Readonly<Record<string, string>> = {
  // One Piece: crews and organisations
  'Straw Hat Pirates': 'Équipage du Chapeau de paille',
  'Straw Hat Grand Fleet': 'Grande Flotte du Chapeau de paille',
  'Four Emperors': 'Quatre Empereurs',
  'Clan of D.': 'Clan des D.',
  Marines: 'Marine',
  'Seven Warlords of the Sea': 'Grands Corsaires',
  'Whitebeard Pirates': 'Pirates de Barbe Blanche',
  'Red Hair Pirates': 'Pirates du Roux',
  'Heart Pirates': 'Pirates du Heart',
  'Kuja Pirates': 'Pirates Kuja',
  'Buggy Pirates': 'Pirates de Buggy',
  'Roger Pirates': 'Pirates de Roger',
  'Donquixote Pirates': 'Pirates de Donquixote',
  'Big Mom Pirates': 'Pirates de Big Mom',
  'Beasts Pirates': 'Pirates des Cent Bêtes',
  'Kid Pirates': 'Pirates de Kid',
  'Revolutionary Army': 'Armée révolutionnaire',
  'World Government': 'Gouvernement mondial',
  Underworld: 'Monde souterrain',
  'Arabasta Kingdom': 'Royaume d’Alabasta',
  'Charlotte Family': 'Famille Charlotte',
  'Shimotsuki Family': 'Famille Shimotsuki',
  // Dragon Ball: races, planets, organisations
  Human: 'Humain',
  Android: 'Androïde',
  God: 'Dieu',
  Namekian: 'Namekien',
  Demon: 'Démon',
  Angel: 'Ange',
  'Frieza Race': 'Race de Freezer',
  Earth: 'Terre',
  'Planet Vegeta': 'Planète Végéta',
  "Beerus' Planet": 'Planète de Beerus',
  'Demon Realm': 'Royaume des démons',
  'Red Ribbon Army': 'Armée du Ruban rouge',
  'Frieza Force': 'Armée de Freezer',
  'Galactic Patrol': 'Patrouille galactique',
  // Anime series, when a column shows one (Otakudle, all series)
  'Attack on Titan': 'L’Attaque des Titans',
  'The Apothecary Diaries': 'Les Carnets de l’apothicaire',
  'Detective Conan': 'Détective Conan',
};

/** The good or evil of a character at the start (Dragon Ball). */
export const ALIGNMENT: Readonly<Record<DleLocale, Readonly<Record<string, string>>>> = {
  en: { good: 'Good', evil: 'Evil' },
  fr: { good: 'Gentil', evil: 'Méchant' },
};

/** The three Hakis and "none" (One Piece). */
export const HAKI: Readonly<Record<DleLocale, Readonly<Record<string, string>>>> = {
  en: { observation: 'Observation', armament: 'Armament', conqueror: 'Conqueror', none: 'None' },
  fr: { observation: 'Observation', armament: 'Armement', conqueror: 'Rois', none: 'Aucun' },
};

/** The Devil Fruit type "none" is a value of the column; the others (Paramecia, Zoan, Logia) are the same in both languages. */
export const NO_FRUIT_TYPE: Readonly<Record<DleLocale, string>> = { en: 'None', fr: 'Aucun' };

export const GENDER: Readonly<Record<DleLocale, Readonly<Record<string, string>>>> = {
  en: { male: 'Male', female: 'Female' },
  fr: { male: 'Homme', female: 'Femme' },
};

/** What a stored label (the `l` of a value) says in French; a label that is not here is shown as it is. */
export const LABEL_FR: Readonly<Record<string, string>> = {
  'No bounty': 'Pas de prime',
};

/** What a hint says when the server's words are English (the Devil Fruit name hint of a character who has none). */
export const HINT_VALUE_FR: Readonly<Record<string, string>> = {
  'No Devil Fruit': 'Pas de fruit du démon',
};

const frOr = (s: string, locale: DleLocale): string => (locale === 'fr' ? VALUE_FR[s] ?? s : s);

/** A value of a column of a per-series game in a locale, or null when the column is not one of theirs (the caller then reads its own rules). */
export function seriesValueLabel(key: string, v: string | number, locale: DleLocale, label?: string): string | null {
  const s = String(v);
  switch (key) {
    case 'gender': return GENDER[locale][s] ?? s;
    case 'alignment_at_debut': return ALIGNMENT[locale][s] ?? s;
    case 'haki': return HAKI[locale][s] ?? s;
    case 'devil_fruit_type': return s === 'none' ? NO_FRUIT_TYPE[locale] : s;
    case 'bounty': {
      if (label) return locale === 'fr' ? LABEL_FR[label] ?? label : label;
      return typeof v === 'number' ? new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US').format(v) : s;
    }
    case 'height_cm': return `${new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US').format(Number(v))} cm`;
    case 'universe': return `${locale === 'fr' ? 'Univers' : 'Universe'} ${s}`;
    case 'debut_arc': case 'debut_series': return label ? frOr(label, locale) : s;
    // "Dragon Ball Z: Saiyan Saga" is "Saiyan Saga": the series is the neighbouring column, and a whole name does not fit in a cell.
    case 'debut_saga': return label ? label.replace(/^[^:]+:\s*/, '') : s;
    case 'affiliation': case 'race': case 'home_planet': case 'sea_of_origin': return frOr(s, locale);
    default: return null;
  }
}

/** The words of a hint the server serves (English), in a locale. */
export function hintValueLabel(value: unknown, locale: DleLocale): string {
  const s = String(value);
  return locale === 'fr' ? HINT_VALUE_FR[s] ?? s : s;
}
