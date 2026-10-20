// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/settings/page.tsx, rows 18, H-5. On anime the page is the shared UxSettings
// (components/profile/ux-v1/settings) with the world prop of this site: the series and oshi sections, the account rows (the
// network passport, sign out here, sign out everywhere), the presentation of this site saved on the membership. Any other
// site that carries this file (the hub, until H-5 is built) keeps the kpop page it has always rendered.
import KpopSettingsPage from '@/app/(site)/settings/page';
import { UxSettings } from '@/components/profile/ux-v1/settings';
import { settingsWorld } from '@/lib/passport-ui/settings-world';
import { SITE } from '@/lib/site/registry';

import type { Metadata } from 'next';

export function generateMetadata(): Metadata {
  return { title: `Settings | ${SITE.brand.name}`, robots: { index: false, follow: true } };
}

export default function SettingsPage(): React.ReactElement {
  const world = SITE.id === 'anime' ? settingsWorld(SITE.id) : undefined;
  return world ? <UxSettings world={world} /> : <KpopSettingsPage />;
}
