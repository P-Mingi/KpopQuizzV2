// W-CUSTOM - public URL for a curator upload stored in the verse-space-assets
// bucket. The bucket is public-read (migration 139); this just builds the object
// URL. Returns null for a missing path so the caller can fall back to a placeholder.

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export function spaceAssetUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const clean = storagePath.replace(/^\/+/, '');
  return `${BASE}/storage/v1/object/public/verse-space-assets/${clean}`;
}
