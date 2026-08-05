// V-BUILDER-3 step 3 - the RENDER GATE for block images (owner image law L-047). Any
// renderer that shows a stored block image MUST resolve its storage_path through here, so a
// hidden/removed image (a takedown) disappears everywhere immediately - fail-closed: a
// missing/hidden/removed image resolves to NULL (render nothing), never a broken <img> and
// never an external URL. The stored value is our own storage_path, never a hotlink.
import { createServiceRoleClient } from '@/lib/supabase/server';

const BUCKET = 'verse-space-assets';

/** storage_path -> public URL iff the image is active; else null (fail-closed). */
export async function resolveSpaceImage(storagePath: unknown): Promise<string | null> {
  if (typeof storagePath !== 'string' || !storagePath || /^https?:\/\//i.test(storagePath)) return null;
  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('verse_space_assets')
    .select('storage_path').eq('storage_path', storagePath).eq('kind', 'image').eq('status', 'active').maybeSingle();
  if (error || !data) return null;
  return svc.storage.from(BUCKET).getPublicUrl(data.storage_path).data.publicUrl;
}

/** Batch resolve; unknown/hidden paths map to null. One query, order-preserving. */
export async function resolveSpaceImages(paths: string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  const clean = [...new Set(paths.filter((p) => typeof p === 'string' && p && !/^https?:\/\//i.test(p)))];
  for (const p of paths) out[p] = null;
  if (!clean.length) return out;
  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_space_assets')
    .select('storage_path').in('storage_path', clean).eq('kind', 'image').eq('status', 'active');
  for (const row of (data ?? []) as { storage_path: string }[]) {
    out[row.storage_path] = svc.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl;
  }
  return out;
}
