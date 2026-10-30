// Run O1, lot (e), lane B7: the sign-in emails of bunnyverse.org/anime (copy-keys.md 3, namespace anime.b7). Placeholders {brand},
// {network} and {domain} are filled by the renderer (lib/passport/email/render.ts) from the registry brand. The same keys and
// values live in supabase/functions/send-email/copy/anime.ts, which runs outside Next; email.copy.test.ts keeps the two equal.
export const COPY = {
  'email.magicLink.subject': 'Your {brand} link to sign in',
  'email.magicLink.heading': 'Sign in to {brand}',
  'email.magicLink.button': 'Sign in',
  'email.signup.subject': 'Confirm your {brand} account',
  'email.signup.heading': 'Welcome to {brand}',
  'email.signup.button': 'Confirm my email',
  'email.emailChange.subject': 'Confirm your new email for {brand}',
  'email.emailChange.heading': 'Confirm your new email address',
  'email.emailChange.button': 'Confirm this address',
  'email.reauth.subject': 'Your {brand} confirmation code',
  'email.reauth.heading': 'Enter this code to confirm it is you',
  'email.ignore': 'If you did not ask for this email, you can ignore it. Nothing happens until the link or the code is used.',
  'email.footerNetwork': '{brand} is part of the {network} network of fan quiz sites.',
  'email.footerPrivacy': 'Privacy',
} as const satisfies Readonly<Record<string, string>>;
