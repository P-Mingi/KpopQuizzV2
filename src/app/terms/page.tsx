import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for KpopQuiz - a fan-powered K-pop quiz platform.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/terms' },
};

export default function TermsPage(): React.ReactElement {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-medium mb-2">Terms of Service</h1>
      <p className="text-sm text-txt-secondary mb-8">Last updated: March 27, 2026</p>

      <p className="text-sm text-txt-secondary leading-relaxed">
        Welcome to KpopQuiz (kpopquiz.org). By using our platform, you agree to these terms.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">1. What KpopQuiz is</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        KpopQuiz is a free, fan-powered platform where users can create, play, and share K-pop trivia
        quizzes. We are not affiliated with any K-pop artist, entertainment company, or music label.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">2. Your account</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        You can sign in using Google or Discord. You are responsible for your account activity. You must
        be at least 13 years old to use KpopQuiz. If you are under 18, you confirm you have parental or
        guardian consent.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">3. Content you create</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        When you create a quiz on KpopQuiz, you retain ownership of your original content. However, by
        publishing a quiz, you grant KpopQuiz a worldwide, non-exclusive, royalty-free license to display,
        distribute, and promote your quiz on the platform and in marketing materials (such as social media
        posts and Open Graph previews).
      </p>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">You agree not to create quizzes that:</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Contain false or deliberately misleading information</li>
        <li>Include hate speech, harassment, or discriminatory content</li>
        <li>Contain sexually explicit or violent material</li>
        <li>Infringe on the intellectual property rights of others</li>
        <li>Spam or promote unrelated products or services</li>
        <li>Impersonate other users or public figures</li>
      </ul>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">
        We reserve the right to remove any content that violates these guidelines and to suspend or ban
        accounts that repeatedly violate them.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">4. Playing quizzes</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        Playing quizzes is free and does not require an account. Creating quizzes, liking, and earning XP
        require a free account. We do not charge for any features.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">5. User conduct</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">You agree not to:</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Attempt to manipulate play counts, likes, or XP through automated tools or fake accounts</li>
        <li>Exploit bugs or vulnerabilities in the platform</li>
        <li>Scrape or bulk-download quiz content</li>
        <li>Use the platform for commercial purposes without permission</li>
        <li>Harass other users</li>
      </ul>

      <h2 className="text-lg font-medium mt-8 mb-3">6. Intellectual property</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        K-pop group names, logos, member names, and song titles referenced in quizzes are the property of
        their respective owners. KpopQuiz uses these references under fair use for fan-created trivia
        content. We do not claim ownership of any third-party intellectual property.
      </p>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">
        If you believe content on KpopQuiz infringes your intellectual property, please contact us and we
        will investigate promptly.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">7. Moderation</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        We moderate content to maintain quality and safety. We may remove quizzes, edit content, or ban
        users at our discretion. Moderation decisions are final.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">8. Availability</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        KpopQuiz is provided &quot;as is&quot; without guarantees of uptime or availability. We may modify,
        suspend, or discontinue any part of the service at any time.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">9. Limitation of liability</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        KpopQuiz is a free, community-driven platform. We are not liable for any damages arising from your
        use of the platform, including but not limited to incorrect quiz answers, account issues, or service
        interruptions.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">10. Changes to these terms</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        We may update these terms from time to time. Continued use of KpopQuiz after changes constitutes
        acceptance of the updated terms. We will indicate the date of the last update at the top of this
        page.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">11. Contact</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        For questions about these terms, reach out to us at{' '}
        <a href="mailto:contact@kpopquiz.org" className="text-txt-primary underline hover:no-underline">
          contact@kpopquiz.org
        </a>
        .
      </p>
    </div>
  );
}
