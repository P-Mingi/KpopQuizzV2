// Run O1, lot (b), P1 (rule 18): the settings screen of a world site is the shared kpop screen
// (components/profile/ux-v1/settings) with its `world` prop; this name only fixes the prop as required.
import { UxSettings } from '@/components/profile/ux-v1/settings';

import type { SettingsWorld } from '@/lib/passport-ui/settings-world';

export function UxWorldSettings({ world }: { world: SettingsWorld }): React.ReactElement {
  return <UxSettings world={world} />;
}
