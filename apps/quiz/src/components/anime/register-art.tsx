import { SERIES_ART } from '@/lib/ux-v1/a0/group-photos';

import { dressQuizCard } from './dress-quiz-card';
import { SeriesArt } from './series-art';

// Lane O2: fills the SERIES_ART slot of lib/ux-v1/a0/group-photos.ts, where the shared components read the series art (they import none of it).
// Evaluating this module is what fills the slot, so it is imported by the two places that must: the anime layout (the server graph)
// and components/anime/art-registry.tsx (the client graph, server rendered and in the browser). Nothing on the kpop build imports it.
SERIES_ART.avatar = (slug, title) => <SeriesArt slug={slug} title={title} size="avatar" />;
SERIES_ART.dress = dressQuizCard;
