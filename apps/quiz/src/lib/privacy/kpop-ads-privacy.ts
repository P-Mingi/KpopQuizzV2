// Integrator, lot LAUNCH-POLISH-2 E (2026-11-23): kpopquiz.org gets ready for Google AdSense (no ad slot yet). The Advertising section says the
// same as the hub's (copy/hub/h1.ts, privacy.ads.*): AdSense, the consent of Google's certified tool, personalised ads only with consent, never
// for a player known to be under 18, cookies. A test keeps the shared sentences equal to the hub's (kpop-ads-privacy.test.ts). Read by app/(site)/privacy/page.tsx.
export const KPOP_ADS_PRIVACY = {
  p1: 'kpopquiz.org may show ads from Google AdSense. No ad runs on the site today; this section says what happens once one does.',
  p2: 'Where ads run, Google and its partners can set cookies or use identifiers on your device to show ads, to measure them, to limit how often you see one and to remember your consent choice. Those cookies are Google\'s, not ours, and their names can change. Google explains what it does in its own privacy policy.',
  p3: 'In the European Economic Area, the United Kingdom and Switzerland, and when we cannot tell where you are, no ad is requested before you answer a consent message. The message comes from Google\'s certified consent tool and follows the IAB Transparency and Consent Framework (TCF). If you refuse, no ad is requested.',
  p4: 'Personalised ads are shown only with your consent. Without it, ads are not personalised: Google picks them from the page, not from your history.',
  p5: 'No ad request is marked as child directed for a whole country, nor for visitors whose country we cannot tell.',
  p6: 'We do not ask your age. We never ask for personalised ads for a player we know to be under 18.',
} as const;
