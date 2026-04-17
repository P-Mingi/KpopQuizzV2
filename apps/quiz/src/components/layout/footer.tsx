import Link from 'next/link';
import { REDDIT_URL, REDDIT_LABEL } from '@kpopquiz/shared/social-links';

export function Footer(): React.ReactElement {
  return (
    <footer className="relative z-10 border-t border-default">
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-sm font-medium text-primary">kpopquiz.org</p>
        <p className="text-xs text-secondary mt-0.5">
          Made with ♥ by fans, for fans.
        </p>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Link href="/trending" className="text-xs text-secondary hover:text-primary transition-colors">
            Trending
          </Link>
          <Link href="/new" className="text-xs text-secondary hover:text-primary transition-colors">
            New
          </Link>
          <Link href="/most-liked" className="text-xs text-secondary hover:text-primary transition-colors">
            Most liked
          </Link>
          <Link href="/terms" className="text-xs text-secondary hover:text-primary transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-xs text-secondary hover:text-primary transition-colors">
            Privacy
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-xs text-tertiary">Community:</span>
          <a
            href={REDDIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.49 10.354a1.55 1.55 0 0 1 .01.175c0 2.677-3.117 4.847-6.962 4.847-3.845 0-6.962-2.17-6.962-4.847 0-.06.003-.12.01-.175a1.178 1.178 0 0 1-.315-.806 1.19 1.19 0 0 1 2.024-.843c.98-.629 2.315-1.032 3.797-1.078l.748-3.295a.24.24 0 0 1 .285-.18l2.321.487a.83.83 0 1 1-.083.475l-2.07-.435-.664 2.923c1.457.06 2.768.462 3.736 1.082a1.19 1.19 0 1 1 1.709 1.648 4.626 4.626 0 0 1 .01.175c0 .002 0 .005-.001.007a1.19 1.19 0 0 1-.594-.978zm-9.028 0a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0zm5.283 1.658c-.493.493-1.55.668-1.757.668-.208 0-1.27-.178-1.758-.668a.196.196 0 0 0-.277.277c.62.62 1.799.84 2.035.84.237 0 1.41-.22 2.034-.84a.196.196 0 0 0-.277-.277zm-.11-1.063a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0z" />
            </svg>
            {REDDIT_LABEL}
          </a>
        </div>

        <a
          href="https://kpopblindtest.com?utm_source=quiz&utm_medium=crosslink"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-secondary hover:text-[#D4537E] transition-colors mt-4 inline-block"
        >
          Blindtest on kpopblindtest.com
        </a>

        <p className="text-xs text-tertiary mt-4">
          &copy; 2026 KpopQuiz
        </p>
      </div>
    </footer>
  );
}
