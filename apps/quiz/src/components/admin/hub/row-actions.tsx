'use client';

// ADMIN-2: the two buttons of the hub admin's lists. Each posts to the admin route of the section's site (`site` in the query string: the
// routes validate it against SITE_IDS and filter by it), then refreshes the page. No address of the admin appears here: the page is already
// open, the routes are the shared /api/admin ones.
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Site = 'kpop' | 'anime' | 'hub';

async function call(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

function Button({ label, busyLabel, onClick, busy }: { label: string; busyLabel: string; onClick: () => void; busy: boolean }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="min-h-[36px] rounded-md border border-default px-3 text-sm text-secondary hover:text-primary disabled:opacity-60"
    >
      {busy ? busyLabel : label}
    </button>
  );
}

/** Remove a published quiz, or restore a removed one. */
export function QuizActions({ id, status, site }: { id: string; status: string; site: Site }): React.ReactElement | null {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const action = status === 'removed' ? 'restore' : status === 'published' ? 'remove' : null;
  if (action === null) return null;
  async function run(): Promise<void> {
    setBusy(true);
    setFailed(false);
    const ok = await call(`/api/admin/quiz/${encodeURIComponent(id)}/${action}?site=${site}`);
    setBusy(false);
    if (ok) router.refresh();
    else setFailed(true);
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button label={action === 'remove' ? 'Remove' : 'Restore'} busyLabel="Working..." busy={busy} onClick={() => void run()} />
      {failed && <span role="alert" className="text-xs">Did not work. Try again.</span>}
    </span>
  );
}

/** Mark a report as handled. */
export function ReportActions({ id, site }: { id: string; site: Site }): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run(): Promise<void> {
    setBusy(true);
    setFailed(false);
    const ok = await call(`/api/admin/report/${encodeURIComponent(id)}/dismiss?site=${site}`);
    setBusy(false);
    if (ok) router.refresh();
    else setFailed(true);
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button label="Dismiss" busyLabel="Working..." busy={busy} onClick={() => void run()} />
      {failed && <span role="alert" className="text-xs">Did not work. Try again.</span>}
    </span>
  );
}
