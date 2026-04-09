import Link from 'next/link';

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

        <p className="text-xs text-tertiary mt-4">
          &copy; 2026 KpopQuiz
        </p>
      </div>
    </footer>
  );
}
