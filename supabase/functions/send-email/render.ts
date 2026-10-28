// Run O1, lot (e), lane B7: the branded email renderer (docs/o1/contracts/copy-keys.md 1, apis.md 3.4). PURE and import-free
// on purpose: the very same file runs in the Supabase Edge Function send-email (Deno cannot import from apps/quiz), so
// supabase/functions/send-email/render.ts is a byte-identical copy and render.test.ts fails when the two drift.
//
//  - renderEmail(...)   anime and hub: magicLink, signup, emailChange, reauth (a code) and, on the hub and kpop, deletionScheduled.
//  - renderKpop(...)    kpopquiz.org: the text Supabase Auth sends today, byte for byte (its default templates, with the
//                        link and the numbers of the Send Email Hook payload put where {{ .ConfirmationURL }} etc. stood).
//  - hook helpers       the site of a redirect URL, the confirm link, the Standard Webhooks signature check.
//
// Never logged: a link, a token, a code, an address. Every interpolated value is HTML-escaped.

export type MailSite = 'kpop' | 'anime' | 'hub';
export type MailKind = 'magicLink' | 'signup' | 'emailChange' | 'reauth' | 'deletionScheduled';

/** What the renderer needs to know about a site (the registry's brand, url and domain, mirrored by brands.ts of the function). */
export interface MailBrand {
  readonly id: MailSite;
  readonly name: string;
  readonly url: string;
  readonly domain: string;
  /** The network's display name (registry NETWORK.name). */
  readonly network: string;
  readonly privacyPath: string;
  /** Button and heading accent, a #RRGGBB colour. */
  readonly accent: string;
}

export type MailCopy = Readonly<Record<string, string>>;

export interface RenderedMail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface RenderInput {
  readonly kind: MailKind;
  readonly brand: MailBrand;
  /** The copy of that brand: keys `email.magicLink.subject` and so on (copy-keys.md 3), without the `<site>.b7.` prefix. */
  readonly copy: MailCopy;
  /** The one-click link (magicLink, signup, emailChange). */
  readonly link?: string;
  /** The six-digit code (reauth). */
  readonly code?: string;
  /** deletionScheduled (hub and kpop): the date the deletion runs, already formatted by the caller. */
  readonly date?: string;
}

const KEYS_BY_KIND = {
  magicLink: ['subject', 'heading', 'button'],
  signup: ['subject', 'heading', 'button'],
  emailChange: ['subject', 'heading', 'button'],
  reauth: ['subject', 'heading'],
  deletionScheduled: ['subject', 'body', 'cancel'],
} as const satisfies Record<MailKind, readonly string[]>;

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `{brand}`, `{network}`, `{domain}` and `{date}` filled; an unknown placeholder stays as written. */
export function fill(template: string, vars: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k]! : m));
}

function need(copy: MailCopy, key: string): string {
  const v = copy[key];
  if (typeof v !== 'string' || v.length === 0) throw new Error(`email copy key missing: ${key}`);
  return v;
}

/** The key names a kind reads, for the parity tests. */
export function copyKeysFor(kind: MailKind): readonly string[] {
  return KEYS_BY_KIND[kind].map((k) => `email.${kind}.${k}`);
}

export function privacyUrl(brand: MailBrand): string {
  return `${brand.url}${brand.privacyPath}`;
}

/** The rabbit before the name of OtakuQuiz and FandomVerse (owner, 2026-10-25); KpopQuiz's own mails keep the name alone. */
function mark(brand: MailBrand): string {
  if (brand.id !== 'anime' && brand.id !== 'hub') return '';
  return `<img src="${esc(brand.url)}/mascot/mascot-default.png" width="28" height="28" alt="" style="vertical-align:middle;border:0;margin-right:8px">`;
}

