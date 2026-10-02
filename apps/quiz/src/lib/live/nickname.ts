// Nicknames of a live room. No account, so the name is the only thing a player
// types that everybody sees on the big screen. Pure: the word list is passed in
// (the server reads the site's moderation list, `verse_banned_terms`, the one
// lib/verse/moderation.ts checks comments against).

import { LIVE_NICK_MAX } from './constants';

export type NicknameError = 'empty' | 'too_long' | 'blocked';
export type NicknameCheck = { ok: true; value: string } | { ok: false; error: NicknameError };

/** Tidy what was typed: one line, single spaces, no markup characters, no control or invisible characters. */
export function cleanNickname(raw: unknown): string {
  return String(raw ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, '')
    .replace(/[<>&"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i' };

/** Lower case, accents dropped, look-alike digits and signs read as letters. */
function fold(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[0134578@$!]/g, (c) => LEET[c] ?? c);
}

/** Words of a folded string, separated by one space, padded with spaces. */
function words(s: string): string {
  return ` ${fold(s).replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

/** Letters and digits only, repeats of three or more squeezed to one. */
function squash(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '').replace(/(.)\1{2,}/g, '$1');
}

/**
 * True when `name` carries a term of the list. A name is short and public, so the
 * check is stricter than the comment one: besides the whole-word match, a term of
 * four letters or more also matches inside a word, through spacing, punctuation
 * and digits used as letters ("b.a.d", "b4d", "xXbadwordXx"). Shorter terms only
 * match as whole words, so a three letter term never blocks an ordinary name.
 */
export function hasBannedTerm(name: string, terms: readonly string[]): boolean {
  const asWords = words(name);
  const squashed = squash(name);
  for (const raw of terms) {
    const w = words(raw);
    if (w.trim() === '') continue;
    if (asWords.includes(w)) return true;
    const t = squash(raw);
    if (t.length >= 4 && squashed.includes(t)) return true;
  }
  return false;
}

/** The nickname a player may use, or why not. */
export function checkNickname(raw: unknown, terms: readonly string[] = []): NicknameCheck {
  const value = cleanNickname(raw);
  if (!value || !/[\p{L}\p{N}]/u.test(value)) return { ok: false, error: 'empty' };
  if ([...value].length > LIVE_NICK_MAX) return { ok: false, error: 'too_long' };
  if (hasBannedTerm(value, terms)) return { ok: false, error: 'blocked' };
  return { ok: true, value };
}

/**
 * Two players may type the same name (SYSTEM.md 5.5). The second one keeps it with
 * a number: "mingi", "mingi 2", "mingi 3". `taken` holds the names already in the
 * room; the comparison ignores case. The base is shortened so the result fits.
 */
export function uniqueNickname(value: string, taken: readonly string[]): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  if (!used.has(value.toLowerCase())) return value;
  for (let n = 2; n < 1000; n++) {
    const suffix = ` ${n}`;
    const base = [...value].slice(0, LIVE_NICK_MAX - suffix.length).join('').trimEnd();
    const candidate = `${base}${suffix}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return value;
}

/** The letter an avatar shows. */
export function nicknameInitial(name: string): string {
  const first = [...name.trim()][0] ?? '?';
  return first.toUpperCase();
}
