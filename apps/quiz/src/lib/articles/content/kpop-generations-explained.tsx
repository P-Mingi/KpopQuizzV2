import Link from 'next/link';

import { isThemedModePlayable } from '@/lib/blind-test-playlists';
import {
  GENERATIONS_TIMELINE_PATH,
  confidenceLabel,
  eraYears,
  generationAnswer,
  generationCell,
  generationData,
  groupGeneration,
  ordinal,
  unlabelledReason,
} from '@/lib/generations/generations';
import { getGenerationRows, rowHubHref } from '@/lib/generations/rows';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { FOUNDER } from '@/lib/seo/org';
import { atLeast, getPublicStatsOrNull } from '@/lib/stats/site-stats';
import { isUxV12 } from '@/lib/ux-v12';

import type { GenerationRow } from '@/lib/generations/rows';
import type { GenerationSource, GroupGeneration } from '@/lib/generations/generations';

// The K-pop generations hub (SEO Mission 2, part C; owner, 2026-10-15). Same URL as before:
// it is already cited and ranked. Every generation claim comes from
// lib/generations/group-generations.json through lib/generations/generations.ts, the file
// the group hubs read too, and names its source next to it. The table rows are the live
// directory (lib/generations/rows.ts); counts are computed from those rows, never typed.

const HISTORY = 'wikipedia-history-of-korean-idols';
const KTIMES = 'korea-times-2025';
const JOONGANG = 'joongang-2023-fifth-generation';
const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';

function sourceById(id: string): GenerationSource {
  const s = generationData().sources.find((x) => x.id === id);
  if (!s) throw new Error(`[generations hub] unknown source ${id}`);
  return s;
}

/** "(Korea Times, 2025; Wikipedia, History of Korean idols)" with each name linked. */
function Src({ sources }: { sources: readonly GenerationSource[] }): React.ReactElement {
  return (
    <>
      (
      {sources.map((s, i) => (
        <span key={s.id}>
          {i > 0 ? '; ' : ''}
          <a href={s.url}>{s.short}</a>
        </span>
      ))}
      )
    </>
  );
}

