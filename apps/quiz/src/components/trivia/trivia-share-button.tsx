'use client';

import { useState } from 'react';

interface Props {
  url: string;
  title: string;
}

/**
 * Share affordance for the trivia page. Uses the Web Share API where available
 * (mobile / supported browsers), otherwise copies the canonical URL to the
 * clipboard and flips the label to a short confirmation. No data-layer access;
 * purely a presentation control over the page URL.
 */
export function TriviaShareButton({ url, title }: Props): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function handleShare(): Promise<void> {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: title, url });
      } catch {
        // User cancelled or share failed; nothing to do.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; leave the label unchanged.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="btn-outline trivia-share-btn"
      aria-label={`Share ${title}`}
    >
      {copied ? (
        <>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Link copied</span>
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="12" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M5.7 7l4.6-2.6M5.7 9l4.6 2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  );
}
