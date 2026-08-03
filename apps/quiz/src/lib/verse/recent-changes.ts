// W4.6 - recent-changes feed for a space. Reads verse_revisions directly (no table);
// resolves each revision's entity to its space and keeps this group's. Editor-facing.
import { createServiceRoleClient } from '@/lib/supabase/server';
import { resolveEntityGroupId } from '@/lib/verse/curate';
import { resolveEntityLink } from '@/lib/verse/watchlist';
import { resolveIdentities } from '@/lib/verse/identity';

import type { Identity } from '@/lib/verse/identity';

export interface Change { id: number; entityLabel: string; entityUrl: string; section: string; summary: string; author: Identity | null; createdAt: string }

export async function getRecentChanges(groupId: number, limit = 60): Promise<Change[]> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_revisions')
    .select('id, entity_type, entity_id, section_key, summary, author, created_at')
    .order('created_at', { ascending: false }).limit(400);
  const revs = (data ?? []) as Array<{ id: number; entity_type: string; entity_id: string; section_key: string; summary: string | null; author: string; created_at: string }>;
  if (revs.length === 0) return [];

  // Resolve each distinct entity's group + link once.
  const entityKey = (r: { entity_type: string; entity_id: string }) => `${r.entity_type}|${r.entity_id}`;
  const groupOf = new Map<string, number | null>();
  const linkOf = new Map<string, { url: string; label: string } | null>();
  for (const k of new Set(revs.map(entityKey))) {
    const [et, ei] = k.split('|');
    groupOf.set(k, await resolveEntityGroupId(et!, ei!));
    if (groupOf.get(k) === groupId) linkOf.set(k, await resolveEntityLink(et!, ei!));
  }

  const mine = revs.filter((r) => groupOf.get(entityKey(r)) === groupId).slice(0, limit);
  // Resolve authors through the shared resolver so SYSTEM_AUTHOR_DISPLAY wins
  // (a system edit renders "KpopVerse", never the private display_name/username)
  // and the byline honors block/href. anonymous -> null -> "a fan" via Byline.
  const authorIds = [...new Set(mine.map((r) => r.author))].filter((a) => a && a !== 'anonymous');
  const idById = authorIds.length ? await resolveIdentities(authorIds) : new Map<string, Identity>();

  return mine.map((r) => {
    const link = linkOf.get(entityKey(r));
    return {
      id: r.id, entityLabel: link?.label ?? r.entity_type, entityUrl: link?.url ?? '#', section: r.section_key,
      summary: r.summary ?? 'edited', author: r.author === 'anonymous' ? null : (idById.get(r.author) ?? null), createdAt: r.created_at,
    };
  });
}
