import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for KpopQuiz - how we collect, use, and protect your data.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage(): React.ReactElement {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-medium mb-2">Privacy Policy</h1>
      <p className="text-sm text-txt-secondary mb-8">Last updated: March 27, 2026</p>

      <p className="text-sm text-txt-secondary leading-relaxed">
        KpopQuiz (kpopquiz.org) respects your privacy. This policy explains what data we collect, how we
        use it, and your rights.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">1. What we collect</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        When you sign in with Google or Discord, we receive:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Your email address</li>
        <li>Your display name</li>
        <li>Your profile picture URL (if available)</li>
      </ul>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">
        We do not receive or store your Google or Discord password.
      </p>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">
        When you use KpopQuiz, we also collect:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Quizzes you create (questions, answers, settings)</li>
        <li>Quiz play records (score, time taken, date)</li>
        <li>Likes you give to quizzes</li>
        <li>Your username, display name, bio, and avatar URL (as set by you in Settings)</li>
        <li>Your XP, level, and badges (calculated from your activity)</li>
      </ul>

      <h2 className="text-lg font-medium mt-8 mb-3">2. How we use your data</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">We use your data to:</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Display your profile and quizzes to other users</li>
        <li>Calculate scores, rankings, XP, and leaderboards</li>
        <li>Show quiz statistics (play counts, average scores, pass rates)</li>
        <li>Generate Quiz of the Day selections</li>
        <li>Improve the platform and fix bugs</li>
      </ul>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">
        We do not sell, rent, or share your personal data with third parties for marketing purposes.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">3. Cookies and local storage</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">KpopQuiz uses:</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Authentication cookies (managed by Supabase) to keep you signed in</li>
        <li>No tracking cookies</li>
        <li>No third-party analytics cookies</li>
        <li>Local storage for UI preferences (such as dismissed banners)</li>
      </ul>

      <h2 className="text-lg font-medium mt-8 mb-3">4. Third-party services</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        We use the following third-party services:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Supabase (database and authentication) - stores your account and quiz data</li>
        <li>Vercel (hosting) - serves the website</li>
        <li>Google OAuth and Discord OAuth - for sign-in only</li>
      </ul>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">
        Each of these services has their own privacy policy. We encourage you to review them.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">5. Data visibility</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        By default, the following is publicly visible to all users:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Your username and display name</li>
        <li>Your avatar</li>
        <li>Quizzes you create</li>
        <li>Your XP level and badges</li>
        <li>Your play statistics</li>
      </ul>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">
        The following is private and never shared:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Your email address</li>
        <li>Your OAuth provider details</li>
        <li>Your specific play-by-play history on other users&apos; quizzes</li>
      </ul>

      <h2 className="text-lg font-medium mt-8 mb-3">6. Data retention</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        Your data is retained as long as your account is active. If you want to delete your account and all
        associated data, contact us at{' '}
        <a href="mailto:contact@kpopquiz.org" className="text-txt-primary underline hover:no-underline">
          contact@kpopquiz.org
        </a>{' '}
        and we will process your request within 30 days.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">7. Children&apos;s privacy</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        KpopQuiz is not directed at children under 13. If you are under 13, please do not create an
        account. If we learn that we have collected data from a child under 13, we will delete it promptly.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">8. Your rights</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        Depending on your location, you may have the right to:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-txt-secondary leading-relaxed mt-2">
        <li>Access the data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Object to certain uses of your data</li>
      </ul>
      <p className="text-sm text-txt-secondary leading-relaxed mt-3">
        To exercise these rights, contact us at{' '}
        <a href="mailto:contact@kpopquiz.org" className="text-txt-primary underline hover:no-underline">
          contact@kpopquiz.org
        </a>
        .
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">9. Security</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        We use industry-standard security practices including encrypted connections (HTTPS), secure
        authentication (OAuth 2.0), and row-level security on our database. However, no system is 100%
        secure, and we cannot guarantee absolute security.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">10. Changes to this policy</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        We may update this policy from time to time. Changes will be reflected by the &quot;Last
        updated&quot; date at the top of this page.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">11. Contact</h2>
      <p className="text-sm text-txt-secondary leading-relaxed">
        For privacy-related questions or data requests, contact us at{' '}
        <a href="mailto:contact@kpopquiz.org" className="text-txt-primary underline hover:no-underline">
          contact@kpopquiz.org
        </a>
        .
      </p>
    </div>
  );
}
