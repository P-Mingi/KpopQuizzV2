// V-TRUST - the covenant, LOCKED word-for-word with the owner (2026-08-01) in
// docs/workstream-vtrust.md. This file is the single source of truth: the promise
// page renders from it, the integrity link-backs key off promise index, and the
// verbatim proof diffs it against the doc. DO NOT reword, rephrase, add to, or
// "improve" a single sentence. No em dashes. If the owner changes the covenant,
// the doc changes first and this follows, never the other way around.

export interface Covenant {
  title: string;
  standfirst: string;
  promises: string[]; // full text of each promise, in order (1-6)
  signature: string;
}

export const COVENANT: Covenant = {
  title: 'The KpopVerse promise',
  standfirst:
    'A short list of what we owe you, and what we will never do. We would rather say less and mean all of it.',
  promises: [
    'Your work is yours. When you write a page, an essay, a story about your group, it stays credited to you. You keep the rights to what you make. We are borrowing your words to show them well, not taking them.',
    'Your name stays on it. Every page remembers who built it. Curators and writers are named, not erased into an anonymous crowd. The fandom sees who did the work.',
    'You can take it with you. Your contributions are exportable. If you ever want your writing somewhere else, you can get it out. We are not holding your work hostage.',
    'If you leave, we will not turn on you. If a community decides to build its home elsewhere, we will not fight it, copy it, or bury it in search to punish it. We want you here because it is the best place to be, not because you are stuck.',
    'The facts stay honest. Every fact carries its source. We do not invent numbers, we do not fake activity, and we do not write about idols\' private lives. Real fans, real data, real credit.',
    'What we will never do. We will never sell your personal data. We will never turn your collections into a marketplace. We will never quietly rewrite these promises and hope you do not notice. If this list changes, we will say so, out loud.',
  ],
  signature: 'Signed, the people building KpopVerse.',
};

/** Split a promise into its opening sentence (the lead) and the remainder, for
 * the two-line editorial treatment. Purely presentational: lead + ' ' + rest
 * always reconstructs the verbatim promise, so nothing is added or dropped. */
export function splitPromise(text: string): { lead: string; rest: string } {
  const at = text.indexOf('. ');
  if (at === -1) return { lead: text, rest: '' };
  return { lead: text.slice(0, at + 1), rest: text.slice(at + 2) };
}
