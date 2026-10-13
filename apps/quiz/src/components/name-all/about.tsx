import Link from 'next/link';

import { SectionHeader } from '@/components/ux-v1/section-header';
import { Icon } from '@/components/ux-v1/icon';
import { ROUND_SECONDS, prettyPath } from '@/lib/name-all/round';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { whichMemberPath } from '@/lib/personality/view';

import type { NameAllStats } from '@/lib/name-all/round';
import type { NameAllSet } from '@/lib/name-all/server';

// The server-rendered part of a Name them all page, below the game (owner, 2026-10-13:
// SEO). The game is a client island whose HTML holds a title, a sentence and eight "?"
// slots: about 60 words, the same on all 17 pages, which Google crawls and leaves out of
// its index. This adds what only this group's page has, all real rows:
//   - how fans do, only once STATS_MIN_ROUNDS rounds exist (positive aggregates only,
//     SYSTEM.md 5.1: never who is forgotten);
//   - the line-up with every accepted spelling, in a native <details> that starts
//     closed, the "Give up reveals the rest" of the game (spec 5.1) and crawlable;
//   - the group's other pages that exist, and the other Name them all pages.

export interface NameAllAboutProps {
  set: NameAllSet;
  stats: NameAllStats | null;
  /** Groups with a Which member are you page (getWmaGroupSlugs). */
  wmaSlugs: readonly string[];
  /** Groups with a playable blindtest. */
  blindtestSlugs: readonly string[];
  /** Display names by slug, for the other Name them all pages; a slug without one is left out. */
  names: ReadonlyMap<string, string>;
}

/** The spellings shown beside a member: the other accepted answers, the display name first removed. */
export function shownSpellings(name: string, spellings: readonly string[], max = 4): string[] {
  const seen = new Set([name.toLowerCase()]);
  const out: string[] = [];
  for (const s of spellings) {
    const t = s.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export function NameAllAbout({ set, stats, wmaSlugs, blindtestSlugs, names }: NameAllAboutProps): React.ReactElement {
  const { group, members } = set;
  const n = members.length;
  const links: Array<{ href: string; label: string }> = [{ href: `/${group.slug}-quiz`, label: `${group.name} quizzes` }];
  if (blindtestSlugs.includes(group.slug)) links.push({ href: `/blindtest/group-${group.slug}`, label: `${group.name} blind test` });
  if (wmaSlugs.includes(group.slug)) links.push({ href: whichMemberPath(group.slug), label: `Which ${group.name} member are you?` });
  const others = NAME_ALL_GROUPS.filter((s) => s !== group.slug && names.has(s));

  return (
    <>
      <section className="ux-sec" aria-labelledby="nta-how-h">
        <SectionHeader id="nta-how-h" title={`How to play the ${group.name} member quiz`} icon="clock" />
        <div className="g3-prose">
          <p>
            {group.name} has {n} members. Start the clock and type each name you remember, then press Enter: you have {ROUND_SECONDS} seconds to name all {n}.
            Stage names, birth names and Hangul are all accepted, and one typo is forgiven on a name of five letters or more. Give up at any time to see who you missed.
          </p>
          {stats ? (
            <p data-testid="nta-stats">
              Fans have played {stats.rounds.toLocaleString('en-US')} rounds of this quiz.
              {stats.perfectPct !== null ? ` ${stats.perfectPct}% of them named all ${n} members.` : null}
              {stats.namedFirst ? ` ${stats.namedFirst} is the member named first most often.` : null}
            </p>
          ) : null}
        </div>
      </section>

      <section className="ux-sec" aria-labelledby="nta-ans-h">
        <SectionHeader id="nta-ans-h" title={`The ${n} ${group.name} members`} icon="users" />
        <details className="g3-acc">
          <summary>Show the answers<Icon name="chev" /></summary>
          <ol className="g3-lineup">
            {members.map((m) => {
              const also = shownSpellings(m.name, m.spellings);
              return (
                <li key={m.name}>
                  <b>{m.name}</b>
                  {also.length > 0 ? <span className="ux-muted"> · also accepted: {also.join(', ')}</span> : null}
                </li>
              );
            })}
          </ol>
        </details>
      </section>

      <section className="ux-sec" aria-labelledby="nta-more-h">
        <SectionHeader id="nta-more-h" title={`More ${group.name} on KpopQuiz`} icon="layers" />
        <ul className="g3-links">
          {links.map((l) => <li key={l.href}><Link href={l.href} className="ux-lnk">{l.label}</Link></li>)}
        </ul>
      </section>

      {others.length > 0 ? (
        <section className="ux-sec" aria-labelledby="nta-other-h">
          <SectionHeader id="nta-other-h" title="Name the members of another group" icon="clock" />
          <ul className="g3-links">
            {others.map((s) => <li key={s}><Link href={prettyPath(s)} className="ux-lnk">Name all {names.get(s)} members</Link></li>)}
          </ul>
        </section>
      ) : null}
    </>
  );
}
