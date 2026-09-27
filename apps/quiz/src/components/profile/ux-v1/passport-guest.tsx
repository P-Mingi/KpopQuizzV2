import Link from 'next/link';

import { UxPage } from '@/components/ux-v1/page';
import { Icon } from '@/components/ux-v1/icon';
import { Mascot } from '@/components/ui/mascot';

import { PassportGuestSignIn } from './guest-islands';

/** Where "Play a quiz first" goes: today's daily quiz (/daily redirects to it, or to
 *  /quizzes when there is none). The same target as every "play the daily" link. */
export const GUEST_PLAY_HREF = '/daily';

/**
 * The passport for a signed-out fan (prototype view "you" with body.guest:
 * `#you section[data-auth=out]`): the mascot, "Your K-pop passport", the lead,
 * Sign in (A0's sign-in sheet, back to /me after sign-in) and "Play a quiz first".
 * Server component, no data read: /me renders it (flag on) instead of redirecting
 * a guest to the legacy /login page.
 */
export function UxPassportGuest(): React.ReactElement {
  return (
    <UxPage width="wide" className="p10-guest">
      <section className="p10-gst" aria-labelledby="p10-gst-h">
        <Mascot variant="celebrate" size={96} alt="" className="p10-gst-msc" priority />
        <h1 id="p10-gst-h" className="ux-h1 p10-gst-h">Your K-pop passport</h1>
        <p className="p10-gst-lead">Keep your scores, streak, badges and rank title in one place. Free, and no password: sign in with Google, Discord or an email link.</p>
        <div className="p10-gst-acts">
          <PassportGuestSignIn />
          {/* A0's text link (.ux-lnk + trailing icon); no prefetch: /daily is a redirect route that reads the database */}
          <Link href={GUEST_PLAY_HREF} prefetch={false} className="ux-lnk">Play a quiz first<Icon name="arrow" /></Link>
        </div>
      </section>
    </UxPage>
  );
}
