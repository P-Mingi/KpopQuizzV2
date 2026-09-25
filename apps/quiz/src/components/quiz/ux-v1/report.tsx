'use client';

import { useId, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { Sheet } from '@/components/ux-v1/sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { useIsClient } from '@/components/ux-v1/use-is-client';

// Same reasons and the same POST /api/quiz/[id]/report { reason, details } payload as
// the EXISTS components/quiz/report-form.tsx; only the skin is new (a sheet).
const REASONS = [
  { value: 'wrong_answers', label: 'Wrong answers' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
] as const;

/** "Report this quiz" link + its sheet (X, Escape and the backdrop close it). */
export function P4ReportButton({ quizId, withIcon = false, className }: { quizId: string; withIcon?: boolean; className?: string }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useUxToast();
  const uid = useId().replace(/:/g, '');
  const first = useRef<HTMLInputElement>(null);
  const ready = useIsClient();

  const send = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setOpen(false);
        toast("Thanks for reporting. We'll review this quiz.");
      } else {
        toast('Could not send the report. Try again.');
      }
    } catch {
      toast('Could not send the report. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={['p4-report', className ?? ''].filter(Boolean).join(' ')} onClick={() => setOpen(true)} disabled={sent} aria-haspopup="dialog" data-p4-report="" data-ready={ready ? '' : undefined}>
        {withIcon ? <Icon name="flag" /> : null}{sent ? 'Reported' : 'Report this quiz'}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Report this quiz" width={440} initialFocus={first}>
        <form onSubmit={(e) => { void send(e); }}>
          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="ux-sh-p">What is wrong with it?</legend>
            <div className="p4-reasons">
              {REASONS.map((r, i) => (
                <label key={r.value} className="p4-reason">
                  <input ref={i === 0 ? first : undefined} type="radio" name={`p4-reason-${uid}`} value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="ux-sr" htmlFor={`p4-report-d-${uid}`}>Details</label>
          <textarea id={`p4-report-d-${uid}`} className="ux-inp" style={{ marginTop: 12, minHeight: 88 }} placeholder="Details (optional)" maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
          <div className="ux-sh-foot">
            <button type="button" className="ux-btn ux-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="ux-btn ux-btn-primary" disabled={!reason || busy}>{busy ? 'Sending...' : 'Send report'}</button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
