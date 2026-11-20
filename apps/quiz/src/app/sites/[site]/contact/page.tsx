// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/contact/page.tsx, rows 26c and the hub's: one page file at the root of app/sites/[site] for both sites (not in the (anime) or (hub)
// group: one path cannot have two files, as /credits and /legal). It dispatches on SITE_ID: anime keeps its page below, hub renders components/hub/legal/hub-legal-pages.tsx, any other build is a 404.
import { notFound } from 'next/navigation';

import { HubContact, hubContactMetadata } from '@/components/hub/legal/hub-legal-pages';
import { SITE_ID } from '@/lib/site/registry';
import type { Metadata } from 'next';

const animeMetadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the OtakuQuiz team. Questions, feedback, or a quiz idea? Email us or join the community on Reddit.',
  alternates: { canonical: '/contact' },
};

function AnimeContactPage(): React.ReactElement {
  return (
    <div className="py-8 max-w-xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Contact</h1>

      <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        
        Questions, feedback, or an idea for a quiz? We would love to hear from you.
        OtakuQuiz is made by fans, for fans, and we read every message.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Email
          </p>
          <a
            href="mailto:hello@kpopquiz.org"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            
            hello@kpopquiz.org
          </a>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Community
          </p>
          <a
            href="https://reddit.com/r/Kpop_Verse"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            r/Kpop_Verse on Reddit
          </a>
        </div>
      </div>
    </div>
  );
}

export function generateMetadata(): Metadata {
  if (SITE_ID === 'hub') return hubContactMetadata();
  if (SITE_ID !== 'anime') notFound();
  return animeMetadata;
}

export default function ContactPage(): React.ReactElement {
  if (SITE_ID === 'hub') return <HubContact />;
  if (SITE_ID !== 'anime') notFound();
  return <AnimeContactPage />;
}
