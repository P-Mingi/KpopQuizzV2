'use client';

import { useEffect } from 'react';

// W4 - the auto-resize handshake (spec section 5).
//
// The partner cannot know how tall a quiz is, and a guessed height either clips the
// content or leaves dead space. The child measures itself and tells the parent; the
// snippet's 6-line listener sets the height. No third-party resizer library is pulled
// into anyone's page.
//
// We post to '*' because we cannot know the partner's origin, and the message carries
// nothing sensitive (a number). The PARENT half verifies our origin before acting,
// which is the direction that matters: it stops a random frame from resizing their box.
export function EmbedResizer(): null {
  useEffect(() => {
    // Measure the CONTENT element, not documentElement. The first version measured
    // document.documentElement.scrollHeight and reported 33,482px into the partner's
    // page: html/body inherit app-wide min-heights, and once the parent applied the
    // height the child grew again, so each observation fed the next. Measuring the
    // embed's own box breaks that loop at the source, and the change guard below stops
    // any residual jitter from becoming a message storm.
    let last = 0;
    const post = (): void => {
      const el = document.querySelector('.embed-page');
      const h = Math.ceil(el ? el.getBoundingClientRect().height : document.body.scrollHeight);
      if (h <= 0 || Math.abs(h - last) < 2) return;
      last = h;
      try {
        window.parent.postMessage({ type: 'kpopquiz:resize', height: h }, '*');
      } catch {
        // Not framed, or the parent is gone. The page still works standalone.
      }
    };

    post();
    const target = document.querySelector('.embed-page') ?? document.body;
    const ro = new ResizeObserver(post);
    ro.observe(target);
    window.addEventListener('load', post);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', post);
    };
  }, []);

  return null;
}
