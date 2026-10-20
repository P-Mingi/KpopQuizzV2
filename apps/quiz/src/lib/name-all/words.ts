// Run O1, lane O1 (lot a, finishing): the words of the Name them all blocks that name the kind of topic and its things, and the
// site they print. The default is today's kpop wording, so a component called without them renders what it rendered before; the
// anime page passes its own from the registry (the vocabulary, the brand name, the host).

export interface NameAllWords {
  /** One thing a topic holds, singular and plural ("member", "members"). */
  member: string;
  members: string;
  /** The topic itself ("group"). */
  topic: string;
  /** Brand name and host of the site, and its origin without a trailing slash. */
  brand: string;
  host: string;
  origin: string;
  /** What the answer box accepts, as the intro sentence of the about block and of the game say it. */
  acceptedAbout: string;
  acceptedIntro: string;
}

export const KPOP_NAME_ALL_WORDS: NameAllWords = {
  member: 'member',
  members: 'members',
  topic: 'group',
  brand: 'KpopQuiz',
  host: 'kpopquiz.org',
  origin: 'https://kpopquiz.org',
  acceptedAbout: 'Stage names, birth names and Hangul are all accepted',
  acceptedIntro: 'Stage names, real names and Hangul all count',
};
