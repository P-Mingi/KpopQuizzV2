// Run O1 spike (branch o1/F0s, never merged): every path of an anime or hub build that no
// page of app/sites/[site] serves lands here (the catch-all rewrite sends every public path
// below /sites/<site>), so the 404 is the site's own not-found.tsx, never the kpop one.

import { notFound } from 'next/navigation';

export default function SiteRest(): never {
  notFound();
}
