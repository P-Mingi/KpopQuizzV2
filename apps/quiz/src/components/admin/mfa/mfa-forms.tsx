'use client';

// ADMIN-1 (owner, 2026-10-30): the two forms of the admin's TOTP pages. The code form (aal1 with a factor) and the setup form
// (aal1 with none: QR code, secret as text, first code). Both post to the one MFA route; on success the session is aal2 and
// the browser opens /admin with a full load, so the server reads the new cookies. Nothing typed here is stored or logged.
import { useState } from 'react';

import { ADMIN_HOME_PATH, ADMIN_MFA_API } from '@/lib/admin/paths';

// The build's base path ('/anime' on OtakuQuiz, '' elsewhere), inlined by Next (lib/site/base-path.ts).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

const MESSAGES: Readonly<Record<string, string>> = {
  bad_code: 'Type the 6 digits shown in your app.',
  wrong_code: 'That code did not work. Wait for the next code and try again.',
  no_factor: 'This setup has expired. Reload the page and start again.',
  wrong_level: 'This step is done already. Reload the page.',
};
const FALLBACK = 'Something went wrong. Reload the page and try again.';

type Answer = { ok: true; factorId?: string; qr?: string; secret?: string } | { ok: false; error?: string };

async function post(body: Record<string, string>): Promise<Answer> {
  try {
    const res = await fetch(`${BASE_PATH}${ADMIN_MFA_API}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => null)) as Answer | null;
    return data ?? { ok: false };
  } catch {
    return { ok: false };
  }
}

function openAdmin(): void {
  window.location.assign(`${BASE_PATH}${ADMIN_HOME_PATH}`);
}

const field: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 22, letterSpacing: 6, fontVariantNumeric: 'tabular-nums',
  border: '1px solid var(--border-default, #ccc)', borderRadius: 10, background: 'transparent', color: 'inherit',
};
const button: React.CSSProperties = {
  minHeight: 44, padding: '0 18px', borderRadius: 10, border: 'none', fontWeight: 600, cursor: 'pointer',
  background: 'var(--accent, #222)', color: 'var(--accent-contrast, #fff)',
};

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }): React.ReactElement {
  return (
    <input
      id="admin-code"
      name="code"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      autoFocus
      aria-describedby="admin-code-help"
      style={field}
    />
  );
}

/** aal1 with a verified factor: one field, 6 digits. */
export function MfaCodeForm(): React.ReactElement {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await post({ action: 'verify', code });
    if (r.ok) { openAdmin(); return; }
    setBusy(false);
    setCode('');
    setError(MESSAGES[r.error ?? ''] ?? FALLBACK);
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
      <label htmlFor="admin-code" style={{ fontSize: 13, fontWeight: 600 }}>Code</label>
      <CodeInput value={code} onChange={setCode} />
      <p id="admin-code-help" style={{ fontSize: 12, margin: 0, opacity: 0.75 }}>From your authenticator app or password manager.</p>
      <button type="submit" disabled={busy || code.length !== 6} style={button}>{busy ? 'Checking...' : 'Continue'}</button>
      {error && <p role="alert" style={{ fontSize: 13, margin: 0 }}>{error}</p>}
    </form>
  );
}

/** aal1 with no factor: show the QR code once, then the first code verifies the factor. */
export function MfaSetupForm(): React.ReactElement {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(): Promise<void> {
    setBusy(true);
    setError(null);
    const r = await post({ action: 'start' });
    setBusy(false);
    if (r.ok && r.factorId && r.qr && r.secret) setFactor({ id: r.factorId, qr: r.qr, secret: r.secret });
    else setError(MESSAGES[(r.ok ? '' : r.error) ?? ''] ?? FALLBACK);
  }

  async function confirm(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!factor) return;
    setBusy(true);
    setError(null);
    const r = await post({ action: 'confirm', factorId: factor.id, code });
    if (r.ok) { openAdmin(); return; }
    setBusy(false);
    setCode('');
    setError(MESSAGES[r.error ?? ''] ?? FALLBACK);
  }

  if (!factor) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <button type="button" onClick={() => void start()} disabled={busy} style={button}>{busy ? 'Preparing...' : 'Show the QR code'}</button>
        {error && <p role="alert" style={{ fontSize: 13, margin: 0 }}>{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void confirm(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
      <ol style={{ fontSize: 14, lineHeight: 1.5, paddingLeft: 18, margin: 0 }}>
        <li>Scan this QR code with the authenticator app on your phone.</li>
        <li>Add the same code to your password manager too (scan it, or paste the key below), so you keep a second way in.</li>
        <li>Type the 6 digits one of them shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG data URL from Supabase, never a remote image */}
      <img src={factor.qr} alt="QR code to add to your authenticator app" width={200} height={200} style={{ background: '#fff', borderRadius: 8, padding: 8 }} />
      <p style={{ fontSize: 12, margin: 0, overflowWrap: 'anywhere' }}>Key: <code>{factor.secret}</code></p>
      <label htmlFor="admin-code" style={{ fontSize: 13, fontWeight: 600 }}>Code</label>
      <CodeInput value={code} onChange={setCode} />
      <p id="admin-code-help" style={{ fontSize: 12, margin: 0, opacity: 0.75 }}>The code changes every 30 seconds.</p>
      <button type="submit" disabled={busy || code.length !== 6} style={button}>{busy ? 'Checking...' : 'Turn on and continue'}</button>
      {error && <p role="alert" style={{ fontSize: 13, margin: 0 }}>{error}</p>}
    </form>
  );
}