/** "Source: Korea Times, 2025." or "Sources: a; b." with each name linked. */
function SrcSentence({ sources }: { sources: readonly GenerationSource[] }): React.ReactElement {
  return (
    <>
      {sources.length === 1 ? 'Source: ' : 'Sources: '}
      {sources.map((s, i) => (
        <span key={s.id}>
          {i > 0 ? '; ' : ''}
          <a href={s.url}>{s.short}</a>
        </span>
      ))}
      .
    </>
  );
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Group names as links to their hubs (plain text for a hub with no quiz yet), "A, B and C". */
function GroupList({ rows }: { rows: GenerationRow[] }): React.ReactElement {
  return (
    <>
      {rows.map((r, i) => {
        const href = rowHubHref(r);
        const sep = i === 0 ? '' : i === rows.length - 1 ? ' and ' : ', ';
        return (
          <span key={r.slug}>
            {sep}
            {href ? <Link href={href}>{r.name}</Link> : r.name}
          </span>
        );
      })}
    </>
  );
}

function rowsWhere(rows: GenerationRow[], test: (g: GroupGeneration) => boolean): GenerationRow[] {
  return rows.filter((r) => r.gen?.label && test(r.gen));
}

function DirectoryLine({ rows, label }: { rows: GenerationRow[]; label: string }): React.ReactElement {
  if (rows.length === 0) return <>No act in our directory is labelled {label}.</>;
  return <>In our directory, labelled {label}: <GroupList rows={rows} />.</>;
}

/** The short answer for one group, from the file, with its sources and its hub. */
function ShortAnswer({ slug, rows }: { slug: string; rows: GenerationRow[] }): React.ReactElement | null {
  const gen = groupGeneration(slug);
  if (!gen?.label) return null;
  const row = rows.find((r) => r.slug === slug);
  const name = row?.name ?? gen.name;
  const href = row ? rowHubHref(row) : `/${slug}-quiz`;
  return (
    <p>
      {generationAnswer(name, gen.label)} <SrcSentence sources={gen.label.sources} /> {name} debuted in {gen.debutYear}
      {gen.debutNote ? ` (${gen.debutNote})` : ''}, according to <a href={gen.wikipedia}>Wikipedia</a>.
      {href ? <> Play the <Link href={href}>{name} quiz</Link>.</> : null}
    </p>
  );
}

export async function ArticleBody(): Promise<React.ReactElement> {
  const data = generationData();
  const [{ rows }, stats, fifthPlayable] = await Promise.all([
    getGenerationRows(),
    getPublicStatsOrNull(),
    isUxV12() ? isThemedModePlayable('5th-gen').catch(() => false) : Promise.resolve(false),
  ]);
  const history = sourceById(HISTORY);
  const ktimes = sourceById(KTIMES);
  const joongang = sourceById(JOONGANG);
  const labelled = rows.filter((r) => r.gen?.label).length;
  const reviewed = formatDay(data.reviewed);
  const reviewedMonth = new Date(`${data.reviewed}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  // Era years come from the file (the same years as the table, the image and the eras page).
  const era = (n: number) => data.eras.find((e) => e.generation === n)!;
  const [e1, e2, e3, e4, e5] = [era(1), era(2), era(3), era(4), era(5)];

  const byGen = (n: number): GenerationRow[] =>
    rowsWhere(rows, (g) => g.label!.generation === n && (g.label!.confidence === 'consensus' || g.label!.confidence === 'attributed'));
  const contested = rowsWhere(rows, (g) => g.label!.confidence === 'contested');
  const newest = rowsWhere(rows, (g) => g.label!.confidence === 'newest');

  const timelineAlt = `Timeline of the K-pop generations: ${data.eras
    .map((e) => `${ordinal(e.generation)} from ${e.startAlt ? `${e.start} or ${e.startAlt}` : e.start}${e.official ? '' : ' (not official)'}`)
    .join(', ')}.`;

  // Name them all, by generation (the pretty game URLs exist with the v12 flags on).
  const nameAll = isUxV12()
    ? NAME_ALL_GROUPS.map((slug) => groupGeneration(slug)).filter((g): g is GroupGeneration => Boolean(g?.label))
    : [];
  // Buckets in generation order (a contested 3rd or 4th sits between the two).
  const bucketOrder = (g: GroupGeneration): number => g.label!.generation ?? (g.label!.range ? g.label!.range[0] + 0.5 : 9);
  const nameAllBuckets = new Map<string, GroupGeneration[]>();
  for (const g of [...nameAll].sort((a, b) => bucketOrder(a) - bucketOrder(b))) {
    const key = g.label!.confidence === 'newest' ? generationCell(g) : `${generationCell(g)} generation`;
    nameAllBuckets.set(key, [...(nameAllBuckets.get(key) ?? []), g]);
  }

  return (
    <>
      <p className="art-lead">
        K-pop generations sort idols by debut era. <a href={history.url}>Wikipedia&apos;s history of Korean idols</a> dates the 1st
        from {e1.start}, the 2nd from {e2.start} and the 3rd from {e3.start}; the 4th starts around {e4.start} or {e4.startAlt}, and
        debuts since {e5.start} are often called 5th generation, unofficially (<a href={ktimes.url}>{ktimes.short}</a>). Of our {atLeast(rows.length)} acts, {atLeast(labelled)}{' '}
        carry a label ({reviewedMonth}).
      </p>

      <h2 id="timeline">K-pop generations timeline</h2>
      <p>
        A generation is named for when its idols debuted, not for when they were popular. The start years below are the ones our
        sources give most often, and each row names its sources.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>
              <th scope="col">Generation</th>
              <th scope="col">Start often cited</th>
              <th scope="col">What changed</th>
              <th scope="col">Example groups</th>
              <th scope="col">Sources</th>
            </tr>
          </thead>
          <tbody>
            {data.eras.map((e) => (
              <tr key={e.generation}>
                <td>{ordinal(e.generation)} generation{e.official ? '' : ' (not official)'}</td>
                <td>{e.startText}</td>
                <td>{e.changed}</td>
                <td>{e.examples.join(', ')}</td>
                <td>
                  {e.sources.map((s, i) => (
                    <span key={s.id}>{i > 0 ? '; ' : ''}<a href={s.url}>{s.short}</a></span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figure style={{ margin: '0 0 20px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG route, drawn from the same data as the table */}
        <img src={GENERATIONS_TIMELINE_PATH} alt={timelineAlt} width={1200} height={560} loading="lazy" style={{ width: '100%', height: 'auto', borderRadius: 10, border: '1px solid var(--border)' }} />
        <figcaption style={{ fontSize: 13, marginTop: 8 }}>
          The timeline as an image, drawn by kpopquiz.org from the sources above. <a href={GENERATIONS_TIMELINE_PATH} download>Download the SVG</a>.
          Licence <a href={CC_BY}>CC BY 4.0</a>: credit kpopquiz.org; a link is appreciated; nofollow is fine.
        </figcaption>
      </figure>

      <h2 id="debated">Why the boundaries are debated</h2>
      <p>
        No official body defines the generations, and the edges move with the source. A <a href={joongang.url}>Korea JoongAng Daily
        fact-check (July 2023)</a> found no firm line between them, only a loose industry habit of giving each decade of debuts since
        the 1990s its own generation.
      </p>
      <p>
        Girl groups run on a different clock. <a href={history.url}>Wikipedia&apos;s history of Korean idols</a> counts girl groups as
        3rd generation only from their 2014 debuts, because many earlier ones broke up after a 2009 rule capped exclusive contracts at
        seven years, and it calls some girl groups that debuted from 2010 to 2013 generation 2.5.
      </p>
      <p>
        The 4th generation has two start dates. Industry experts largely date it from the change the pandemic brought in 2020, while
        others place it around 2018 (<a href={ktimes.url}>{ktimes.short}</a>). That leaves the groups that debuted in 2018 and 2019 on
        the line, which is why our table marks them as attributed or contested.
      </p>
      <p>
        The 5th generation is the newest and least settled label. It came from Mnet&apos;s audition show Boys Planet, which billed
        ZEROBASEONE as a 5th generation boy group in 2023, and it is not official (<a href={joongang.url}>{joongang.short}</a>). The
        Korea Times (2025) reports that some critics see the 4th generation as still going, that in-between terms such as 3.5 and 4.5
        generation are in use, and that a Japanese group, Cosmosy, called itself 6th generation when it debuted on 31 December 2024
        (<a href={ktimes.url}>{ktimes.short}</a>).
      </p>

      <h2 id="1st-gen">What is 1st generation K-pop?</h2>
      <p>
        1st generation K-pop is the idol groups that debuted from {eraYears(e1)}, starting with H.O.T., the first group from SM
        Entertainment&apos;s trainee system <Src sources={[history]} />. H.O.T., Sechs Kies, S.E.S. and Fin.K.L set the template the
        later generations followed: about five members with set roles and group choreography fans could copy.{' '}
        <DirectoryLine rows={byGen(1)} label="1st generation" />
      </p>

      <h2 id="2nd-gen">What is 2nd generation K-pop?</h2>
      <p>
        2nd generation K-pop covers the idols that debuted from {eraYears(e2)}, from TVXQ to BIGBANG and Girls&apos; Generation{' '}
        <Src sources={[history, ktimes]} />. Wonder Girls&apos; 2007 hit &quot;Tell Me&quot; set off the boom, and groups grew bigger,
        split into units and became regulars on variety shows. <DirectoryLine rows={byGen(2)} label="2nd generation" />
      </p>

      <h2 id="3rd-gen">What is 3rd generation K-pop?</h2>
      <p>
        3rd generation K-pop starts with the idols that debuted in {e3.start}, with EXO as its starting point, and it produced worldwide stars
        such as BTS and BLACKPINK after Psy&apos;s &quot;Gangnam Style&quot; <Src sources={[history, ktimes]} />. Social media and
        self-made video became the way fans found groups, and members from abroad and survival shows became common.{' '}
        <DirectoryLine rows={byGen(3)} label="3rd generation" />
      </p>

      <h2 id="4th-gen">What is 4th generation K-pop?</h2>
      <p>
        4th generation K-pop is the groups that debuted into the pandemic years, led by aespa, LE SSERAFIM and NewJeans; industry
        experts largely date it from {e4.startAlt}, some from around {e4.start} <Src sources={[ktimes]} />. Online concerts, short-form video and
        virtual tours shaped how they reached fans <Src sources={[joongang]} />. <DirectoryLine rows={byGen(4)} label="4th generation" />
        {contested.length > 0 ? <> Debated between 3rd and 4th: <GroupList rows={contested} />.</> : null}
      </p>

      <h2 id="5th-gen">What is 5th generation K-pop?</h2>
      <p>
        5th generation K-pop is an unofficial name for groups that debuted from {e5.start}, such as ZEROBASEONE, BOYNEXTDOOR, TWS, RIIZE,
        ILLIT, BABYMONSTER and KISS OF LIFE <Src sources={[ktimes]} />. We call these groups the newest wave, and we use the number
        only where a source uses it for that group.{' '}
        {newest.length > 0 ? <>In our directory, in the newest wave: <GroupList rows={newest} />.</> : null}
      </p>

      <h2 id="5th-gen-start">When did 5th gen K-pop start?</h2>
      <p>
        The 5th generation label started in {e5.start}, when Mnet&apos;s Boys Planet billed ZEROBASEONE, the group formed on the show, as a
        5th generation boy group <Src sources={[joongang, ktimes]} />. It is not an official era: the Korea Times (2025) notes that some
        critics think the 4th generation never ended.
      </p>

      <h2 id="my-group">What generation is my group?</h2>
      <p>
        Every group and solo artist in the kpopquiz.org directory is below, with its debut year, the company that launched it, its
        generation and how sure that label is. {atLeast(labelled)} of the {atLeast(rows.length)} acts carry a generation label. Solo
        artists, the one singer-songwriter duo and groups based outside Korea do not: generations describe Korean idol groups.
      </p>
      <h3>How we label each group</h3>
      <ul>
        <li><strong>Consensus</strong>: the debut year sits inside one generation in every dating our sources give.</li>
        <li><strong>Attributed</strong>: a named source places the group, or a note qualifies the label; we name the source.</li>
        <li><strong>Contested</strong>: the group sits where the sources disagree and none places it; we show both views.</li>
        <li><strong>Newest</strong>: a debut from 2023 on. The 5th generation label is not official, so we give a number only where a source uses it for that group.</li>
        <li>Debut years and agencies come from each act&apos;s Wikipedia article. Reviewed {reviewed}.</li>
      </ul>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Debut</th>
              <th scope="col">Agency</th>
              <th scope="col">Generation</th>
              <th scope="col">Confidence</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const href = rowHubHref(r);
              const g = r.gen;
              return (
                <tr key={r.slug}>
                  <td>{href ? <Link href={href}>{r.name}</Link> : r.name}</td>
                  <td>{g ? `${g.debutYear}${g.debutNote ? ` (${g.debutNote})` : ''}` : ''}</td>
                  <td>{g?.agency ?? ''}</td>
                  <td>{g ? (g.label ? generationCell(g) : unlabelledReason(g.unlabelled)) : unlabelledReason(null)}</td>
                  <td>{g?.label ? confidenceLabel(g.label.confidence) : ''}</td>
                  <td>
                    {g?.label?.sources.map((s, i) => (
                      <span key={s.id}>{i > 0 ? '; ' : ''}<a href={s.url}>{s.short}</a></span>
                    ))}
                    {g ? <>{g.label ? '; ' : ''}debut: <a href={g.wikipedia}>Wikipedia</a></> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 id="bts">What gen is BTS?</h2>
      <ShortAnswer slug="bts" rows={rows} />

      <h2 id="stray-kids">Is Stray Kids 3rd or 4th gen?</h2>
      <ShortAnswer slug="stray-kids" rows={rows} />

      <h2 id="newjeans">What gen is NewJeans?</h2>
      <ShortAnswer slug="newjeans" rows={rows} />

      <h2 id="illit">What gen is ILLIT?</h2>
      <ShortAnswer slug="illit" rows={rows} />

      <h2 id="test-yourself">Test yourself</h2>
      <p>
        Play the K-pop blind test one generation at a time:{' '}
        <Link href="/blindtest/2nd-gen">2nd gen blind test</Link>, <Link href="/blindtest/3rd-gen">3rd gen blind test</Link>
        {fifthPlayable ? <>, <Link href="/blindtest/4th-gen">4th gen blind test</Link> and <Link href="/blindtest/5th-gen">5th gen blind test</Link></> : <> and <Link href="/blindtest/4th-gen">4th gen blind test</Link></>}.
        {stats ? ` The blind test holds ${atLeast(stats.songs)} songs from ${atLeast(stats.songGroups)} groups.` : ''}
      </p>
      {nameAllBuckets.size > 0 ? (
        <>
          <p>Or name every member of a group, sorted by the generation in our table:</p>
          <ul>
            {[...nameAllBuckets.entries()].map(([gen, groups]) => (
              <li key={gen}>
                <strong>{gen}</strong>:{' '}
                {groups.map((g, i) => (
                  <span key={g.slug}>{i > 0 ? ', ' : ''}<Link href={`/${g.slug}-name-all-members`}>Name all {g.name} members</Link></span>
                ))}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p>
        Wondering when you became a fan? The <Link href="/articles/kpop-eras-timeline">K-pop eras timeline</Link> helps you find your
        starting generation.
      </p>

      <h2 id="sources">Sources</h2>
      <ul>
        {data.sources.map((s) => (
          <li key={s.id}>
            <a href={s.url}>{s.publisher}: {s.title}</a>{s.date ? `, ${formatDay(s.date)}` : ''}
          </li>
        ))}
        <li>Each act&apos;s Wikipedia article, for its debut year and agency, and Wikidata, for its identifier.</li>
      </ul>
      <p>
        By <Link href="/about">{FOUNDER.name}</Link>, founder of kpopquiz.org. Reviewed <time dateTime={data.reviewed}>{reviewed}</time>.
        Spotted a mistake? Our <Link href="/editorial-policy#corrections">corrections log</Link> lists every fix.
      </p>
    </>
  );
}

/**
 * The Article JSON-LD `mentions` (rulebook section 7): every group of the table as a
 * MusicGroup with its Wikidata and Wikipedia sameAs. Same rows and names as the visible table.
 * Solo artists are people, not groups, so they are left out.
 */
export async function articleJsonLdMentions(): Promise<Array<Record<string, unknown>>> {
  const { rows } = await getGenerationRows();
  return rows
    .filter((r): r is GenerationRow & { gen: GroupGeneration } => Boolean(r.gen) && r.gen!.unlabelled !== 'solo')
    .map((r) => ({
      '@type': 'MusicGroup',
      name: r.name,
      sameAs: [`https://www.wikidata.org/wiki/${r.gen.wikidata}`, r.gen.wikipedia],
    }));
}
