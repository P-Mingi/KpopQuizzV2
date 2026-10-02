import { UxPage } from '@/components/ux-v1/page';

import { LivePhoneBody } from './phone';

/**
 * /join and /join/<code>: the phone of a live blindtest, full page. Focus shell
 * (no nav, no tab bar, no footer): on a phone the page is the game. One H1 for
 * the page (read by assistive tech; the visible title is the form's).
 */
export function LiveJoinPage({ code }: { code: string | null }): React.ReactElement {
  return (
    <UxPage width="full" padded={false} shell="focus" className="ux-live-joinpage">
      <div className="ux-live-join">
        <h1 className="ux-sr">Join a live blindtest</h1>
        <LivePhoneBody code={code} />
      </div>
    </UxPage>
  );
}

export const JOIN_DESCRIPTION = 'Join a live K-pop blindtest with the room code on the big screen. A nickname is enough, no account needed.';
