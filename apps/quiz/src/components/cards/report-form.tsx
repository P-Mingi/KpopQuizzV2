'use client';

// Bunnyverse Cards, lane U: the form of /cards/report. It posts { photoId?, n?, role, message, contact? } to POST /api/cards/report
// (no sign-in needed). The page says a reported photo is removed within 48 hours.
import { useState } from 'react';

export const REPORT_ROLES: { value: 'person' | 'photographer' | 'agency' | 'other'; label: string }[] = [
  { value: 'person', label: 'I am the person shown' },
  { value: 'photographer', label: 'I am the photographer' },
  { value: 'agency', label: 'I speak for an agency' },
  { value: 'other', label: 'Something else' },
];

export const REMOVAL_PROMISE = 'We remove a reported photo within 48 hours.';

interface Props { photoId: number | null; cardNo: number | null; cardLabel: string | null }

export function ReportForm({ photoId, cardNo, cardLabel }: Props): React.ReactElement {
  const [role, setRole] = useState<string>('person');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (state === 'sending') return;
    if (message.trim().length < 5) { setErr('Tell us a little more, a few words are enough.'); setState('error'); return; }
    setState('sending'); setErr('');
    try {
      const body: Record<string, unknown> = { role, message: message.trim() };
      if (photoId !== null) body.photoId = photoId;
      if (cardNo !== null) body.n = cardNo;
      if (contact.trim()) body.contact = contact.trim();
      const res = await fetch('/api/cards/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
      if (res.ok) { setState('done'); return; }
      setErr(res.status === 429 ? 'Too many reports from this connection. Try again a bit later.' : 'The report could not be sent. Try again.');
      setState('error');
    } catch {
      setErr('The connection dropped. Try again.');
      setState('error');
    }
  };

  if (state === 'done') {
    return <p className="page-note" role="status">Thank you. The report is with us. {REMOVAL_PROMISE}</p>;
  }
  return (
    <form className="form" onSubmit={(e) => void submit(e)} noValidate>
      {cardLabel ? <p className="hint">About the photo on {cardLabel}.</p> : <p className="hint">You can also send the report from the page of a card, which names the photo for us.</p>}
      <fieldset>
        <legend>You are</legend>
        {REPORT_ROLES.map((r) => (
          <label key={r.value} className="opt"><input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} />{r.label}</label>
        ))}
      </fieldset>
      <div>
        <label htmlFor="rp-msg"><b>What is wrong?</b></label>
        <textarea id="rp-msg" name="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required aria-describedby={state === 'error' ? 'rp-err' : undefined} />
      </div>
      <div>
        <label htmlFor="rp-contact"><b>How can we reach you?</b> (optional)</label>
        <input id="rp-contact" name="contact" type="text" autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} />
        <p className="hint" style={{ marginTop: 6 }}>Only used to answer this report. It is erased when the report is closed.</p>
      </div>
      {state === 'error' ? <p id="rp-err" className="err" role="alert">{err}</p> : null}
      <div className="actions">
        <button type="submit" className="btn-primary lg" disabled={state === 'sending'}>{state === 'sending' ? 'Sending' : 'Send the report'}</button>
        <span className="hint">{REMOVAL_PROMISE}</span>
      </div>
    </form>
  );
}
