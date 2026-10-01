// The five quiz-type glyphs of the prototype, in their own tiny module so the quiz
// card (which legacy client lists import even with the flag off) does not pull
// the whole icon set into flag-off bundles. icons.ts re-uses these entries.

export const TYPE_GLYPHS = {
  't-classic': ['0 0 24 24', '<circle cx="6" cy="7" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="6" cy="17" r="1.2"/><path d="M10 7h9M10 12h9M10 17h6"/>'],
  't-tf': ['0 0 24 24', '<rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="15.5" cy="12" r="2.6"/>'],
  't-clue': ['0 0 24 24', '<circle cx="10.5" cy="10.5" r="6"/><path d="m19.5 19.5-4.5-4.5M10.5 8v3M10.5 13.2v.3"/>'],
  't-image': ['0 0 24 24', '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 5-4.5 3 2.5 3-3.5 5 5"/>'],
  't-intruder': ['0 0 24 24', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><path d="m14.5 14.5 5 5M19.5 14.5l-5 5"/>'],
} as const satisfies Record<string, readonly [string, string]>;

export type TypeGlyphName = keyof typeof TYPE_GLYPHS;

/** quizzes.quiz_type -> glyph. */
export const QUIZ_TYPE_GLYPH: Record<string, TypeGlyphName> = {
  multiple_choice: 't-classic',
  true_false: 't-tf',
  guess_from_clues: 't-clue',
  image: 't-image',
  intruder: 't-intruder',
};