function shell(brand: MailBrand, inner: string, copy: MailCopy, vars: Readonly<Record<string, string>>): string {
  const network = esc(fill(need(copy, 'email.footerNetwork'), vars));
  const privacy = esc(fill(need(copy, 'email.footerPrivacy'), vars));
  return (
    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
    `<title>${esc(brand.name)}</title></head>\n` +
    '<body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a22">\n' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">\n' +
    '<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">\n' +
    `<tr><td style="font-size:14px;font-weight:700;letter-spacing:.02em;color:${brand.accent}">${mark(brand)}${esc(brand.name)}</td></tr>\n` +
    `${inner}\n` +
    `<tr><td style="padding-top:28px;font-size:12px;line-height:18px;color:#5c5d6b">${network}<br>` +
    `<a href="${esc(privacyUrl(brand))}" style="color:#5c5d6b">${privacy}</a></td></tr>\n` +
    '</table>\n</td></tr></table>\n</body></html>\n'
  );
}

function button(brand: MailBrand, href: string, label: string): string {
  return (
    `<tr><td style="padding-top:20px"><a href="${esc(href)}" style="display:inline-block;background:${brand.accent};color:#ffffff;` +
    `text-decoration:none;font-weight:600;font-size:16px;padding:12px 22px;border-radius:8px">${esc(label)}</a></td></tr>`
  );
}

/** Anime and hub emails. Throws when a copy key, the link or the code is missing (a bad template never goes out half empty). */
export function renderEmail(input: RenderInput): RenderedMail {
  const { kind, brand, copy } = input;
  // kpopquiz.org keeps the text Supabase Auth sends today (renderKpop); the one email renderEmail renders for it is the
  // "deletion scheduled" notice of the passport deletion (owner decision of 2026-10-24), which is not an Auth email.
  if (brand.id === 'kpop' && kind !== 'deletionScheduled') throw new Error('renderEmail does not render kpop: use renderKpop');
  const vars: Record<string, string> = { brand: brand.name, network: brand.network, domain: brand.domain };
  if (input.date !== undefined) vars.date = input.date;
  const subject = fill(need(copy, `email.${kind}.subject`), vars);
  const ignore = kind === 'deletionScheduled' ? '' : fill(need(copy, 'email.ignore'), vars);
  let inner: string;
  let text: string;

  if (kind === 'deletionScheduled') {
    if (brand.id === 'anime') throw new Error('deletionScheduled is a hub and kpop email');
    const link = input.link;
    if (!link) throw new Error('deletionScheduled needs the link to cancel');
    const body = fill(need(copy, 'email.deletionScheduled.body'), vars);
    const cancel = fill(need(copy, 'email.deletionScheduled.cancel'), vars);
    inner =
      `<tr><td style="padding-top:16px;font-size:16px;line-height:24px">${esc(body)}</td></tr>\n${button(brand, link, cancel)}`;
    text = `${body}\n\n${cancel}: ${link}\n`;
  } else if (kind === 'reauth') {
    const code = input.code;
    if (!code) throw new Error('reauth needs the code');
    const heading = fill(need(copy, 'email.reauth.heading'), vars);
    inner =
      `<tr><td style="padding-top:16px;font-size:22px;line-height:28px;font-weight:700">${esc(heading)}</td></tr>\n` +
      `<tr><td style="padding-top:16px;font-size:32px;letter-spacing:6px;font-weight:700;font-family:Menlo,Consolas,monospace">${esc(code)}</td></tr>\n` +
      `<tr><td style="padding-top:20px;font-size:14px;line-height:20px;color:#5c5d6b">${esc(ignore)}</td></tr>`;
    text = `${heading}\n\n${code}\n\n${ignore}\n`;
  } else {
    const link = input.link;
    if (!link) throw new Error(`${kind} needs the link`);
    const heading = fill(need(copy, `email.${kind}.heading`), vars);
    const label = fill(need(copy, `email.${kind}.button`), vars);
    inner =
      `<tr><td style="padding-top:16px;font-size:22px;line-height:28px;font-weight:700">${esc(heading)}</td></tr>\n${button(brand, link, label)}\n` +
      `<tr><td style="padding-top:20px;font-size:14px;line-height:20px;color:#5c5d6b">${esc(ignore)}</td></tr>`;
    text = `${heading}\n\n${label}: ${link}\n\n${ignore}\n`;
  }

  const footerNetwork = fill(need(copy, 'email.footerNetwork'), vars);
  const footerPrivacy = fill(need(copy, 'email.footerPrivacy'), vars);
  text += `\n${footerNetwork}\n${footerPrivacy}: ${privacyUrl(brand)}\n`;
  return { subject, html: shell(brand, inner, copy, vars), text };
}

