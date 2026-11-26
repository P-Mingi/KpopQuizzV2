'use client';

// KpopCards: the answer block under the H1 of /kpopcards (rulebook 3.1: 40 to 60 words, in the server HTML). It is for the signed-out visitor, and so for
// Googlebot and AI engines, who all get the same words in the same place. A signed-in player already knows the game and does not see it (owner request of
// 2026-11-25), so the header stays small. This is a view for a known visitor, not a different page for a crawler: every signed-out visitor reads it.
//
// No layout shift: the signed-in state is known only in the browser (the page is static, the lobby is read from /api/cards). The server HTML always holds the
// paragraph; a tiny script in front of it (CardsIntro) sets data-kc-in on <html> before the first paint when the browser holds a session cookie, and one CSS
// rule hides the paragraph then, so the lobby never moves. Once the wallet answers, this component takes over: it confirms the hint ('ready') or removes it
// ('guest'), and it leaves the DOM for a signed-in player.
import { useEffect } from 'react';

import { useCards } from './cards-provider';

export function KcAnswer({ children }: { children: React.ReactNode }): React.ReactElement | null {
  const { status } = useCards();
  useEffect(() => {
    const root = document.documentElement;
    if (status === 'ready') root.setAttribute('data-kc-in', '1');
    else if (status === 'guest') root.removeAttribute('data-kc-in');
  }, [status]);
  if (status === 'ready') return null;
  return <p className="lede" id="kc-answer">{children}</p>;
}
