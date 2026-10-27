import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { prettyPath } from '@/lib/name-all/round';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { formatDay, joinNames, membersSentence, mostCommonText } from '@/lib/personality/page-copy';
import { axisEnds } from '@/lib/personality/traits';
import { whichMemberPath } from '@/lib/personality/view';

import type { MostCommon } from '@/lib/personality/page-copy';
import type { Roster } from '@/lib/personality/rosters';
import type { DistributionView, QuizView } from '@/lib/personality/view';

// The server-rendered part of a Which member are you page, below the quiz (owner,
// 2026-10-13: SEO; SEO Mission 2, part D, 2026-10-15). The quiz is a client island
// whose HTML holds the H1, the answer block and a Start button. This adds what only this
// group's page has, all real:
//   - "The <group> members": stage name and public role, from the sourced line-up
//     (rosters.ts: Wikidata and Wikipedia agree), with the sources next to it;
//   - "How your result is calculated": the real engine (lib/personality/engine.ts) in
//     words, the six scales and, per result, the answers that lead to it;
//   - "Most common result": only above MOST_COMMON_MIN saved results, with n and the
//     date, top three only (a share never singles out the member fans get least);
//   - "More <group> games", then the other Which member are you pages.
// No heights, weights, relationships, birth dates, "compatibility" or "soulmate" framing
// (rulebook section 6), checked by about.test.ts.

export interface WmaAboutProps {
  group: { slug: string; name: string };
  view: QuizView;
  /** Groups with a Which member are you page (getWmaGroupSlugs). */
  wmaSlugs: readonly string[];
  /** Display names by slug, for the other pages; a slug without one is left out. */
  names: ReadonlyMap<string, string>;
  /**
   * Run O1 (PERS-2): the words of the site for the prose and for the list of other pages. Absent: today's kpop words (member, bias,
   * group). The anime page passes character, oshi and series.
   */
  words?: WmaAboutWords;
  /** The public path of another group's page. Absent: /which-<slug>-member-are-you (whichMemberPath). */
  pathFor?: (slug: string) => string;
  /** The sourced line-up, or null (the members section then hides). */
  roster?: Roster | null;
  /** The most common results, or null (the section then hides). */
  common?: MostCommon | null;
  /** Real playable songs of the group's blindtest, or null when it is not playable. */
  blindtestSongs?: number | null;
  /** The group has a trivia page. */
  trivia?: boolean;
}

export interface WmaAboutWords {
  member: string;
  bias: string;
  topic?: string;
}

const KPOP_WORDS: Required<WmaAboutWords> = { member: 'member', bias: 'bias', topic: 'group' };

/** The most common results, biggest first, at most `max`, each rounded to a whole percent above zero. */
export function topResults(d: DistributionView | null, max = 3): Array<{ label: string; pct: number }> {
  if (!d) return [];
  return [...d.rows]
    .sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label, 'en'))
    .map((r) => ({ label: r.label, pct: Math.round(r.pct) }))
    .filter((r) => r.pct > 0)
    .slice(0, max);
}

