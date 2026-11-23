// Site switcher in the bars the hub draws itself (the home's and the daily games'; the shell's bar has its own call, ux-shell.tsx). Server component:
// the model is read on the server (lib/site-switch/model.ts, same gate as the other sites), the button and its panel are the client component of the
// other sites. Where it shows, the switcher IS the brand (logo, name, chevron); the page still reaches Home through the tabs and the phone tab bar.
// With no model (never on the hub build) the caller keeps its own logo link.
// The French pages (the daily games under /fr) pass locale 'fr': the menu speaks French there.
import { SiteSwitch } from '@/components/site-switch/site-switch';
import { siteSwitch } from '@/lib/site-switch/model';

import type { SwitchLocale } from '@/components/site-switch/site-switch';

export function HubSiteSwitch({ fallback, locale = 'en' }: { fallback: React.ReactElement; locale?: SwitchLocale }): React.ReactElement {
  const model = siteSwitch();
  return model ? <SiteSwitch model={model} locale={locale} /> : fallback;
}