// ---------------------------------------------------------------------------------------------------------------
// kpopquiz.org: today's text, unchanged
// ---------------------------------------------------------------------------------------------------------------

/** The `email_action_type` values of the Send Email Hook. */
export type HookAction = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email' | 'reauthentication';

export interface KpopVars {
  /** The verify URL Supabase builds for {{ .ConfirmationURL }}. */
  readonly confirmationUrl: string;
  readonly email: string;
  readonly newEmail: string;
  readonly token: string;
  readonly siteUrl: string;
}

/**
 * The templates Supabase Auth sends today, which kpopquiz.org uses unchanged (the project has no custom template in the repo): its default
 * subjects and bodies. The owner compares them with Authentication > Email Templates before enabling the hook (deploy note).
 */
export function renderKpop(action: HookAction, v: KpopVars): RenderedMail | null {
  switch (action) {
    case 'signup':
      return {
        subject: 'Confirm Your Signup',
        html: `<h2>Confirm your signup</h2>\n\n<p>Follow this link to confirm your user:</p>\n<p><a href="${v.confirmationUrl}">Confirm your mail</a></p>`,
        text: '',
      };
    case 'invite':
      return {
        subject: 'You have been invited',
        html: `<h2>You have been invited</h2>\n\n<p>You have been invited to create a user on ${v.siteUrl}. Follow this link to accept the invite:</p>\n<p><a href="${v.confirmationUrl}">Accept the invite</a></p>`,
        text: '',
      };
    case 'magiclink':
    case 'email':
      return {
        subject: 'Your Magic Link',
        html: `<h2>Magic Link</h2>\n\n<p>Follow this link to login:</p>\n<p><a href="${v.confirmationUrl}">Log In</a></p>`,
        text: '',
      };
    case 'recovery':
      return {
        subject: 'Reset Your Password',
        html: `<h2>Reset Password</h2>\n\n<p>Follow this link to reset the password for your user:</p>\n<p><a href="${v.confirmationUrl}">Reset Password</a></p>`,
        text: '',
      };
    case 'email_change':
      return {
        subject: 'Confirm Email Change',
        html: `<h2>Confirm Change of Email</h2>\n\n<p>Follow this link to confirm the update of your email from ${v.email} to ${v.newEmail}:</p>\n<p><a href="${v.confirmationUrl}">Change Email</a></p>`,
        text: '',
      };
    case 'reauthentication':
      return {
        subject: 'Confirm reauthentication',
        html: `<h2>Confirm reauthentication</h2>\n\n<p>Enter the code: ${v.token}</p>`,
        text: '',
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Hook helpers
// ---------------------------------------------------------------------------------------------------------------

/** A parsed `<site>=<origin>` list (the function's SEND_EMAIL_ORIGINS, same syntax as NEXT_PUBLIC_NET_ORIGINS). Malformed entries are ignored. */
export function parseOrigins(raw: string | undefined): Partial<Record<MailSite, string>> {
  const out: Partial<Record<MailSite, string>> = {};
  for (const entry of (raw ?? '').split(/[\s,]+/).filter(Boolean)) {
    const eq = entry.indexOf('=');
    if (eq <= 0) continue;
    const id = entry.slice(0, eq);
    const origin = entry.slice(eq + 1);
    if ((id === 'kpop' || id === 'anime' || id === 'hub') && /^https?:\/\/[a-z0-9.-]+(:[0-9]{1,5})?$/.test(origin)) out[id] = origin;
  }
  return out;
}

/** The origin and the path of an http(s) URL (no query, no hash), or null. */
function hrefOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? `${u.origin}${u.pathname}` : null;
  } catch {
    return null;
  }
}

/** True when `href` is on the site whose url is `base`: its origin, and its folder when it has one (https://fandomverse.org/anime). */
function onBase(href: string, base: string): boolean {
  return href === base || href.startsWith(`${base}/`);
}

/** The folder of a brand url ('/anime' of https://fandomverse.org/anime), '' when it is served at the root of its origin. */
function folderOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/**
 * The url of `site` on this deployment: with an override (a bare staging origin, like NEXT_PUBLIC_NET_ORIGINS), that origin and the
 * folder of the brand url (anime: `<staging origin>/anime`), else the brand url. Redirect URLs are matched against it and mails link to it.
 */
export function siteBaseFor(site: MailSite, brands: Readonly<Record<MailSite, MailBrand>>, overrides: Partial<Record<MailSite, string>> = {}): string {
  const o = overrides[site];
  return o === undefined ? brands[site].url : `${o}${folderOf(brands[site].url)}`;
}

const MAIL_SITES = ['anime', 'hub', 'kpop'] as const;

/** The site whose base holds `href`, the longest base first (anime's folder before the hub on their shared origin); on a tie, the earlier one. */
function longestBase(href: string, bases: ReadonlyArray<readonly [MailSite, string]>): MailSite | null {
  let best: MailSite | null = null;
  let len = -1;
  for (const [id, base] of bases) {
    if (base.length > len && onBase(href, base)) {
      best = id;
      len = base.length;
    }
  }
  return best;
}

/**
 * The site a redirect URL belongs to, the longest matching url first (OtakuQuiz, https://fandomverse.org/anime, is a folder of the hub's
 * origin since 2026-10-28): a production brand url; else, on a dev project with override origins (staging), the staging url of a site
 * (its origin and the folder of its brand url, so the hub and anime on one staging origin each get their own brand and colours); else the
 * bare override origin of a site that has an origin of its own. Anything else, and a missing redirect, is kpop: the accounts that exist today.
 */
export function siteFromRedirect(
  redirectTo: string | null | undefined,
  brands: Readonly<Record<MailSite, MailBrand>>,
  overrides: Partial<Record<MailSite, string>> = {},
): MailSite {
  const href = redirectTo ? hrefOf(redirectTo) : null;
  if (href === null) return 'kpop';
  const staged = MAIL_SITES.filter((id) => overrides[id] !== undefined);
  return (
    longestBase(href, MAIL_SITES.map((id) => [id, brands[id].url] as const)) ??
    longestBase(href, staged.map((id) => [id, siteBaseFor(id, brands, overrides)] as const)) ??
    longestBase(href, staged.map((id) => [id, overrides[id]!] as const)) ??
    'kpop'
  );
}

/** The url a mail of `site` links to (siteBaseFor): the staging origin with the brand's folder when given, else the brand url. */
export function originFor(site: MailSite, brands: Readonly<Record<MailSite, MailBrand>>, overrides: Partial<Record<MailSite, string>> = {}): string {
  return siteBaseFor(site, brands, overrides);
}

const CONFIRM_TYPE: Readonly<Partial<Record<HookAction, 'magiclink' | 'signup' | 'email_change' | 'email'>>> = {
  magiclink: 'magiclink',
  signup: 'signup',
  email_change: 'email_change',
  email: 'email',
};

/** The mail kind of a hook action on anime and hub, or null when that site does not send it (recovery, invite). */
export function kindForAction(action: string): MailKind | null {
  if (action === 'magiclink' || action === 'email') return 'magicLink';
  if (action === 'signup') return 'signup';
  if (action === 'email_change') return 'emailChange';
  if (action === 'reauthentication') return 'reauth';
  return null;
}

/**
 * `next` of the redirect URL (its own `next` parameter, else a path other than /auth/confirm), always a path starting with one slash; '/'
 * otherwise. With `base` (the url the mail links to), the folder of that url is taken off the path first (https://fandomverse.org/anime).
 */
export function nextFromRedirect(redirectTo: string | null | undefined, base?: string): string {
  if (!redirectTo) return '/';
  try {
    const u = new URL(redirectTo);
    const folder = base ? new URL(base).pathname.replace(/\/+$/, '') : '';
    const path = folder && (u.pathname === folder || u.pathname.startsWith(`${folder}/`)) ? u.pathname.slice(folder.length) || '/' : u.pathname;
    const n = u.searchParams.get('next');
    const pick = n ?? (path !== '/auth/confirm' && path !== '/auth/callback' ? path + u.search : '/');
    return pick.startsWith('/') && !pick.startsWith('//') && !pick.includes('\\') ? pick : '/';
  } catch {
    return '/';
  }
}

/** The confirm link of anime and hub (apis.md 3.2): the browser lands on /auth/confirm with the hashed token. */
export function confirmLink(origin: string, tokenHash: string, action: HookAction, redirectTo: string | null | undefined): string | null {
  const type = CONFIRM_TYPE[action];
  if (!type) return null;
  const q = `token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=${encodeURIComponent(nextFromRedirect(redirectTo, origin))}`;
  return `${origin}/auth/confirm?${q}`;
}

/** Supabase's own verify URL, which is {{ .ConfirmationURL }} (kpop keeps /auth/callback behind it). */
export function verifyLink(supabaseUrl: string, tokenHash: string, action: HookAction, redirectTo: string | null | undefined): string {
  const redirect = redirectTo ? `&redirect_to=${encodeURIComponent(redirectTo)}` : '';
  return `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${action}${redirect}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Standard Webhooks signature (the Send Email Hook)
// ---------------------------------------------------------------------------------------------------------------

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function equalConstant(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export interface WebhookHeaders {
  readonly id: string | null;
  readonly timestamp: string | null;
  readonly signature: string | null;
}

/**
 * Standard Webhooks (what Supabase Auth hooks send): header `webhook-signature` holds `v1,<base64 HMAC-SHA256>` of
 * `<id>.<timestamp>.<raw body>` with the key of the secret `v1,whsec_<base64>`. A timestamp more than `toleranceSec` from `nowSec` fails.
 */
export async function verifyWebhook(
  secret: string,
  headers: WebhookHeaders,
  rawBody: string,
  nowSec: number,
  toleranceSec = 300,
): Promise<boolean> {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > toleranceSec) return false;
  const keyB64 = secret.replace(/^v1,whsec_/, '').replace(/^whsec_/, '');
  let key: Uint8Array;
  try {
    key = b64ToBytes(keyB64);
  } catch {
    return false;
  }
  const subtle = globalThis.crypto.subtle;
  const k = await subtle.importKey('raw', key as unknown as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await subtle.sign('HMAC', k, new TextEncoder().encode(`${headers.id}.${headers.timestamp}.${rawBody}`));
  const expected = bytesToB64(new Uint8Array(mac));
  let ok = false;
  for (const part of headers.signature.split(' ')) {
    const [version, sig] = part.split(',');
    if (version === 'v1' && sig && equalConstant(sig, expected)) ok = true;
  }
  return ok;
}

// ---------------------------------------------------------------------------------------------------------------
// The Send Email Hook, end to end (index.ts of the function only adds Deno.serve and the Resend call)
// ---------------------------------------------------------------------------------------------------------------

export interface HookEnv {
  /** SEND_EMAIL_HOOK_SECRET, `v1,whsec_<base64>`. */
  readonly secret: string;
  /** The project's API URL: the kpop verify link starts with it. */
  readonly supabaseUrl: string;
  /** Staging origins of anime and hub (SEND_EMAIL_ORIGINS, bare origins: anime adds the /anime of its brand url); empty in production. */
  readonly origins: Partial<Record<MailSite, string>>;
  /** Sender per site (`Name <address>`); anime and hub default to `<brand> <no-reply@domain>`, kpop has no default. */
  readonly from: Partial<Record<MailSite, string>>;
}

export interface OutgoingMail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
}

export interface HookDeps {
  readonly brands: Readonly<Record<MailSite, MailBrand>>;
  readonly copies: Readonly<Record<'anime' | 'hub', MailCopy>>;
  readonly env: HookEnv;
  readonly nowSec: number;
  readonly send: (mail: OutgoingMail) => Promise<boolean>;
}

export interface HookResult {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

function fail(status: number, message: string): HookResult {
  return { status, body: { error: { http_code: status, message } } };
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export async function handleHook(method: string, headers: WebhookHeaders, rawBody: string, deps: HookDeps): Promise<HookResult> {
  if (method !== 'POST') return fail(405, 'method');
  if (!(await verifyWebhook(deps.env.secret, headers, rawBody, deps.nowSec))) return fail(401, 'signature');

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return fail(400, 'bad_request');
  }
  const p = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>;
  const user = (typeof p.user === 'object' && p.user !== null ? p.user : {}) as Record<string, unknown>;
  const data = (typeof p.email_data === 'object' && p.email_data !== null ? p.email_data : {}) as Record<string, unknown>;
  const email = str(user.email);
  const newEmail = str(user.new_email) || str(user.email_new);
  const action = str(data.email_action_type) as HookAction;
  const tokenHash = str(data.token_hash);
  const tokenHashNew = str(data.token_hash_new);
  const token = str(data.token);
  const redirectTo = str(data.redirect_to) || null;
  if (!email || !action || (!tokenHash && action !== 'reauthentication')) return fail(400, 'bad_request');

  const { brands, env } = deps;
  const site = siteFromRedirect(redirectTo, brands, env.origins);
  const brand = brands[site];
  const from = env.from[site] ?? (site === 'kpop' ? '' : `${brand.name} <no-reply@${brand.domain}>`);
  if (!from) return fail(500, 'sender');

  // Who gets which link. An email change with two tokens goes to both addresses; with one token it goes to the new address.
  const targets: Array<{ to: string; hash: string }> = [];
  if (action === 'email_change') {
    if (tokenHashNew) {
      targets.push({ to: email, hash: tokenHash }, { to: newEmail || email, hash: tokenHashNew });
    } else {
      targets.push({ to: newEmail || email, hash: tokenHash });
    }
  } else {
    targets.push({ to: email, hash: tokenHash });
  }

  const mails: OutgoingMail[] = [];
  for (const t of targets) {
    let rendered: RenderedMail | null;
    if (site === 'kpop') {
      rendered = renderKpop(action, {
        confirmationUrl: verifyLink(env.supabaseUrl, t.hash, action, redirectTo),
        email,
        newEmail: newEmail || email,
        token,
        siteUrl: str(data.site_url),
      });
    } else {
      const kind = kindForAction(action);
      if (kind === null) return fail(400, 'unsupported_type');
      const link = kind === 'reauth' ? undefined : confirmLink(originFor(site, brands, env.origins), t.hash, action, redirectTo);
      if (kind !== 'reauth' && link === null) return fail(400, 'unsupported_type');
      rendered = renderEmail({
        kind,
        brand,
        copy: deps.copies[site],
        ...(link ? { link } : {}),
        ...(kind === 'reauth' ? { code: token } : {}),
      });
    }
    if (rendered === null) return fail(400, 'unsupported_type');
    mails.push({ from, to: t.to, subject: rendered.subject, html: rendered.html, ...(rendered.text ? { text: rendered.text } : {}) });
  }
  for (const m of mails) {
    if (!(await deps.send(m))) return fail(502, 'send');
  }
  return { status: 200, body: {} };
}
