'use client';

import { useState } from 'react';

interface ReportFormProps {
  quizId: string;
}

const REASONS = [
  { value: 'wrong_answers', label: 'Wrong answers' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
] as const;

export function ReportForm({ quizId }: ReportFormProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/quiz/${quizId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // Silently fail - non-critical action
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <p className="text-xs text-txt-secondary mt-4 text-center">
        Thanks for reporting. We&apos;ll review this quiz.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-txt-tertiary mt-4 text-center cursor-pointer underline block mx-auto"
      >
        Report this quiz
      </button>
    );
  }

  return (
    <div className="mt-4 bg-surface-primary border border-border-light rounded-md p-4">
      <p className="text-sm font-medium text-txt-primary mb-3">Report this quiz</p>

      <div className="flex flex-col gap-2">
        {REASONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="report-reason"
              value={r.value}
              checked={reason === r.value}
              onChange={(e) => setReason(e.target.value)}
              className="accent-accent-pink"
            />
            <span className="text-sm text-txt-primary">{r.label}</span>
          </label>
        ))}
      </div>

      <textarea
        placeholder="Additional details (optional)"
        maxLength={500}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="w-full mt-3 px-4 py-3 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent-pink focus:ring-1 focus:ring-accent-pink transition-colors resize-none h-20"
      />

      <button
        onClick={handleSubmit}
        disabled={!reason || submitting}
        className="mt-3 px-5 py-2.5 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit report'}
      </button>
    </div>
  );
}
