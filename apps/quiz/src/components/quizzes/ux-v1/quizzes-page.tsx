import Link from 'next/link';
import { Fragment } from 'react';

import { jsonLdScript } from '@/lib/verse/jsonld';
import { UxPage } from '@/components/ux-v1/page';
import { UxButton } from '@/components/ux-v1/button';
import { UxQuizCard } from '@/components/ux-v1/quiz-card';

import { P2Chip, P2Controls, P2NavLink, P2NavProvider, P2Results } from './islands';

import type { QuizCardData } from '@/lib/db/types';
import type { P2Filters } from '@/lib/ux-v1/p2/filters';
import type { P2LinkOption } from './controls';

export interface P2ChipData {
  key: string;
  label: string;
  href: string;
  /** Selector of the dropdown trigger that takes focus once the chip is gone. */
  focus: string;
}

export interface P2Empty {
  title: string;
  text: string;
  action: { href: string; label: string; focus?: string; reload?: boolean };
  /** Group with no quiz at all: offer to make the first one. */
  create?: boolean;
}

export interface P2QuizzesPageProps {
  /** The filters, with `page` = the last page shown (pages 1..page are on screen). */
  filters: P2Filters;
  /** A line above the grid (a ?page= past the end). */
  notice: string | null;
  /** The facet counts were read (false = the read failed: options without counts). */
  countsLive: boolean;
  filterKey: string;
  /** Live-region line once a new result is shown ("48 quizzes"). */
  summary: string;
  /** The page's H1 and intro: the live page's text (SEO lock). */
  h1: string;
  intro: string;
  crumbs: { label: string; href?: string }[];
  sort: P2LinkOption[];
  types: P2LinkOption[];
  levels: P2LinkOption[];
  groups: P2LinkOption[];
  chips: P2ChipData[];
  quizzes: QuizCardData[];
  empty: P2Empty | null;
  hasNext: boolean;
  pageCount: number | null;
  /** The FAQ (same source as the live page), shown on the unfiltered first page only. */
  faq: { q: string; a: React.ReactNode }[] | null;
  /** The live page's JSON-LD objects: BreadcrumbList, ItemList (when the page has
   *  quizzes), FAQPage (with the FAQ). Emitted through the escaping sink. */
  breadcrumbLd: Record<string, unknown>;
  itemListLd: Record<string, unknown> | null;
  faqLd: Record<string, unknown> | null;
}

/**
 * /quizzes, UX v11 (prototype state `quizzes`, DESIGN-SPEC 7, 16.7, 17.3, 17.11):
 * page header, sort + Type / Level / Group, removable chips, the photo grid (bordered
 * rows on phones), the empty state and real ?page=N pagination. Below the
 * prototype's content, the live page's SEO block keeps its links and FAQ.
 * Server component; the controls are small client islands (islands.tsx).
 */
export function P2QuizzesPage(p: P2QuizzesPageProps): React.ReactElement {
  return (
    <UxPage width="wide" className="p2-page">
      {jsonLdScript(p.breadcrumbLd)}
      <nav className="p2-crumb" aria-label="Breadcrumb">
        <ol className="ux-crumb">
          {p.crumbs.map((c, i) => (
            <li key={c.label}>
              {i > 0 ? <span className="p2-sep" aria-hidden="true">/</span> : null}
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </li>
          ))}
        </ol>
      </nav>

      <header className="ux-ph p2-ph">
        <div>
          <h1>{p.h1}</h1>
          <p>{p.intro}</p>
        </div>
        <UxButton variant="ghost" icon="plus" href="/create" className="p2-create">Create a quiz</UxButton>
      </header>

      <P2NavProvider filterKey={p.filterKey} summary={p.summary}>
        <P2Controls sort={p.sort} types={p.types} levels={p.levels} groups={p.groups} countsLive={p.countsLive} />

        {/* always rendered (an empty flex row keeps its 16px, as in the prototype) */}
        <div className="ux-chips p2-chips" {...(p.chips.length > 0 ? { role: 'group', 'aria-label': 'Active filters' } : {})}>
          {p.chips.map((c) => <P2Chip key={c.key} label={c.label} href={c.href} focus={c.focus} />)}
        </div>

        {p.notice ? <p className="p2-notice" role="status">{p.notice}</p> : null}

        {p.quizzes.length > 0 ? (
          <P2Results key={`${p.filterKey}#${p.filters.page}`} filters={p.filters} ids={p.quizzes.map((q) => q.id)} hasNext={p.hasNext} pageCount={p.pageCount}>
            {p.quizzes.map((q, i) => <UxQuizCard key={q.id} quiz={q} priority={i < 4} />)}
          </P2Results>
        ) : p.empty ? (
          <div className="ux-empty p2-empty" role="status">
            <b>{p.empty.title}</b>
            {p.empty.text}
            <div className="p2-empty-act">
              {p.empty.create ? <UxButton variant="ghost" href="/create" icon="plus">Make the first quiz</UxButton> : null}
              {p.empty.action.reload ? (
                <a href={p.empty.action.href} className="ux-btn ux-btn-ghost">{p.empty.action.label}</a>
              ) : (
                <P2NavLink href={p.empty.action.href} focus={p.empty.action.focus} className={`ux-btn ${p.empty.create ? 'ux-btn-quiet' : 'ux-btn-ghost'}`}>
                  {p.empty.action.label}
                </P2NavLink>
              )}
            </div>
          </div>
        ) : null}
      </P2NavProvider>

      {/* The live page's browse links (popular windows + the SEO landing views). */}
      <nav className="ux-sec p2-mesh" aria-label="More ways to browse">
        <p>
          <span className="p2-mesh-l">Popular</span>
          <Link href="/quizzes/popular-today">today</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/quizzes/popular-this-week">this week</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/quizzes/popular-this-month">this month</Link>
        </p>
        <p>
          <span className="p2-mesh-l">Browse</span>
          <Link href="/trending">trending</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/new">newest</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/most-liked">most liked</Link>
          <span aria-hidden="true"> · </span>
          {/* the live page searches in place; its search is the /search page here */}
          <Link href="/search">search</Link>
        </p>
      </nav>

      {p.faq ? (
        <section className="ux-sec p2-faq" aria-labelledby="quizzes-faq">
          <h2 id="quizzes-faq" className="ux-h2">K-pop quizzes: FAQ</h2>
          <dl>
            {p.faq.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {[p.itemListLd, p.faqLd].map((o, i) => (o ? <Fragment key={i}>{jsonLdScript(o)}</Fragment> : null))}
    </UxPage>
  );
}
