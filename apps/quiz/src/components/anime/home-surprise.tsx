// Run O1, lane O1: Surprise me on the OtakuQuiz home (owner, 2026-10-29 and 2026-10-30; TWINS row 1, code A8), right under the hero
// buttons (the afterHeader slot of components/home/ux-v1/ux-home.tsx), before the quiz of the day: a hero action, as on the hub. The hub's
// component as it is, with the anime-h2 class prefix (styles/sites/anime/h2.css). The pool is read on the server; the home is ISR, so no
// fan is read there and nothing is left out as played. With no pool the block is left out (min-gate).
import { HomeSurprise } from '@/components/hub/home/home-surprise';
import { COPY } from '@/copy/anime/o1';
import { loadAnimeSurprise } from '@/lib/anime/home-surprise';
import { basePathOf } from '@/lib/site/base-path';
import { SITE } from '@/lib/site/registry';

export async function AnimeHomeSurprise(): Promise<React.ReactElement | null> {
  const pool = await loadAnimeSurprise(basePathOf(SITE.url));
  if (pool.length === 0) return null;
  return (
    <div className="anime-h2-surprise">
      <HomeSurprise
        pool={pool}
        playedIds={[]}
        lede={COPY['home.surprise.lede']}
        labels={{ button: COPY['home.surprise.button'], play: COPY['home.surprise.play'], another: COPY['home.surprise.another'] }}
        prefix="anime-h2"
      />
    </div>
  );
}
