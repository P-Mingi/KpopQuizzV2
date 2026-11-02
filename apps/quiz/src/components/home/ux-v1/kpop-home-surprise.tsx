// Surprise me on the kpopquiz.org home (owner, 2026-10-31, CR-015), right under the hero buttons (UxHome's afterHeader slot), before the quiz
// of the day, as on OtakuQuiz (TWINS row 1, A8). The hub's component with the kpop-h2 prefix (styles/kpop/home-surprise.css, imported by the
// page). The pool is read on the server; the home is ISR, so no fan is read there. With no pool the block is left out (min-gate). The server
// HTML holds a button and no link: a pick and its link to the quiz page appear only after a click.
import { HomeSurprise } from '@/components/hub/home/home-surprise';
import { loadKpopSurprise } from '@/lib/ux-v1/p1/home-surprise';

export async function KpopHomeSurprise(): Promise<React.ReactElement | null> {
  const pool = await loadKpopSurprise();
  if (pool.length === 0) return null;
  return (
    <div className="kpop-h2-surprise">
      <HomeSurprise
        pool={pool}
        playedIds={[]}
        lede="Not sure what to play?"
        labels={{ button: 'Surprise me', play: 'Play', another: 'Another' }}
        prefix="kpop-h2"
      />
    </div>
  );
}
