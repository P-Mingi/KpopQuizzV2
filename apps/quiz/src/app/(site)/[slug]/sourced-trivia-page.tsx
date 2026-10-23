import Link from 'next/link';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { GroupLogo } from '@/components/ui/group-logo';
import { TriviaShareButton } from '@/components/trivia/trivia-share-button';
import { getGroupBlindtestInfo } from '@/lib/db/queries/group-hub';
import { safeFetch } from '@/lib/error-handling';
import { jsonLdString } from '@/lib/seo/json-ld';
import { shownFacts } from '@/lib/trivia/sourced/store';
import {
  SITE_URL,
  levelSections,
  longDate,
  sourceList,
  sourcedTriviaAnswer,
  sourcedTriviaDescription,
  sourcedTriviaH1,
  sourcedTriviaJsonLd,
  sourcedTriviaTitle,
} from '@/lib/trivia/sourced/page-model';
import { liveHref } from '@/lib/ux-v1/p3/growth';
import { verseSpaceOpen } from '@/lib/ux-v1/p3/verse';
import { isUxV12 } from '@/lib/ux-v12';

import type { Metadata } from 'next';
import type { Group } from '@/lib/db/types';
import type { SourcedFact, SourcedTriviaFile } from '@/lib/trivia/sourced/types';

// SEO Mission 2, part E (owner, 2026-10-15): a -trivia page built from the sourced fact store
// (src/lib/trivia/sourced/<slug>.json) instead of fun facts pulled from fan-made quizzes. A
// question and answer bank in four banks (easy, medium, hard, chart records), every answer in
// the server HTML (blurred by CSS until a reader reveals it) with its source link next to it,
// then how to run a trivia game with friends. Only verified items render. Same URL, same
// canonical, one H1.

