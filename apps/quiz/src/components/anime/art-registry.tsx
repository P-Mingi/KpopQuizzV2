'use client';

import './register-art';

/**
 * Lane O2: the client half of the SERIES_ART slot (lib/ux-v1/a0/group-photos.ts). The server graph and the client graph (the server render of
 * the client components, then the browser) are separate module graphs: this client module fills the slot in the second one. The anime
 * layout renders it as the first node of the page, before the shell, so its module is evaluated before any component of the site
 * that reads the slot renders, on the server and at hydration, and every client component sees the art on both sides.
 */
export function ArtRegistry(): null {
  return null;
}
