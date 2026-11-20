// How a Team (editorial) quiz is signed where no Team badge shows: search snippets, JSON-LD, the legacy byline.
// A Team handle can read like a fan, so the public byline is the Team, never the handle (audit 04 P0-2, owner 2026-11-09).
// The name is the site's own, from the registry (owner, 2026-11-20): "KpopQuiz Team" on kpopquiz.org, "OtakuQuiz Team" on OtakuQuiz,
// "Bunnyverse Team" on the hub. The registry module has no import, so a client component can read this file.

import { SITE } from '@/lib/site/registry';

export const TEAM_AUTHOR_NAME = `${SITE.brand.name} Team`;
export const TEAM_BYLINE = `the ${TEAM_AUTHOR_NAME}`;
