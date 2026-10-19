// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/editorial-policy/page.tsx, rows 25: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import Link from 'next/link';

import { jsonLdString } from '@/lib/seo/json-ld';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { CONTACT_EMAIL, FOUNDER, SITE_URL } from '@/lib/seo/org';

import { CORRECTIONS } from '@/app/(site)/editorial-policy/corrections';

import type { Metadata } from 'next';

// /editorial-policy (SEO Mission 1, owner 2026-10-14; rulebook sections 5 and 12): who makes
// what on kpopquiz.org, how it is moderated, which sources facts come from, how generations
// are labelled, how AI is used, and a dated log of corrections (#corrections). Server
// rendered, plain text, every link real. The corrections log is data (./corrections.ts).

export const metadata: Metadata = {
  title: 'Editorial Policy and Corrections',
  description: 'How otakuquiz.org makes and moderates anime quizzes, where facts come from, how generations are labelled, how AI is used, and a dated log of corrections.',
  alternates: { canonical: '/editorial-policy' },
  openGraph: {
    title: 'Editorial Policy and Corrections | OtakuQuiz',
    description: 'How otakuquiz.org makes and moderates anime quizzes, where facts come from, and a dated log of corrections.',
    url: '/editorial-policy',
    images: [DEFAULT_OG_IMAGE],
  },
};

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE_URL}/about` },
    { '@type': 'ListItem', position: 3, name: 'Editorial policy', item: `${SITE_URL}/editorial-policy` },
  ],
};

const H2 = 'mb-2 mt-8 text-lg font-bold text-[var(--text-primary)]';
const A = 'font-medium text-[var(--accent)] hover:underline';

export default function EditorialPolicyPage(): React.ReactElement {
  return (
    <div className="py-8 max-w-2xl mx-auto text-[15px] leading-relaxed text-[var(--text-secondary)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }} />
      <nav aria-label="Breadcrumb" className="text-[13px] text-[var(--text-tertiary)]">
        <Link href="/about" className={A}>About</Link> / Editorial policy
      </nav>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Editorial policy</h1>
      <p className="mt-3">
        
        otakuquiz.org publishes anime quizzes written by fans, and a few pages written by the site itself. This page says
        who creates what, how quizzes are moderated, which sources our facts come from, how we label anime generations,
        how we use AI, and how we correct mistakes. It is maintained by {FOUNDER.name}, the{' '}
        <Link href="/about" className={A}>founder</Link>.
      </p>

      <h2 className={H2}>Who creates the content?</h2>
      <p>
        Fans write the quizzes. Anyone with an account can create one, and the creator&apos;s name is shown on it. A few
        accounts are labelled <b>Team</b>: they publish quizzes and articles for the site, only through an editorial
        review, and they never post in community spaces as if they were fans. Articles and data pages carry the name of
        their author.
      </p>

      <h2 className={H2}>How are quizzes moderated?</h2>
      <p>
        Any player can report a quiz. A quiz is hidden from the site when 5 different signed-in accounts have reported it,
        and it stays hidden until it is reviewed. Pictures uploaded with a quiz are queued for a human review. We remove
        quizzes that break these rules; we do not rewrite a creator&apos;s questions.
      </p>

      <h2 className={H2}>Which sources do facts come from?</h2>
      <p>
        
        A fact on an indexable page needs a source, and the source link sits next to the fact. The sources we rely on
        are official series and label sites and their verified accounts, Wikidata, MusicBrainz and Wikipedia, with
        Circle Chart and Billboard for charts. News sites such as Soompi and allkpop are leads that we confirm elsewhere.
        Fan databases such as kprofiles and Fandom wikis are not sources: we never copy or cite them. Key facts (characters,
        debut date, label, fandom name) need two sources that agree; when they do not, we write a less precise sentence
        that is true.
      </p>

      <h2 className={H2}>How do we label anime generations?</h2>
      <p>
        
        A generation number is shown only when it is not disputed. When a named, reliable source describes a series as a
        given generation, we say so and credit it, for example &quot;commonly described as 5th generation&quot; with the
        source. When the label is debated, we say that it is debated, or call the series part of the newest wave. Every
        page reads the same data, so the site does not contradict itself.
      </p>

      <h2 className={H2}>How do we use AI?</h2>
      <p>
        AI tools can help draft articles and suggest quiz ideas. A person reviews and edits every draft before it is
        published. AI never supplies our numbers: counts of quizzes, songs, plays and scores come from the site&apos;s
        own records, rounded down so that a &quot;450+&quot; is always true.
      </p>

      <h2 className={H2}>What do we never publish?</h2>
      <p>
        
        Nothing about the private lives of artists: no dating, health, family or rumors. For characters who are minors, only
        their stage name and role. No song lyrics. No invented play counts, reviews or players.
      </p>

      <h2 className={H2}>Which images do we use?</h2>
      <p>
        Official assets, images under a Creative Commons licence with the credit shown, and our own visuals. Images
        uploaded by fans are reviewed. To ask for an image to be removed, write to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className={A}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 id="corrections" className={H2}>Corrections</h2>
      <p>
        When we find or are told about a mistake, we fix it and log it here with the date. To report one, write to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className={A}>{CONTACT_EMAIL}</a>.
      </p>
      <ol className="mt-3 space-y-3">
        {CORRECTIONS.map((c) => (
          <li key={`${c.date}-${c.what}`}>
            <b className="text-[var(--text-primary)]">{c.date}</b>
            {c.href ? <> · <Link href={c.href} className={A}>{c.page}</Link></> : <> · {c.page}</>}
            <span>: {c.what}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
