import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { prettyPath } from '@/lib/name-all/round';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { whichMemberPath } from '@/lib/personality/view';

import type { DistributionView, QuizView } from '@/lib/personality/view';

// The server-rendered part of a Which member are you page, below the quiz (owner,
// 2026-10-13: SEO). The quiz is a client island whose HTML holds a title, a lead and a
// Start button: about 70 words, the same on every group's page. This adds what only
// this group's page has, all real rows:
//   - the possible results (each member's public role, the profile it matches and its
//     traits), in a native <details> that starts closed, crawlable;
//   - the most common results among the saved ones, only above the quiz's own floor
//     (buildDistribution) and only the top three: a share is never printed to single
//     out the member fans get least (SYSTEM.md 5.1);
//   - the group's other pages and the other Which member are you pages.

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

export function WmaAbout({ group, view, wmaSlugs, names, words, pathFor = whichMemberPath }: WmaAboutProps): React.ReactElement {
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
