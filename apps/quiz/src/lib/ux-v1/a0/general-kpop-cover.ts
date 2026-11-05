// The picture of a General K-pop quiz that has no cover of its own (owner, 2026-11-04). General K-pop is the catch-all category (a real
// group row, not a fandom: lib/ux-v1/p3/model.ts CATCH_ALL_SLUG), it has no group photo in public/idols, so its quiz cards fell to the
// typographic cover (the group name over a type glyph, on grey). They now show this picture, the cover of the quiz "K-pop company quiz -
// match the group to the label", the owner's choice. It is not the group's logo (groups.logo_url, group-logos/general-kpop.jpg): that is
// another picture. One constant, read by the quiz card only (components/ux-v1/quiz-card.tsx): no other card, no page metadata and no
// structured data reads it. A tiny module on purpose: the card is imported by client lists and must not pull the group model with it.

/** The slug of the General K-pop category group (the same value as CATCH_ALL_SLUG of lib/ux-v1/p3/model.ts, which a test pins). */
export const GENERAL_KPOP_GROUP_SLUG = 'general-kpop';

/** The cover shown for a General K-pop quiz with no cover of its own. A Supabase Storage URL, on a host next/image accepts (next.config.ts). */
export const GENERAL_KPOP_FALLBACK_COVER =
  'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/quiz-images/quiz-images/2026/05/230d8943-2746-4839-b04a-0181541fad1b.jpg';

/** The fallback cover for a quiz of this group, or null: only General K-pop has one. The caller asks only when the quiz shows no cover. */
export function generalKpopFallbackCover(groupSlug: string | null | undefined): string | null {
  return groupSlug === GENERAL_KPOP_GROUP_SLUG ? GENERAL_KPOP_FALLBACK_COVER : null;
}
