// FandomVerse (security review, 2026-10-28; lane 3): the Supabase session cookies of the hub and anime builds carry Secure on
// every https request and always on a production deployment; plain http to a local dev server keeps working without it.
// kpop does not use this module: its cookies keep @supabase/ssr's defaults exactly (parity). Pure, edge-safe. The server client
// (lib/supabase/server.ts) writes the same rule out, so the module graph of the kpop pages does not change.

/** True when a session cookie set for this request must carry Secure. */
export function secureRequest(
  protocol: string | null,
  forwardedProto: string | null,
  env: { readonly VERCEL_ENV?: string | undefined },
): boolean {
  if (env.VERCEL_ENV === 'production') return true;
  if (forwardedProto?.split(',')[0]?.trim().toLowerCase() === 'https') return true;
  return protocol === 'https:';
}
