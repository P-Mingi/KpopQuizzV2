import Link from 'next/link';

import { discordInviteWithUtm } from '@kpopquiz/shared/social-links';
import { UxBrand } from '@/components/ux-v1/brand';
import { Icon } from '@/components/ux-v1/icon';
import { verseHidden } from '@/lib/verse/visibility';

import { UxFooterLocale, UxFooterTheme } from './ux-footer-controls';

import type { FooterCol } from '@/lib/ux-v1/a0/nav';

// Prototype footer (16.7: surface band, brand + Play / Explore / Community /
// Support + Top groups row, 2 columns on phones). The columns keep EVERY link the
// live footer has today (WIRING-MAP "Footer links", SEO: internal links are part
// of the served HTML) and add the prototype's; all are existing routes.
function columns(): FooterCol[] {
  return [
    { title: 'Play', links: [
      { label: 'Daily quiz', href: '/daily' },
      { label: 'Blindtest', href: '/blindtest' },
      { label: 'Ranked', href: '/blindtest/ranked' },
      { label: 'All quizzes', href: '/quizzes' },
      { label: 'Popular quizzes', href: '/quizzes/popular-this-week' },
      { label: 'Trivia', href: '/trivia' },
    ] },
    { title: 'Explore', links: [
      { label: 'Groups', href: '/groups' },
      { label: 'Trending', href: '/trending' },
      { label: 'New quizzes', href: '/new' },
      { label: 'Knowledge Report', href: '/data/knowledge-report-2026' },
      { label: 'Pulse', href: '/data/pulse' },
      { label: 'Stats', href: '/stats' },
      { label: 'Articles', href: '/articles' },
      { label: 'News', href: '/news' },
    ] },
    { title: 'Community', links: [
      { label: 'Feed', href: '/community' },
      { label: 'Leaderboard', href: '/leaderboard' },
      ...(verseHidden() ? [] : [{ label: 'Fandoms', href: '/verse' }]),
      { label: 'Create a quiz', href: '/create' },
      { label: 'Discord', href: discordInviteWithUtm('footer'), external: true },
      { label: 'Reddit', href: 'https://reddit.com/r/Kpop_Verse', external: true },
    ] },
    { title: 'Support', links: [
      { label: 'Help', href: '/faq' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'DMCA', href: '/dmca' },
    ] },
  ];
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

/** Site footer of the v11 shell. Server component; two tiny client islands
 *  (language link, theme switch). */
export function UxFooter(): React.ReactElement {
  const year = new Date().getFullYear();
  return (
    <footer className="ux-foot ux-chrome">
      <div className="ux-wrap">
        <div className="ux-fgrid">
          <div className="ux-fbrand">
            <UxBrand />
            <p>Free K-pop quizzes and blindtests, made by fans for fans.</p>
            <p>Made by fans <Icon name="heart" label="with love" /></p>
          </div>
          {columns().map((c) => (
            <div key={c.title} className="ux-fcol">
              <p className="ux-fcol-h">{c.title}</p>
              {c.links.map((l) => l.external
                ? <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                : <Link key={l.label} href={l.href}>{l.label}</Link>)}
            </div>
          ))}
        </div>
        <div className="ux-ftop">
          <b>Top groups</b>
          {TOP_GROUPS.map((g) => <Link key={g.slug} href={`/${g.slug}-quiz`}>{g.name}</Link>)}
          <Link href="/groups">All groups</Link>
        </div>
        <div className="ux-fbot">
          <span>© {year} KpopQuiz. Group photos belong to their owners.</span>
          <span className="ux-fbot-r"><UxFooterLocale /><UxFooterTheme /></span>
        </div>
      </div>
    </footer>
  );
}
