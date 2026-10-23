import { SITE_ID } from '@/lib/site/registry';
import { SERIES_ART } from '@/lib/ux-v1/a0/group-photos';

import { dressQuizCard } from './dress-quiz-card';
import { SeriesArt } from './series-art';

// Lane O2: fills the SERIES_ART slot of lib/ux-v1/a0/group-photos.ts, where the shared components read the series art (they import none of it).
// Evaluating this module is what fills the slot, so it is imported by the two places that must: the anime layout (the server graph)
// and components/anime/art-registry.tsx (the client graph, server rendered and in the browser). Nothing on the kpop build imports it.
// D-097: Next loads every route module at server start, the anime layout included, even on the kpop build; the slot is therefore
// filled only when the build is the anime site (SITE_ID is a build-time constant), so a kpop server never renders the anime art.
if (SITE_ID === 'anime') {
  SERIES_ART.avatar = (slug, title) => <SeriesArt slug={slug} title={title} size="avatar" />;
  SERIES_ART.dress = dressQuizCard;
}
