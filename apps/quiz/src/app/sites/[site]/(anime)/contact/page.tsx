// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/contact/page.tsx, rows 26c: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the OtakuQuiz team. Questions, feedback, or a quiz idea? Email us or join the community on Reddit.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage(): React.ReactElement {
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
