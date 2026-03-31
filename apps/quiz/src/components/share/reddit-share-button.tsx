interface RedditShareButtonProps {
  url: string;
  title: string;
  subreddit?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function RedditShareButton({
  url,
  title,
  subreddit = 'kpopquiz',
  label = 'Share on Reddit',
  className,
  compact = false,
}: RedditShareButtonProps): React.ReactElement {
  const href = `https://www.reddit.com/r/${subreddit}/submit?type=link&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className ?? 'inline-flex items-center gap-1 text-xs text-txt-secondary hover:text-[#FF4500] transition-colors'}
        title="Share on Reddit"
      >
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
          <path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.49 10.354a1.55 1.55 0 0 1 .01.175c0 2.677-3.117 4.847-6.962 4.847-3.845 0-6.962-2.17-6.962-4.847 0-.06.003-.12.01-.175a1.178 1.178 0 0 1-.315-.806 1.19 1.19 0 0 1 2.024-.843c.98-.629 2.315-1.032 3.797-1.078l.748-3.295a.24.24 0 0 1 .285-.18l2.321.487a.83.83 0 1 1-.083.475l-2.07-.435-.664 2.923c1.457.06 2.768.462 3.736 1.082a1.19 1.19 0 1 1 1.709 1.648 4.626 4.626 0 0 1 .01.175c0 .002 0 .005-.001.007a1.19 1.19 0 0 1-.594-.978zm-9.028 0a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0zm5.283 1.658c-.493.493-1.55.668-1.757.668-.208 0-1.27-.178-1.758-.668a.196.196 0 0 0-.277.277c.62.62 1.799.84 2.035.84.237 0 1.41-.22 2.034-.84a.196.196 0 0 0-.277-.277zm-.11-1.063a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0z" />
        </svg>
        Reddit
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? 'flex-1 py-3 rounded-full border border-border-light text-sm font-medium bg-surface-primary cursor-pointer hover:border-[#FF4500] hover:text-[#FF4500] transition-colors flex items-center justify-center gap-2'}
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.49 10.354a1.55 1.55 0 0 1 .01.175c0 2.677-3.117 4.847-6.962 4.847-3.845 0-6.962-2.17-6.962-4.847 0-.06.003-.12.01-.175a1.178 1.178 0 0 1-.315-.806 1.19 1.19 0 0 1 2.024-.843c.98-.629 2.315-1.032 3.797-1.078l.748-3.295a.24.24 0 0 1 .285-.18l2.321.487a.83.83 0 1 1-.083.475l-2.07-.435-.664 2.923c1.457.06 2.768.462 3.736 1.082a1.19 1.19 0 1 1 1.709 1.648 4.626 4.626 0 0 1 .01.175c0 .002 0 .005-.001.007a1.19 1.19 0 0 1-.594-.978zm-9.028 0a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0zm5.283 1.658c-.493.493-1.55.668-1.757.668-.208 0-1.27-.178-1.758-.668a.196.196 0 0 0-.277.277c.62.62 1.799.84 2.035.84.237 0 1.41-.22 2.034-.84a.196.196 0 0 0-.277-.277zm-.11-1.063a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0z" />
      </svg>
      {label}
    </a>
  );
}
