'use client';

import Link from 'next/link';

import { discordInviteWithUtm } from '@kpopquiz/shared/social-links';
import { UxBrand } from '@/components/ux-v1/brand';
import { Icon } from '@/components/ux-v1/icon';
import { SITE, SITE_ID } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';

import { UxFooterLocale, UxFooterTheme } from './ux-footer-controls';

import type { FooterCol } from '@/lib/ux-v1/a0/nav';

// Prototype footer (16.7: surface band, brand + Play / Explore / Community /
// Support + Top groups row, 2 columns on phones). The columns keep EVERY link the
// live footer has today (WIRING-MAP "Footer links", SEO: internal links are part
// of the served HTML) and add the prototype's; all are existing routes. Client
// component inside the lazily loaded shell; server-only facts arrive as props.
//
// Run O1: the footer follows the registry of the site of this build. On kpop every link below is
// shown, as today (the features are all on there and the route map is the kpop allowlist). On anime
// and hub a link is shown only when its feature is on AND the site's route map knows its path, and
// the K-pop-only parts (top groups, Discord, Reddit, the language switch, the brand and genre words)
// are left out.
type FooterLink = FooterCol['links'][number];
const F = SITE.features;
const KPOP = SITE_ID === 'kpop';
const FLAGS = { v1: true, v12: true } as const;

/** One internal link: shown when its feature is on and the site's route map has its path. */
function link(label: string, href: string, feature: boolean = true): FooterLink[] {
  return feature && (KPOP || isKnownRouteFor(SITE_ID, href, FLAGS)) ? [{ label, href }] : [];
}

/** One external link of the kpop community (the Discord server, r/Kpop_Verse): kpop only. */
function community(label: string, href: string): FooterLink[] {
  return KPOP ? [{ label, href, external: true }] : [];
}

const capitalize = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

function columns(showFandoms: boolean): FooterCol[] {
  return [
    { title: 'Play', links: [
      ...link('Daily quiz', '/daily', F.dailyQuiz),
      ...link('Blindtest', '/blindtest', F.blindTest),
      ...link('Ranked', '/blindtest/ranked', F.ranked),
      ...link('All quizzes', '/quizzes', F.quizzes),
      ...link('Popular quizzes', '/quizzes/popular-this-week', F.quizzes),
      ...link('Trivia', '/trivia', F.trivia),
    ] },
    { title: 'Explore', links: [
      ...link(capitalize(SITE.vocabulary.topicPlural), KPOP ? '/groups' : '/series', F.topicHubs),
      ...link('Trending', '/trending', F.quizzes),
      ...link('New quizzes', '/new', F.quizzes),
      ...link('Knowledge Report', '/data/knowledge-report-2026', F.dataPages),
      ...link('Pulse', '/data/pulse', F.mvPulse),
      ...link('Stats', '/stats', F.dataPages),
      ...link('Articles', '/articles', F.articles),
      ...link('News', '/news', F.news),
    ] },
    { title: 'Community', links: [
      ...link('Feed', '/community', F.community),
      ...link('Leaderboard', '/leaderboard', F.leaderboards),
      ...(showFandoms ? link('Fandoms', '/verse', F.verse) : []),
      ...link('Create a quiz', '/create', F.create),
      ...community('Discord', discordInviteWithUtm('footer')),
      ...community('Reddit', 'https://reddit.com/r/Kpop_Verse'),
    ] },
    { title: 'Support', links: [
      ...link('Help', '/faq'),
      ...link('About', '/about'),
      ...link('Editorial policy', '/editorial-policy'),
      ...link('Contact', '/contact'),
      ...link('Privacy', '/privacy'),
      ...link('Terms', '/terms'),
      ...link('DMCA', '/dmca'),
    ] },
  ].filter((c) => c.links.length > 0);
}

// Top groups row: the group hubs (real /{slug}-quiz pages), prototype order.
const TOP_GROUPS: { name: string; slug: string }[] = [
  { name: 'BTS', slug: 'bts' },
  { name: 'BLACKPINK', slug: 'blackpink' },
  { name: 'Stray Kids', slug: 'stray-kids' },
  { name: 'ATEEZ', slug: 'ateez' },
  { name: 'TWICE', slug: 'twice' },
  { name: 'aespa', slug: 'aespa' },
  { name: 'NewJeans', slug: 'newjeans' },
  { name: 'SEVENTEEN', slug: 'seventeen' },
];

// The two lines that carry the brand. Each is ONE string (one text node in the served HTML, as the literal it
// replaces on kpop): the registry brand name on anime and hub, today's lines on kpop.
const TAGLINE = KPOP
  ? 'Free K-pop quizzes and blindtests, made by fans for fans.'
  : `Free ${F.blindTest ? 'quizzes and blindtests' : 'quizzes'}, made by fans for fans.`;
const COPYRIGHT_TAIL = KPOP ? ' KpopQuiz. Group photos belong to their owners.' : ` ${SITE.brand.name}.`;

/** Site footer of the v11 shell. `showFandoms` = the Verse is public
 *  (lib/verse/visibility, server env); `year` from the server render. */
export function UxFooter({ showFandoms, year }: { showFandoms: boolean; year: number }): React.ReactElement {
  return (
    <footer className="ux-foot ux-chrome">
      <div className="ux-wrap">
        <div className="ux-fgrid">
          <div className="ux-fbrand">
            <UxBrand />
            <p>{TAGLINE}</p>
            <p>Made by fans <Icon name="heart" label="with love" /></p>
          </div>
          {columns(showFandoms).map((c) => (
            <div key={c.title} className="ux-fcol">
              <p className="ux-fcol-h">{c.title}</p>
              {c.links.map((l) => l.external
                ? <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                : <Link key={l.label} href={l.href}>{l.label}</Link>)}
            </div>
          ))}
        </div>
        {KPOP ? (
          <div className="ux-ftop">
            <b>Top groups</b>
            {TOP_GROUPS.map((g) => <Link key={g.slug} href={`/${g.slug}-quiz`}>{g.name}</Link>)}
            <Link href="/groups">All groups</Link>
          </div>
        ) : null}
        <div className="ux-fbot">
          <span>© {year}{COPYRIGHT_TAIL}</span>
          <span className="ux-fbot-r">{F.localizedLandings ? <UxFooterLocale /> : null}<UxFooterTheme /></span>
        </div>
      </div>
    </footer>
  );
}
