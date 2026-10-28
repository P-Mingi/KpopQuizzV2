import Link from 'next/link';
import { notFound } from 'next/navigation';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { UxRow } from '@/components/ux-v1/panel';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { TextCard, TextCardGrid } from '@/components/ux-v1/text-card';
import { getGroupBySlug } from '@/lib/db/queries/groups';
import { formatContentMonth } from '@/lib/db/queries/group-freshness';
import { GENERAL_THEMES, themeBySlug } from '@/lib/hubs/general-themes';
import { buildThemeView, themeCounts } from '@/lib/hubs/theme-view';
import { SITE_ID } from '@/lib/site/registry';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { QUIZ_TYPE_ICON } from '@/lib/ux-v1/a0/icons';
import { getHubQuizzes } from '@/lib/ux-v1/p3/data';
import { CATCH_ALL_SLUG } from '@/lib/ux-v1/p3/model';
import { READ_FAILED, failClosed, failedReads, read, readAll } from '@/lib/ux-v1/p3/reads';
import { jsonLdScript } from '@/lib/verse/jsonld';

import type { Metadata } from 'next';
import type { ThemeView } from '@/lib/hubs/theme-view';
import type { HubQuiz } from '@/lib/ux-v1/p3/model';

// The 10 General K-pop theme pages (SEO strategy of 2026-10-27, phase 1, PR 15; plan:
// docs/seo/strategy-2026-10-27/THEMES-PLAN-2026-10-27.md). Server components only, on the v11 hub styles:
// crumbs, hero with the plan's intro, the quizzes by section (TextCard), "Also fits this topic", links to the
// pages that own related queries, the parent hub and the sibling themes, and a native <details> FAQ. Every
// number comes from the published quizzes of the category (lib/hubs/theme-view.ts). Kpop build only.

const SITE = 'https://kpopquiz.org';

/** The published General K-pop quizzes, read like the hub (fail closed: a failed read is served degraded). */
async function readCategory(where: string): Promise<HubQuiz[]> {
  const g = await readAll({ group: () => read(getGroupBySlug(CATCH_ALL_SLUG), `[${where}] category`) });
  if (g.group === READ_FAILED || !g.group) {
    await failClosed(where, failedReads(g));
    return [];
  }
  const groupId = g.group.id;
  const reads = await readAll({ quizzes: () => read(getHubQuizzes(groupId), `[${where}] quizzes`) });
  await failClosed(where, failedReads(reads));
  return reads.quizzes === READ_FAILED ? [] : reads.quizzes;
}

