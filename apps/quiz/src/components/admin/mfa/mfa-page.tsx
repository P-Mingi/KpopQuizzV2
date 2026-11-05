// ADMIN-1 (owner, 2026-10-30): the body of the two TOTP pages (app/(site)/admin/k7q2m/code and setup, and their anime twins). Only a
// listed admin whose session the auth server verifies reaches it (requireAdmin('mfa')); everyone else gets the 404 of the site. An
// admin already at aal2 goes on to /admin; an admin on the wrong step is sent to the right one.
// ADMIN-2: behind the secret door of the hub (`door` is what requireAdminDoor() returned) the pages are the ones under the secret address and
// the admin returns to the address they asked for; the code is also asked again 12 hours after the last one, at aal2.
import { notFound, redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/admin/guard';
import { adminPathsFor } from '@/lib/admin/paths';

import { MfaCodeForm, MfaSetupForm } from './mfa-forms';

import type { AdminDoor } from '@/lib/admin/door-guard';

const STEPS = {
  code: {
    level: 'challenge',
    title: 'Admin code',
    intro: 'Type the 6-digit code from your authenticator app to open the admin.',
  },
  setup: {
    level: 'enrol',
    title: 'Turn on the admin code',
    intro: 'The admin now asks for a 6-digit code from an authenticator app after you sign in. Set it up once, here.',
  },
} as const;

export async function AdminMfaPage({ step, door }: { step: keyof typeof STEPS; door?: AdminDoor }): Promise<React.ReactElement> {
  const admin = await requireAdmin('mfa');
  if (!admin) notFound();
  const paths = adminPathsFor(door?.prefix ?? null);
  if (admin.level === 'pass') redirect(door?.next ?? paths.home);
  if (admin.level !== STEPS[step].level) redirect(admin.level === 'challenge' ? paths.code : paths.setup);
  const { title, intro } = STEPS[step];
  return (
    <div style={{ maxWidth: 420, padding: '24px 0' }}>
      <h1 className="text-xl font-medium text-primary">{title}</h1>
      <p className="text-sm text-secondary mt-2 leading-relaxed">{intro}</p>
      {step === 'code' ? <MfaCodeForm home={paths.home} to={door?.next ?? null} /> : <MfaSetupForm home={paths.home} />}
    </div>
  );
}
