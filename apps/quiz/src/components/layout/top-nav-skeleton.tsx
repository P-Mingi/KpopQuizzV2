import { Logo } from './logo';

/**
 * Lightweight skeleton for TopNav shown while the async profile fetch streams in.
 * Matches the exact layout/height of TopNav so there's zero CLS.
 */
export function TopNavSkeleton(): React.ReactElement {
  return (
    <header className="sticky top-0 z-40 bg-primary border-b border-subtle">
      <nav className="h-12 md:h-12 flex items-center justify-between px-4 md:px-6 max-w-[960px] mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-subtle animate-pulse" />
        </div>
      </nav>
    </header>
  );
}
