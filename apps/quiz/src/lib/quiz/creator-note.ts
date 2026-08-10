/**
 * SEO indexguard PART 4 - the optional creator note ("About your quiz").
 *
 * Stored in quizzes.settings.creator_note (jsonb, NO DDL). Human-written, unique
 * per page - the strongest anti-thin-content signal we can give a new quiz. Since
 * it is rendered on the page AND folded into the meta description, it is sanitized
 * at the write boundary: strip HTML (no injected markup reaches the DOM or the
 * <meta>), collapse whitespace (which also normalises tabs/newlines), hard-cap length.
 */
export const CREATOR_NOTE_MAX = 280;

/**
 * Returns a clean note, or undefined if empty/absent. Strips all tags, collapses
 * whitespace, trims, and caps at CREATOR_NOTE_MAX characters.
 */
export function sanitizeCreatorNote(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const stripped = raw
    .replace(/<[^>]*>/g, ' ') // drop any HTML tags (no injected markup reaches the DOM or <meta>)
    .replace(/\s+/g, ' ')     // collapse all whitespace, incl. tabs/newlines
    .trim();
  if (!stripped) return undefined;
  return stripped.length > CREATOR_NOTE_MAX ? stripped.slice(0, CREATOR_NOTE_MAX).trimEnd() : stripped;
}
