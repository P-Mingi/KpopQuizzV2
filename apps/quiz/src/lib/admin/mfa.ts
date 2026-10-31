// ADMIN-1 (owner, 2026-10-30): the TOTP steps of the two MFA pages, on the admin's own server client (supabase.auth.mfa:
// listFactors, enroll, unenroll, challengeAndVerify). Called by app/api/admin/k7q2m/route.ts only, after requireAdmin('mfa')
// has verified the session and the listed id; each step also checks the level it is for. Nothing here reads ADMIN_USER_IDS,
// stores a secret or logs a code: the TOTP secret goes once to the admin's browser (QR code and text) and lives in Supabase.
import type { AdminMfaContext } from './guard';

export type MfaResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: 'bad_code' | 'wrong_code' | 'wrong_level' | 'no_factor' | 'failed' };

export interface SetupStart {
  readonly ok: true;
  readonly factorId: string;
  /** The QR code as Supabase returns it (an SVG data URL), for the authenticator app to scan. */
  readonly qr: string;
  /** The same secret as text, for an app or a password manager that cannot scan. */
  readonly secret: string;
}

const CODE_RE = /^[0-9]{6}$/;

/** The 6 digits of a typed code (spaces dropped), or null. */
export function cleanCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.replace(/\s+/g, '');
  return CODE_RE.test(code) ? code : null;
}

/** aal1 with a verified factor: the code of any verified TOTP factor lifts the session to aal2. */
export async function verifyCode(ctx: AdminMfaContext, raw: unknown): Promise<MfaResult> {
  if (ctx.level !== 'challenge') return { ok: false, error: 'wrong_level' };
  const code = cleanCode(raw);
  if (!code) return { ok: false, error: 'bad_code' };
  const { data, error } = await ctx.supabase.auth.mfa.listFactors();
  if (error || !data) return { ok: false, error: 'failed' };
  const factors = data.totp.filter((f) => f.status === 'verified');
  if (factors.length === 0) return { ok: false, error: 'no_factor' };
  for (const f of factors) {
    const r = await ctx.supabase.auth.mfa.challengeAndVerify({ factorId: f.id, code });
    if (!r.error) return { ok: true };
  }
  return { ok: false, error: 'wrong_code' };
}

/**
 * No verified factor, while enrolment is open (level 'enrol', lib/admin/guard.ts): a new TOTP factor. An unverified TOTP factor left by an abandoned setup is removed first (a
 * verified one is never touched here), so a reload starts clean.
 */
export async function startSetup(ctx: AdminMfaContext, issuer: string, now: Date = new Date()): Promise<SetupStart | Extract<MfaResult, { ok: false }>> {
  if (ctx.level !== 'enrol') return { ok: false, error: 'wrong_level' };
  const { data: listed, error: listError } = await ctx.supabase.auth.mfa.listFactors();
  if (listError || !listed) return { ok: false, error: 'failed' };
  for (const f of listed.all) {
    if (f.factor_type === 'totp' && f.status === 'unverified') await ctx.supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await ctx.supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer,
    friendlyName: `Admin ${now.toISOString().slice(0, 19).replace('T', ' ')}`,
  });
  if (error || !data) return { ok: false, error: 'failed' };
  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** The first code from the new factor verifies it and lifts the session to aal2. Only this account's unverified TOTP factor. */
export async function confirmSetup(ctx: AdminMfaContext, factorId: unknown, raw: unknown): Promise<MfaResult> {
  if (ctx.level !== 'enrol') return { ok: false, error: 'wrong_level' };
  const code = cleanCode(raw);
  if (!code) return { ok: false, error: 'bad_code' };
  if (typeof factorId !== 'string' || factorId.length === 0) return { ok: false, error: 'no_factor' };
  const { data, error } = await ctx.supabase.auth.mfa.listFactors();
  if (error || !data) return { ok: false, error: 'failed' };
  const own = data.all.some((f) => f.id === factorId && f.factor_type === 'totp' && f.status === 'unverified');
  if (!own) return { ok: false, error: 'no_factor' };
  const r = await ctx.supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return r.error ? { ok: false, error: 'wrong_code' } : { ok: true };
}
