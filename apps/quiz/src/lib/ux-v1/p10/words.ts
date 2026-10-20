// Run O1, lane O1 (lot a, finishing): the words of the public passport that name the kind of site it belongs to. The default is
// today's kpop wording (every function that takes them falls back to it, so kpop renders what it rendered before); the page of
// another site passes its own, from the registry.

export interface PassportWords {
  /** The stat cell of the topics a fan mastered, lower case ("groups mastered"). */
  masteredStat: string;
  /** The section title of the same list ("Groups mastered"). */
  masteredTitle: string;
  /** The meta line when the fan has no main topic ("Stan since 2019"). */
  fanSince: string;
  /** The share text: "My <passport> on <brand>" ("K-pop passport", "KpopQuiz"). */
  passport: string;
  brand: string;
}

export const KPOP_PASSPORT_WORDS: PassportWords = {
  masteredStat: 'groups mastered',
  masteredTitle: 'Groups mastered',
  fanSince: 'Stan since',
  passport: 'K-pop passport',
  brand: 'KpopQuiz',
};
