// Run O1, lane O1 (lot a, finishing): the words of the Name them all blocks that name the kind of topic and its things, and the
// site they print. Type only: the kpop wording stays written in the components (game.tsx, about.tsx), which
// take these from their server parent as plain props and import nothing new at run time; the anime page passes its own from the registry.

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
