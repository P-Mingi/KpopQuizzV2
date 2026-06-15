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
  discord: {
    /** Public invite (no expiry). */
    invite: 'https://discord.gg/X7AW95WFT',
    label: 'Kpop Quiz Discord',
    name: 'Discord',
    /** Server (guild) id for the widget.json endpoint. */
    guildId: '1514908800505872465',
  },
} as const;

export const REDDIT_URL = SOCIAL_LINKS.reddit.url;
export const REDDIT_LABEL = SOCIAL_LINKS.reddit.label;
export const REDDIT_SUBREDDIT = SOCIAL_LINKS.reddit.subreddit;

export const DISCORD_INVITE = SOCIAL_LINKS.discord.invite;
export const DISCORD_GUILD_ID = SOCIAL_LINKS.discord.guildId;

/**
 * Append `utm_source=discord` + a per-placement medium/campaign to the invite
 * so the K6 referral monitor can attribute traffic. Always returns a usable
 * URL; the placement param is optional but recommended.
 */
export function discordInviteWithUtm(placement = 'home'): string {
  const u = new URL(DISCORD_INVITE);
  u.searchParams.set('utm_source', 'discord');
  u.searchParams.set('utm_medium', 'site');
  u.searchParams.set('utm_campaign', placement);
  return u.toString();
}
