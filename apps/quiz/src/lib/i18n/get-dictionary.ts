import type { Locale } from './config';

import en from './dictionaries/en.json';
import pt from './dictionaries/pt.json';

export type Dictionary = typeof en;

const DICTIONARIES: Record<Locale, Dictionary> = { en, pt };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.en;
}