const SCALE_NAME: Record<string, string> = { energy: 'Energy', chaos: 'Chaos', care: 'Care', craft: 'Craft', heart: 'Heart', spotlight: 'Spotlight' };

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function WmaAbout(props: WmaAboutProps): React.ReactElement {
  // Run O1 (PERS-2): the anime page passes its words and keeps its own layout (SeriesAbout); the kpop page is main's.
  if (props.words) return <SeriesAbout {...props} />;
  const { group, view, wmaSlugs, names, roster = null, common = null, blindtestSongs = null, trivia = false, pathFor = whichMemberPath } = props;
  const w = KPOP_WORDS;
  const results = view.results;
  const scales = axisEnds();
  const members = roster?.members ?? [];
  const withRole = members.filter((m) => m.role);
  // A role column only when most members have a role; otherwise the few roles are a sentence
  // ("Wikipedia lists Jungwon as leader.") and the names a plain list.
  const hasRole = withRole.length > 0 && withRole.length * 2 >= members.length;
  const hasTeam = members.some((m) => m.team);
  const asTable = hasRole || hasTeam;
  const hub = `/${group.slug}-quiz`;

  const games: Array<{ href: string; label: string; line: string }> = [
    { href: hub, label: `${group.name} quiz`, line: `The ${group.name} quizzes made by fans.` },
  ];
  if (blindtestSongs !== null && blindtestSongs > 0) games.push({ href: `/blindtest/group-${group.slug}`, label: `${group.name} blind test`, line: `Guess the song from ten-second clips: ${blindtestSongs} songs.` });
  if ((NAME_ALL_GROUPS as readonly string[]).includes(group.slug)) games.push({ href: prettyPath(group.slug), label: `Name all ${group.name} members`, line: 'Type every member you can name from memory.' });
  if (trivia) games.push({ href: `/${group.slug}-trivia`, label: `${group.name} trivia`, line: `Questions and answers about ${group.name}.` });
  const others = wmaSlugs.filter((s) => s !== group.slug && names.has(s)).sort((a, b) => names.get(a)!.localeCompare(names.get(b)!, 'en'));

  return (
    <>
      {roster && members.length > 0 ? (
        <section className="ux-sec" aria-labelledby="pers-members-h" data-testid="pers-members">
          <SectionHeader id="pers-members-h" title={`The ${group.name} members`} icon="users" />
          <div className="g3-prose">
            <p>{membersSentence(group.name, roster)}</p>
            {!hasRole && withRole.length > 0 ? <p>Wikipedia lists {joinNames(withRole.map((m) => `${m.name} as ${m.role!.toLowerCase()}`))}.</p> : null}
          </div>
          {asTable ? (
            <div className="ux-pers-tw">
              <table className="ux-pers-table">
                <caption className="ux-sr">{hasRole ? `The ${group.name} members and their public roles` : `The ${group.name} members`}</caption>
                <thead>
                  <tr>
                    <th scope="col">Stage name</th>
                    {hasRole ? <th scope="col">Public role</th> : null}
                    {hasTeam ? <th scope="col">Team</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.wikidata}>
                      <th scope="row">{m.name}</th>
                      {hasRole ? <td>{m.role ?? <span className="ux-muted">Not listed</span>}</td> : null}
                      {hasTeam ? <td>{m.team ?? ''}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="g3-lineup" aria-label={`The ${group.name} members`}>
              {members.map((m) => <li key={m.wikidata}>{m.name}</li>)}
            </ul>
          )}
          <p className="ux-pers-src" data-testid="pers-sources">
            Line-up: <a className="ux-lnk" href={roster.wikipediaUrl}>Wikipedia</a> and <a className="ux-lnk" href={roster.wikidataUrl}>Wikidata</a>, both checked {formatDay(roster.checkedOn)}.
            {withRole.length > 0 ? ' Roles: the Wikipedia line of each member, which cites its own source.' : ''}
            {roster.official ? <> Official site: <a className="ux-lnk" href={roster.official}>{hostOf(roster.official)}</a>.</> : null}
          </p>
        </section>
      ) : null}

      <section className="ux-sec" aria-labelledby="pers-how-h" data-testid="pers-how">
        <SectionHeader id="pers-how-h" title="How your result is calculated" icon="target" />
        <div className="g3-prose">
          <p>
            Your result is the {group.name} member whose quiz profile is closest to your answers, across six scales.
            The same answers always give the same result: there is no randomness and no AI.
          </p>
          <ol className="ux-pers-steps">
            <li>Each of the {view.questions.length} answers you pick sets a position on one or more of the six scales below.</li>
            <li>On each scale, your position is the average of what your answers set. A scale none of your answers touched stays in the middle.</li>
            <li>Each {group.name} member has a quiz profile on the same six scales, written by the kpopquiz.org team. A profile is a setting of this quiz, not a statement about the real person.</li>
            <li>Your result is the member whose profile is the shortest distance from your position over all six scales. A tie goes to the member listed first.</li>
            <li>The result card then describes you, from the three scales where that profile is strongest.</li>
          </ol>
        </div>
        <div className="ux-pers-tw">
          <table className="ux-pers-table">
            <caption>The six scales</caption>
            <thead><tr><th scope="col">Scale</th><th scope="col">One end</th><th scope="col">Other end</th></tr></thead>
            <tbody>
              {scales.map((s) => (
                <tr key={s.key}><th scope="row">{SCALE_NAME[s.key] ?? s.key}</th><td>{s.low}</td><td>{s.high}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ux-pers-tw">
          <table className="ux-pers-table" data-testid="pers-map">
            <caption>{`The ${results.length} possible results`}</caption>
            <thead><tr><th scope="col">Result</th><th scope="col">Your answers lean toward</th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}><th scope="row">{r.name}</th><td>{r.traits.join(', ')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {common ? (
        <section className="ux-sec" aria-labelledby="pers-common-h" data-testid="pers-common">
          <SectionHeader id="pers-common-h" title="Most common result" icon="grid" />
          <div className="g3-prose">
            {mostCommonText(group.name, common).map((p) => <p key={p}>{p}</p>)}
          </div>
        </section>
      ) : null}

      <section className="ux-sec" aria-labelledby="pers-more-h" data-testid="pers-more">
        <SectionHeader id="pers-more-h" title={`More ${group.name} games`} icon="layers" />
        <ul className="g3-links">
          {games.map((l) => (
            <li key={l.href}><Link href={l.href} className="ux-lnk">{l.label}</Link> <span className="ux-muted">{l.line}</span></li>
          ))}
        </ul>
      </section>

      {others.length > 0 ? (
        <section className="ux-sec" aria-labelledby="pers-other-h">
          <SectionHeader id="pers-other-h" title={`Which ${w.member} are you, for another ${w.topic}`} icon="users" />
          <ul className="g3-links">
            {others.map((s) => <li key={s}><Link href={pathFor(s)} className="ux-lnk">Which {names.get(s)}{` ${w.member} are you?`}</Link></li>)}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** Run O1 (PERS-2): the Which character are you block of the anime page, the layout it had before the kpop page grew its sourced sections. */
function SeriesAbout({ group, view, wmaSlugs, names, words, pathFor = whichMemberPath }: WmaAboutProps): React.ReactElement {
  const w = { ...KPOP_WORDS, ...words };
  const results = view.results;
  const top = topResults(view.distribution);
  const links: Array<{ href: string; label: string }> = [];
  if ((NAME_ALL_GROUPS as readonly string[]).includes(group.slug)) links.push({ href: prettyPath(group.slug), label: `Name all ${group.name} members` });
  const others = wmaSlugs.filter((s) => s !== group.slug && names.has(s)).sort((a, b) => names.get(a)!.localeCompare(names.get(b)!, 'en'));

  return (
    <>
      <section className="ux-sec" aria-labelledby="pers-res-h">
        <SectionHeader id="pers-res-h" title={`The ${results.length} possible results`} icon="users" />
        <div className="g3-prose">
          <p>
            Each answer moves you along a few personality axes, and your result is the {group.name}{` ${w.member} whose profile is closest. There are no right answers and no timer: answer for yourself, not for your ${w.bias}.`}
          </p>
          {top.length > 0 && view.distribution ? (
            <p data-testid="pers-top">
              Across {view.distribution.total.toLocaleString('en-US')} results so far, the most common {top.length === 1 ? 'one is' : 'are'}{' '}
              {top.map((r) => `${r.label} (${r.pct}%)`).join(', ')}.
            </p>
          ) : null}
        </div>
        <details className="g3-acc">
          <summary>See every result<Icon name="chev" /></summary>
          <ul className="g3-lineup g3-results">
            {results.map((r) => (
              <li key={r.id}>
                <b>{r.name}</b> <span className="ux-muted">· {r.role}</span>
                <p>{r.description}</p>
                {r.traits.length > 0 ? <p className="ux-muted">{r.traits.join(', ')}</p> : null}
              </li>
            ))}
          </ul>
        </details>
      </section>

      {links.length > 0 ? (
        <section className="ux-sec" aria-labelledby="pers-more-h">
          <SectionHeader id="pers-more-h" title={`More ${group.name} games`} icon="layers" />
          <ul className="g3-links">
            {links.map((l) => <li key={l.href}><Link href={l.href} className="ux-lnk">{l.label}</Link></li>)}
          </ul>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="ux-sec" aria-labelledby="pers-other-h">
          <SectionHeader id="pers-other-h" title={`Which ${w.member} are you, for another ${w.topic}`} icon="users" />
          <ul className="g3-links">
            {others.map((s) => <li key={s}><Link href={pathFor(s)} className="ux-lnk">Which {names.get(s)}{` ${w.member} are you?`}</Link></li>)}
          </ul>
        </section>
      ) : null}
    </>
  );
}
