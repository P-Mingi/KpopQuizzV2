// Editable rich-text sections: registry + read model. The registry is the
// structural allowlist of which sections exist per entity type (mirrors the
// section_key CHECK in migration 127). No personal-life section type exists.
import { createPublicReadClient } from '@/lib/supabase/server';

import type { VerseEntityType } from '@/lib/verse/overrides';

export interface SectionDef { key: string; label: string; help: string; }

// Which sections each entity type exposes, in render order.
export const SECTION_REGISTRY: Partial<Record<VerseEntityType | 'era', SectionDef[]>> = {
  idol: [
    { key: 'lore', label: 'Lore', help: 'Fan-written background, story and starter facts, credited to authors.' },
  ],
  album: [
    { key: 'overview', label: 'About this release', help: 'Concept, era notes and credits.' },
  ],
  group: [
    { key: 'overview', label: 'Overview', help: 'A fan-written introduction to the group.' },
    { key: 'glossary', label: 'Glossary', help: 'Fandom terms and their meanings.' },
    { key: 'fanchants', label: 'Fanchants', help: 'Official and fan fanchant guides (original fan content).' },
  ],
  era: [
    { key: 'era_story', label: 'Era story', help: 'The story of this comeback era: concept, sound and reception (original fan writing).' },
  ],
};

export function sectionDef(entityType: string, key: string): SectionDef | null {
  return (SECTION_REGISTRY[entityType as VerseEntityType] ?? []).find((s) => s.key === key) ?? null;
}

export interface SectionState {
  content: unknown | null;      // TipTap JSON, or null when empty
  currentRevisionId: number | null;
  locked: boolean;
  lockReason: string | null;
}

/** Public read of one section's live content (for rendering + seeding the editor). */
export async function getSection(entityType: string, entityId: string, section: string): Promise<SectionState> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('verse_content')
    .select('content, current_revision_id, locked, lock_reason')
    .eq('entity_type', entityType).eq('entity_id', entityId).eq('section_key', section)
    .maybeSingle();
  if (!data) return { content: null, currentRevisionId: null, locked: false, lockReason: null };
  const row = data as { content: unknown; current_revision_id: number | null; locked: boolean; lock_reason: string | null };
  return { content: row.content ?? null, currentRevisionId: row.current_revision_id, locked: row.locked, lockReason: row.lock_reason };
}
