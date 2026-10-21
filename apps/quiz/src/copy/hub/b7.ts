// Run O1, lot (e), lane B7: the sign-in and deletion emails of fanquiz.org (copy-keys.md 3, namespace hub.b7). Placeholders
// {brand}, {network}, {domain} and {date} are filled by the renderer (lib/passport/email/render.ts). The same keys and values
// live in supabase/functions/send-email/copy/hub.ts, which runs outside Next; email.copy.test.ts keeps the two equal.
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
  'email.footerNetwork': '{brand} is the home of one account for the fan quiz sites.',
  'email.footerPrivacy': 'Privacy',
  'email.deletionScheduled.subject': 'Your {brand} passport will be deleted',
  'email.deletionScheduled.body': 'You asked to delete your passport. It will be deleted on {date}. Until then you can change your mind: sign in and cancel the deletion.',
  'email.deletionScheduled.cancel': 'Cancel the deletion',
} as const satisfies Readonly<Record<string, string>>;