export async function themeMetadata(slug: string): Promise<Metadata> {
  const theme = themeBySlug(slug);
  if (!theme || SITE_ID !== 'kpop') return {};
  const view = buildThemeView(theme, await readCategory(slug));
  return {
    title: theme.title,
    description: theme.description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title: `${theme.title} | KpopQuiz`, description: theme.description, url: `/${slug}`, images: [DEFAULT_OG_IMAGE] },
    ...(view.indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

function faqs(v: ThemeView): Array<{ q: string; a: string }> {
  const { easy, medium, hard } = v.levels;
  const out = [
    {
      q: `How many quizzes are on the ${v.theme.h1} page?`,
      a: `${v.listed} free quizzes with ${v.questions} questions in all: ${easy} easy, ${medium} medium and ${hard} hard. The list starts with the easiest.`,
    },
    {
      q: 'Do I need a favorite group to play?',
      a: 'No. These quizzes mix many K-pop groups, so any fan can play them. For one group, open its own quiz page from the groups list.',
    },
  ];
  if (v.first) out.push({ q: 'Which quiz should I play first?', a: `Start with ${v.first.title}, the first quiz of the list, then go down the page.` });
  return out;
}

export async function renderThemePage(slug: string): Promise<React.ReactElement> {
  const theme = themeBySlug(slug);
  if (!theme || SITE_ID !== 'kpop') notFound();
  const published = await readCategory(slug);
  const v = buildThemeView(theme, published);
  const counts = themeCounts(new Set(published.map((q) => q.slug)));
  const siblings = GENERAL_THEMES.filter((t) => t.slug !== slug && (counts.get(t.slug) ?? 0) > 0);
  const updated = formatContentMonth(v.updated);
  const faqItems = faqs(v);
  const itemList = v.sections.flatMap((s) => s.quizzes);

  return (
    <UxPage width="wide" className="p3 p3-hub">
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Quizzes', item: `${SITE}/quizzes` },
          { '@type': 'ListItem', position: 3, name: 'General K-pop Quiz', item: `${SITE}/general-kpop-quiz` },
          { '@type': 'ListItem', position: 4, name: theme.h1 },
        ],
      })}
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: theme.h1,
        description: v.intro,
        url: `${SITE}/${slug}`,
        ...(v.updated ? { dateModified: v.updated.slice(0, 10) } : {}),
        isPartOf: { '@type': 'CollectionPage', url: `${SITE}/general-kpop-quiz` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: v.listed,
          itemListElement: itemList.map((q, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/q/${q.slug}`, name: q.title })),
        },
      })}
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      })}

      <nav className="ux-crumb p3-crumb" aria-label="Breadcrumb">
        <Link href="/quizzes">Quizzes</Link>
        <span className="p3-sep" aria-hidden="true">/</span>
        <Link href="/general-kpop-quiz">General K-pop</Link>
        <span className="p3-sep" aria-hidden="true">/</span>
        <span aria-current="page">{theme.h1}</span>
      </nav>

      <section className="p3-hero is-solo" aria-labelledby="p3-h1">
        <div className="p3-hero-main">
          <p className="p3-eyebrow">General K-pop</p>
          <h1 id="p3-h1" className="p3-h1"><span className="p3-h1-main">{theme.h1}</span></h1>
          <p className="p3-lead">{v.intro}</p>
          {v.first ? (
            <div className="p3-actions">
              <UxButton href={`/q/${v.first.slug}`} size="lg" icon="play">Play the first quiz</UxButton>
            </div>
          ) : null}
          <p className="p3-facts">
            <span><b className="ux-num">{v.listed}</b> {v.listed === 1 ? 'quiz' : 'quizzes'}</span>
            <span><b className="ux-num">{v.questions.toLocaleString('en-US')}</b> questions</span>
            {updated ? <span>Updated <b>{updated}</b></span> : null}
          </p>
        </div>
      </section>

      {v.sections.map((s, i) => (
        <section key={s.heading ?? i} className="ux-sec" aria-labelledby={`th-s${i}`}>
          <SectionHeader id={`th-s${i}`} title={s.heading ?? `All ${theme.h1.replace(/quiz$/, 'quizzes')}`} />
          <TextCardGrid>
            {s.quizzes.map((q) => (
              <TextCard key={q.slug} href={`/q/${q.slug}`} title={q.title} quizType={q.quizType} difficulty={q.difficulty} plays={q.plays} averagePct={q.averagePct} />
            ))}
          </TextCardGrid>
        </section>
      ))}

      {v.also.length > 0 ? (
        <section className="ux-sec" aria-labelledby="th-also">
          <SectionHeader id="th-also" title="Also fits this topic" />
          <div className="ux-rows">
            {v.also.map((q) => (
              <UxRow key={q.slug} href={`/q/${q.slug}`} lead={<span className="p3-rowico is-type"><Icon name={QUIZ_TYPE_ICON[q.quizType] ?? 't-classic'} /></span>} title={q.title} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="ux-sec" aria-labelledby="th-more">
        <SectionHeader id="th-more" title="More K-pop quizzes" />
        <p className="ux-muted">
          {theme.ownerLinks.map((l) => <span key={l.href}><Link href={l.href}>{l.anchor}</Link> · </span>)}
          <Link href="/">K-pop quiz</Link> · <Link href="/quizzes">all K-pop quizzes</Link> · <Link href="/general-kpop-quiz">all General K-pop quizzes</Link>
        </p>
        <div className="ux-rows">
          {siblings.map((t) => {
            const n = counts.get(t.slug) ?? 0;
            return <UxRow key={t.slug} href={`/${t.slug}`} lead={<span className="p3-rowico"><Icon name="t-classic" /></span>} title={t.h1} end={<span className="ux-num">{n} {n === 1 ? 'quiz' : 'quizzes'}</span>} />;
          })}
        </div>
      </section>

      <section className="p3-faq" aria-labelledby="th-faq">
        <h2 id="th-faq" className="ux-h2">Questions fans ask</h2>
        <div className="p3-accs">
          {faqItems.map((f, i) => (
            <details key={f.q} className="p3-acc" open={i === 0}>
              <summary><h3 className="p3-acc-q">{f.q}</h3><Icon name="chev" /></summary>
              <div className="p3-acc-a">{f.a}</div>
            </details>
          ))}
        </div>
      </section>
    </UxPage>
  );
}
