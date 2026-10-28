import { BASE_PATH } from '@/lib/site/client-base-path';

/** The site's own avatar, for what KpopQuiz itself posts (the daily debate): the
 *  rabbit of the brand mark (UxBrand), never a "K" initial (owner, 2026-10-06).
 *  FandomVerse: the address a browser requests, so under /anime on the anime build
 *  ('/mascot/mascot-default.png' on kpop and the hub). Prefixed here, once: its users
 *  (feed-card, post-view, the home's community rows) pass it on as it is. */
export const SITE_AVATAR_SRC = `${BASE_PATH}/mascot/mascot-default.png`;
