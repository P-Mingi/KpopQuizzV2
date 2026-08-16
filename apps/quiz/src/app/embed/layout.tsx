import { ToastProvider } from '@/components/ui/toast-provider';

import type { Metadata } from 'next';

// W4 - the embed shell (spec section 4). Deliberately NOT the app layout: no TopNav,
// no Footer, no MobileTabBar. An iframe should carry the quiz and nothing else, so the
// partner's page is not asked to host our navigation.
//
// The background is transparent so the widget takes the colour of the page it sits in.
export const metadata: Metadata = {
  // Every embed URL is a duplicate of a real quiz page, so none of them may be
  // indexed. `follow` stays on: we want the links inside them followed.
  robots: { index: false, follow: true },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="embed-root">
      {/* QuizPlayer raises toasts; the provider comes along so the player can be
          reused as-is rather than forked into a near-copy that drifts. */}
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
