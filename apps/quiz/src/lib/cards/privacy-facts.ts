// Launch polish, lane LEGAL: the numbers the privacy policy and the terms print about KpopCards, in one place, so the copy never types them.
// Each one is the number the SQL or the code of KpopCards decides; privacy-facts.test.ts reads the SQL files and the code and fails when
// one of them moves. Pure (no import but rules.ts, which only imports types), so lib/site/hub/copy.ts can read it without a server module.
import { QUIET_HOURS } from './rules';

export const CARDS_PRIVACY_FACTS = {
  /** A friend code works once and ends after this many hours (112-social.sql, cards_friend_code_new). */
  friendCodeHours: 24,
  /** The most friends one player can have (112-social.sql, cards_friend_redeem). */
  maxFriends: 100,
  /** The most push subscriptions one player keeps, the oldest goes (108-push.sql, cards_push_upsert). */
  maxPush: 5,
  /** The claims of the demo pack are deleted after this many days, the IP hash with them (106-demo.sql, cards_demo_claim). */
  demoClaimDays: 7,
  /** A reported photo leaves the game within this many hours (the promise of the report form, components/cards/report-form.tsx). */
  removalHours: 48,
  /** Nothing is pushed from this Paris hour up to the other one, 22:00 to 08:00 (rules.ts QUIET_HOURS). */
  quietFrom: QUIET_HOURS.from,
  quietTo: QUIET_HOURS.to,
} as const;
