import Link from 'next/link';

export function Footer(): React.ReactElement {
  return (
    <footer className="border-t border-border-light">
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-sm font-medium text-txt-primary">kpopquiz.org</p>
        <p className="text-xs text-txt-secondary mt-0.5">
          Made with ♥ by fans, for fans.
        </p>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Link href="/trending" className="text-xs text-txt-secondary hover:text-txt-primary transition-colors">
            Trending
          </Link>
          <Link href="/new" className="text-xs text-txt-secondary hover:text-txt-primary transition-colors">
            New
          </Link>
          <Link href="/most-liked" className="text-xs text-txt-secondary hover:text-txt-primary transition-colors">
            Most liked
          </Link>
          <Link href="#" className="text-xs text-txt-secondary hover:text-txt-primary transition-colors">
            Terms
          </Link>
          <Link href="#" className="text-xs text-txt-secondary hover:text-txt-primary transition-colors">
            Privacy
          </Link>
        </div>

        <p className="text-xs text-txt-tertiary mt-4">
          &copy; 2026 KpopQuizz
        </p>
      </div>
    </footer>
  );
}
