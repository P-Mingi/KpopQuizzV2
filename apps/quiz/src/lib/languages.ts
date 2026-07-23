// Q-B2: single source of truth for quiz languages. Used by the creation funnel
// picker, the quiz-card chip, and the /quizzes browse filter. Mirrors the CHECK
// set in migration 116_quiz_language.sql. Add a language here AND in that CHECK.

import type { Language } from '@/lib/db/types';

export interface LanguageMeta {
  code: Language;
  /** English name, shown in the picker. */
  label: string;
  /** Endonym, shown alongside the label so speakers recognise their own. */
  native: string;
  /** Short chip label on quiz cards / filter pills. */
  chip: string;
}

export const LANGUAGES: readonly LanguageMeta[] = [
  { code: 'en', label: 'English', native: 'English', chip: 'EN' },
  { code: 'ko', label: 'Korean', native: '한국어', chip: 'KO' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', chip: 'TR' },
  { code: 'pt', label: 'Portuguese', native: 'Português', chip: 'PT' },
  { code: 'es', label: 'Spanish', native: 'Español', chip: 'ES' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', chip: 'ID' },
  { code: 'ja', label: 'Japanese', native: '日本語', chip: 'JA' },
  { code: 'fr', label: 'French', native: 'Français', chip: 'FR' },
  { code: 'de', label: 'German', native: 'Deutsch', chip: 'DE' },
  { code: 'other', label: 'Other', native: 'Other', chip: 'Other' },
];

const BY_CODE = new Map<string, LanguageMeta>(LANGUAGES.map((l) => [l.code, l]));

export function isLanguage(code: string | null | undefined): code is Language {
  return !!code && BY_CODE.has(code);
}

/** Short chip label for a stored language code (falls back to the raw code). */
export function languageChip(code: string): string {
  return BY_CODE.get(code)?.chip ?? code.toUpperCase();
}

/** Full "Label (native)" display for a stored language code. */
export function languageLabel(code: string): string {
  const meta = BY_CODE.get(code);
  if (!meta) return code;
  return meta.label === meta.native ? meta.label : `${meta.label} (${meta.native})`;
}

/** Map a browser locale (navigator.language, e.g. "pt-BR") to a supported code,
 *  defaulting to 'en'. Client-only; safe to call under a typeof check. */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const primary = (navigator.language || 'en').toLowerCase().split('-')[0] ?? 'en';
  return isLanguage(primary) && primary !== 'other' ? primary : 'en';
}