export function generateSourcedTriviaMetadata(group: Group, file: SourcedTriviaFile): Metadata {
  const count = shownFacts(file).length;
  const title = sourcedTriviaTitle(group.name, count);
  const description = sourcedTriviaDescription(group.name, count);
  const ogImage = `${SITE_URL}/api/og/group/${group.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/${group.slug}-trivia` },
    openGraph: {
      title: `${title} | KpopQuiz`,
      description,
      url: `${SITE_URL}/${group.slug}-trivia`,
      siteName: 'KpopQuiz',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${group.name} Trivia` }],
    },
    twitter: { card: 'summary_large_image', images: [ogImage] },
  };
}

function SourceLinks({ fact }: { fact: SourcedFact }): React.ReactElement {
  return (
    <p className="st-src">
      <span>{fact.sources.length > 1 ? 'Sources: ' : 'Source: '}</span>
      {fact.sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 ? ', ' : null}
          <a href={s.url} rel="noopener" target="_blank" title={s.title}>{s.publisher}</a>
        </span>
      ))}
    </p>
  );
}

export async function SourcedTriviaPage({ group, file }: { group: Group; file: SourcedTriviaFile }): Promise<React.ReactElement> {
  const blindtest = await safeFetch(getGroupBlindtestInfo(group.id), { qualifies: false, songs: 0 }, '[sourced-trivia] getGroupBlindtestInfo');

  const sections = levelSections(group.name, shownFacts(file));
  const answer = sourcedTriviaAnswer(group.name, sections, file.reviewed);
  const h1 = sourcedTriviaH1(group.name);
  const canonicalUrl = `${SITE_URL}/${group.slug}-trivia`;
  const sources = sourceList(sections.flatMap((s) => s.facts));
  // /live exists only with the v12 flag on (production); it plays the group's songs only when
  // they fill a round. Otherwise the step points to the group blind test, or the blind test hub.
  const live = isUxV12() && blindtest.qualifies;
  const songsHref = live ? liveHref(group.slug, group.name) : blindtest.qualifies ? `/blindtest/group-${group.slug}` : '/blindtest';

  return (
    <div className="trivia-page st-page">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: `${group.name} Quiz`, href: `/${group.slug}-quiz` },
          { label: `${group.name} Trivia` },
        ]}
      />

      <header className="trivia-hero">
        {group.logo_url && (
          <div className="trivia-hero-logo">
            <GroupLogo groupName={group.name} logoUrl={group.logo_url} displayColor={group.display_color} textColor={group.text_color} size={56} />
          </div>
        )}
        <h1 className="trivia-title">{h1}</h1>
        <p className="st-answer-block">{answer}</p>
        <p className="st-reviewed">
          Reviewed <time dateTime={file.reviewed}>{longDate(file.reviewed)}</time>
          {' · '}
          <Link href="/editorial-policy">How we check facts</Link>
        </p>
        <div className="trivia-share">
          <TriviaShareButton url={canonicalUrl} title={h1} />
        </div>
      </header>

      <nav className="st-toc" aria-label="On this page">
        <ul>
          {sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`}>{s.short}</a></li>
          ))}
          <li><a href="#how-to-play">How to play</a></li>
          <li><a href="#sources">Sources</a></li>
        </ul>
      </nav>

      <div className="st-banks">
        {/* CSS only: checked, every answer un-blurs. Each answer also un-blurs on hover,
            tap or keyboard focus. The answers are in the HTML either way. */}
        <input type="checkbox" id="st-reveal" className="st-reveal-input" />
        <label htmlFor="st-reveal" className="st-reveal-label">Show all answers</label>

        {sections.map((s) => (
          <section key={s.id} id={s.id} className="trivia-section st-bank" aria-labelledby={`${s.id}-title`}>
            <div className="trivia-section-head">
              <h2 id={`${s.id}-title`} className="trivia-section-title">{s.title}</h2>
              <span className="trivia-chip b-classic">{s.facts.length} questions</span>
            </div>
            <p className="st-bank-intro">{s.intro}</p>
            <ol className="st-list">
              {s.facts.map((f) => (
                <li key={f.id} id={f.id} className="st-item">
                  <h3 className="st-q">{f.question}</h3>
                  <div className="st-a" tabIndex={0}>
                    <p className="st-answer"><span className="st-answer-label">Answer: </span><strong>{f.answer}</strong></p>
                    <p className="st-text">{f.text}</p>
                    <SourceLinks fact={f} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section id="how-to-play" className="trivia-section st-howto" aria-labelledby="how-to-play-title">
        <h2 id="how-to-play-title" className="trivia-section-title">{`How to run a ${group.name} trivia game`}</h2>
        <p>
          Run a {group.name} trivia game in four steps: pick a host, play the easy, medium and hard rounds from this page,
          use the chart records as a bonus round, then finish with a round of {group.name} songs.
        </p>
        <ol className="st-steps">
          <li>
            <strong>Pick a host and a screen.</strong>{' '}The host reads each question aloud from this page, on a TV, laptop or
            phone. Answers stay blurred until someone taps them, or tick &quot;Show all answers&quot; to check them at the end.
          </li>
          <li>
            <strong>Play three rounds.</strong>{' '}Easy, then medium, then hard. A simple scoring: 1 point for an easy answer,
            2 for a medium one and 3 for a hard one.
          </li>
          <li>
            <strong>Add a bonus round.</strong>{' '}The records questions are about real chart history, a good tie breaker.
          </li>
          <li>
            <strong>Finish with music.</strong>{' '}
            {live ? (
              <>
                <Link href={songsHref}>Host a live {group.name} blind test</Link>: one screen plays the clips and everyone
                answers on their phone. No account is needed to join.
              </>
            ) : (
              <>
                Play the <Link href={songsHref}>{blindtest.qualifies ? `${group.name} blind test` : 'K-pop blind test'}</Link>{' '}
                together and guess each song from a short clip.
              </>
            )}
          </li>
        </ol>
        <p>
          Playing alone? Take a <Link href={`/${group.slug}-quiz`}>{group.name} quiz</Link>, or browse more{' '}
          <Link href="/trivia">K-pop trivia</Link>.
        </p>
      </section>

      <section id="sources" className="trivia-section st-sources" aria-labelledby="sources-title">
        <h2 id="sources-title" className="trivia-section-title">Sources</h2>
        <p>
          Every answer above links to its source. Key facts (members, debut date, label, fandom name) rest on two
          sources that agree, one of them official or Wikidata. Fan databases are never used.
        </p>
        <ul className="st-source-list">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} rel="noopener" target="_blank">{s.publisher}: {s.title}</a>
            </li>
          ))}
        </ul>
      </section>

      {verseSpaceOpen(group.slug) ? (
        <Link href={`/verse/${group.slug}`} className="trivia-entry mt-4">
          <span className="trivia-entry-text">
            <span className="trivia-entry-title">Explore the {group.fandom_name} space on Verse</span>
            <span className="trivia-entry-sub">Members, discography, timeline and community for {group.name}</span>
          </span>
        </Link>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(sourcedTriviaJsonLd({ name: group.name, slug: group.slug, file, sections, answer })) }}
      />
    </div>
  );
}
