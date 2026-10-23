import Link from 'next/link';

import { GENERATIONS_HUB_PATH, eraYears, generationData, ordinal } from '@/lib/generations/generations';

// SEO Mission 2, part C point 5 (owner, 2026-10-15): this page answers "when did I become a
// fan"; the generations cluster belongs to the hub (GENERATIONS_HUB_PATH), linked here with the
// anchor "K-pop generations timeline". The year ranges and era markers come from the hub's own
// file (lib/generations/group-generations.json), so the two pages give the same years. The
// typed group counts ("87 groups", "16 and 17 groups") and an unsourced "fan fact" are gone.

export function ArticleBody(): React.ReactElement {
  const { eras } = generationData();
  return (
    <>
      <p className="art-lead">
        K-pop fans sort themselves by era: the generation of the first group you followed in real time
        is where you started. Four generations are well established, and groups that debuted from 2023
        are often called a 5th, a label that is not official. Here are the approximate years, with a
        quiz to test where you really started.
      </p>

      <h2 id="timeline">When did each K-pop era start?</h2>
      <p>
        Era boundaries are approximate and fans debate the edges. The years below are the debut years
        our <Link href={GENERATIONS_HUB_PATH}>K-pop generations timeline</Link> uses, where every
        range and every group label names its source.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th scope="col">Era</th><th scope="col">Approx. debut years</th><th scope="col">Era markers</th></tr>
          </thead>
          <tbody>
            {eras.map((e) => (
              <tr key={e.generation}>
                <td>{ordinal(e.generation)} gen{e.official ? '' : ' (not official)'}</td>
                <td>{eraYears(e)}</td>
                <td>{e.examples.slice(0, 4).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="which-gen">How do I know which K-pop generation I started in?</h2>
      <p>
        Think about the first group whose comeback you followed in real time, not
        one you discovered later. That group&apos;s generation is your entry
        point, and it may be older or newer than you assumed. To check a group, find it in the table of
        every group&apos;s generation on the <Link href={`${GENERATIONS_HUB_PATH}#my-group`}>K-pop generations</Link> page.
      </p>

      <h2 id="test">How can I test my K-pop era knowledge?</h2>
      <p>
        The blind test lets you filter by generation, so you can play only the
        era you grew up on or challenge yourself on the others. For how the
        generations are defined and why their edges are debated, read the full generations guide.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Play by generation</Link>
        <Link href={GENERATIONS_HUB_PATH} className="art-cta-btn art-cta-secondary">Generations explained</Link>
      </div>
    </>
  );
}
