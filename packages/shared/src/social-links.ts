/**
 * Centralized social/community links shared by both apps (quiz, blindtest).
 *
 * Update the URL/label here and every footer, results screen, and share
 * button across the monorepo will follow.
 */
export const SOCIAL_LINKS = {
  reddit: {
    url: 'https://www.reddit.com/r/Kpop_Verse/',
    label: 'r/Kpop_Verse',
    name: 'Reddit',
    /** Subreddit name only (no `r/` prefix). Used by Reddit submit URLs. */
    subreddit: 'Kpop_Verse',
  },
} as const;

export const REDDIT_URL = SOCIAL_LINKS.reddit.url;
export const REDDIT_LABEL = SOCIAL_LINKS.reddit.label;
export const REDDIT_SUBREDDIT = SOCIAL_LINKS.reddit.subreddit;
