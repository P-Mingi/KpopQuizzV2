// Stable slug helpers for Verse entity URLs.
export function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/['".,()[\]]/g, '')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'x';
}

export const idolSlug = (name: string): string => slugify(name);
export const albumSlug = (title: string): string => slugify(title);
