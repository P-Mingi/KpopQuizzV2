// P5 (CR-025), link 3, the kpopquiz.org side: the Kpopdle card of a group page, loaded only by lib/passerelles/group-line.ts with NET_KPOPDLE_GROUP on. A server component with no stylesheet
// import and no client code: its rules travel with it in one inline style tag. Fail closed: the hub's dailyGuess switch and route map first, then the game's pool; a pool that cannot be read,
// or a group with no member in it, gives no card (min-gate: no dead door, no empty claim). The count is the number of idols of the game's pool that belong to the group, never typed.
import { UxButton } from '@/components/ux-v1/button';
import { parentName } from '@/components/hub/dle/dle-avatar';
import { getDlePool } from '@/lib/dle/read';
import { dleGame } from '@/lib/dle/games';
import { editorialHref } from '@/lib/network/links';
import { hubGameOpen } from '@/lib/passerelles/open';

import type { DlePool } from '@/lib/dle/types';

const GAME = 'kpopdle-idol';

/** The column of the pool that says which group an idol belongs to (copy.ts, idolWords). */
const GROUP_KEY = 'group';

/** How many idols of the pool belong to this group (a sub-unit idol counts for its parent group, as the pool table of the game page does). */
export function kpopdleGroupCount(pool: DlePool | null, groupName: string): number {
  if (!pool || !groupName) return 0;
  const game = dleGame(GAME);
  return pool.entities.filter((e) => parentName(game, GROUP_KEY, e.attrs) === groupName).length;
}

/**
 * The sentence of the card. "The 9 members of TWICE" only when the pool holds the whole roster the page shows; otherwise the count says exactly what the pool holds
 * (the game keeps adult idols of major groups only), so the line never claims more than the data.
 */
export function kpopdleGroupLine(name: string, inPool: number, roster: number | null): string {
  if (inPool === 1) return `1 member of ${name} is in the Kpopdle`;
  return roster !== null && roster === inPool ? `The ${inPool} members of ${name} are in the Kpopdle` : `${inPool} members of ${name} are in the Kpopdle`;
}

const CSS = `
.p5-kg { display: flex; flex-direction: column; gap: 12px; padding: 22px; border: 1px solid var(--ux-line); border-radius: 22px; background: var(--ux-raised); color: var(--ux-ink); }
.p5-kg h2 { font-size: 20px; line-height: 1.3; font-weight: 800; }
.p5-kg p { font-size: 15px; line-height: 1.5; color: var(--ux-muted); }
.p5-kg-acts { display: flex; flex-wrap: wrap; gap: 8px; }
@media (max-width: 760px) { .p5-kg { padding: 18px; } .p5-kg-acts > * { width: 100%; } }
`;

export function KpopdleGroupCard({ name, line }: { name: string; line: string }): React.ReactElement {
  return (
    <section className="p5-kg" aria-labelledby="p5-kg-h">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2 id="p5-kg-h">Do you really know {name}?</h2>
      <p>{line}. Guess today&apos;s idol from a row of clues, with unlimited tries. A free daily game on bunnyverse.org, our sister site.</p>
      <div className="p5-kg-acts">
        <UxButton href={editorialHref('hub', dleGame(GAME).path)} size="lg">Play Kpopdle</UxButton>
      </div>
    </section>
  );
}

/** The card for one group, or null. A failed pool read answers null inside getDlePool; any other error goes to the loader. */
export async function kpopdleGroup(name: string, roster: number | null): Promise<React.ReactElement | null> {
  if (!hubGameOpen(GAME)) return null;
  const n = kpopdleGroupCount(await getDlePool(GAME), name);
  return n >= 1 ? <KpopdleGroupCard name={name} line={kpopdleGroupLine(name, n, roster)} /> : null;
}
