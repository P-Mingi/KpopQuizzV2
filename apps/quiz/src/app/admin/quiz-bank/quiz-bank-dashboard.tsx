'use client';

import { useState, useMemo, useCallback } from 'react';
import { validateSchedule } from '@/lib/quiz-bank-scheduling';

import type { QuizBankEntry } from '@/lib/quiz-bank-scheduling';

interface Props {
  entries: QuizBankEntry[];
  groups: { id: number; name: string; slug: string }[];
}

const STATUS_ORDER = ['draft', 'verified', 'scheduled', 'published'];
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-secondary text-txt-secondary',
  verified: 'bg-info-bg text-info-text',
  scheduled: 'bg-[#EAF3DE] text-[#27500A]',
  published: 'bg-[#EEEDFE] text-[#3C3489]',
};
const CATEGORY_LABELS: Record<string, string> = {
  group_specific: 'Group',
  knowledge: 'Knowledge',
  true_false: 'True/False',
  fun: 'Fun',
  era: 'Era',
};

export function QuizBankDashboard({ entries: initialEntries, groups }: Props): React.ReactElement {
  const [entries, setEntries] = useState<QuizBankEntry[]>(initialEntries);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const groupMap = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    [groups],
  );

  const violations = useMemo(() => validateSchedule(entries), [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      return true;
    });
  }, [entries, statusFilter, categoryFilter]);

  const stats = useMemo((): Record<string, number> => {
    const total = entries.length;
    const byStatus = entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {});
    return { total, ...byStatus };
  }, [entries]);

  const updateEntry = useCallback(async (id: string, patch: Partial<QuizBankEntry>) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/quiz-bank/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Failed to update');
      const { entry } = await res.json() as { entry: QuizBankEntry };
      setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSavingId(null);
    }
  }, []);

  const promoteStatus = useCallback((entry: QuizBankEntry) => {
    const idx = STATUS_ORDER.indexOf(entry.status);
    if (idx < STATUS_ORDER.length - 2) { // can't promote past 'scheduled' manually
      const nextStatus = STATUS_ORDER[idx + 1];
      if (nextStatus) updateEntry(entry.id, { status: nextStatus });
    }
  }, [updateEntry]);

  const demoteStatus = useCallback((entry: QuizBankEntry) => {
    const idx = STATUS_ORDER.indexOf(entry.status);
    if (idx > 0 && entry.status !== 'published') {
      const prevStatus = STATUS_ORDER[idx - 1];
      if (prevStatus) updateEntry(entry.id, { status: prevStatus });
    }
  }, [updateEntry]);

  const handleDateSave = useCallback((entry: QuizBankEntry, newDate: string) => {
    const patch: Partial<QuizBankEntry> = { scheduled_date: newDate || null };
    if (newDate && entry.status === 'verified') {
      patch.status = 'scheduled';
    }
    updateEntry(entry.id, patch);
    setEditingDateId(null);
  }, [updateEntry]);

  const handlePublishToday = useCallback(async () => {
    if (!confirm('Publish today\'s scheduled quiz bank entry now?')) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/qotd/publish');
      const data = await res.json() as { success?: boolean; already_published?: boolean; error?: string; quiz_id?: string };
      if (data.already_published) {
        alert('Today\'s quiz is already published.');
      } else if (data.success) {
        alert(`Published! Quiz ID: ${data.quiz_id}. Reloading...`);
        window.location.reload();
      } else {
        alert(data.error ?? 'Publish failed.');
      }
    } catch {
      alert('Publish failed.');
    } finally {
      setPublishing(false);
    }
  }, []);

  const handleAutoSchedule = useCallback(async (force = false) => {
    if (force && !confirm('This will clear and reschedule ALL non-published quizzes. Continue?')) return;
    setAutoScheduling(true);
    try {
      const res = await fetch('/api/admin/quiz-bank/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(force ? { force: true } : {}),
      });
      const data = await res.json() as { scheduled: number; assignments?: Record<string, string> };
      if (data.scheduled === 0) {
        alert('No unscheduled verified quizzes to schedule.');
        return;
      }
      alert(`Scheduled ${data.scheduled} quizzes. Reloading...`);
      window.location.reload();
    } catch {
      alert('Auto-schedule failed.');
    } finally {
      setAutoScheduling(false);
    }
  }, []);

  const violationDates = useMemo(
    () => new Set(violations.map((v) => v.quiz_id)),
    [violations],
  );

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-txt-primary">Quiz Bank</h1>
          <p className="text-sm text-txt-secondary mt-0.5">
            Pre-verified quizzes that auto-publish as Quiz of the Day
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePublishToday}
            disabled={publishing}
            className="px-4 py-2 bg-[#EAF3DE] text-[#27500A] text-sm font-medium rounded-lg hover:bg-[#D5EAC0] transition-colors disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish Today'}
          </button>
          <button
            onClick={() => handleAutoSchedule(false)}
            disabled={autoScheduling}
            className="px-4 py-2 bg-[#EEEDFE] text-[#3C3489] text-sm font-medium rounded-lg hover:bg-[#E0DEFD] transition-colors disabled:opacity-50"
          >
            {autoScheduling ? 'Scheduling...' : 'Auto-schedule unscheduled'}
          </button>
          <button
            onClick={() => handleAutoSchedule(true)}
            disabled={autoScheduling}
            className="px-4 py-2 bg-[#FEF3EE] text-[#7C2D0A] text-sm font-medium rounded-lg hover:bg-[#FDE8DA] transition-colors disabled:opacity-50"
          >
            Reschedule all
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total ?? 0, color: 'text-txt-primary' },
          { label: 'Draft', value: stats.draft ?? 0, color: 'text-txt-secondary' },
          { label: 'Verified', value: stats.verified ?? 0, color: 'text-info-text' },
          { label: 'Scheduled', value: stats.scheduled ?? 0, color: 'text-[#27500A]' },
          { label: 'Published', value: stats.published ?? 0, color: 'text-[#3C3489]' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-primary border border-border-light rounded-lg p-3 text-center">
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-txt-secondary mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Violations */}
      {violations.length > 0 && (
        <div className="mb-4 bg-[#FFF9EB] border border-[#F5E0A0] rounded-lg p-4">
          <p className="text-sm font-medium text-[#7A4F00] mb-2">
            {violations.length} scheduling {violations.length === 1 ? 'warning' : 'warnings'}
          </p>
          <ul className="space-y-1">
            {violations.slice(0, 5).map((v, i) => (
              <li key={i} className="text-xs text-[#7A4F00]">
                <span className="font-medium">{v.date}</span> — {v.quiz_title}: {v.message}
              </li>
            ))}
            {violations.length > 5 && (
              <li className="text-xs text-[#7A4F00]">...and {violations.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-border-light rounded-lg px-3 py-1.5 bg-surface-primary text-txt-primary"
        >
          <option value="all">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-border-light rounded-lg px-3 py-1.5 bg-surface-primary text-txt-primary"
        >
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-sm text-txt-secondary self-center ml-auto">
          {filteredEntries.length} of {entries.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-primary border border-border-light rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light bg-surface-secondary">
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary w-32">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary w-28">Group</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary w-28">Category</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary w-20">Diff.</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary w-28">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-txt-secondary w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-txt-secondary text-sm">
                  No quizzes match the current filters.
                </td>
              </tr>
            )}
            {filteredEntries.map((entry) => (
              <>
                <tr
                  key={entry.id}
                  className={`border-b border-border-light last:border-0 hover:bg-surface-secondary/50 transition-colors ${
                    violationDates.has(entry.id) ? 'bg-[#FFFBF0]' : ''
                  }`}
                >
                  {/* Date */}
                  <td className="px-4 py-3">
                    {editingDateId === entry.id ? (
                      <input
                        type="date"
                        defaultValue={entry.scheduled_date ?? ''}
                        className="text-xs border border-border-medium rounded px-2 py-1 w-full"
                        autoFocus
                        onBlur={(e) => handleDateSave(entry, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleDateSave(entry, (e.target as HTMLInputElement).value);
                          if (e.key === 'Escape') setEditingDateId(null);
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => entry.status !== 'published' && setEditingDateId(entry.id)}
                        className={`text-xs ${entry.scheduled_date ? 'text-txt-primary font-medium' : 'text-txt-tertiary'} ${
                          entry.status !== 'published' ? 'hover:underline cursor-pointer' : 'cursor-default'
                        }`}
                        title={entry.status !== 'published' ? 'Click to set date' : undefined}
                      >
                        {entry.scheduled_date
                          ? new Date(entry.scheduled_date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                          : 'Unscheduled'}
                      </button>
                    )}
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="text-left text-txt-primary font-medium hover:text-txt-secondary transition-colors line-clamp-1 max-w-xs"
                      title={entry.title}
                    >
                      {entry.title}
                    </button>
                    {entry.verification_notes && (
                      <p className="text-xs text-txt-tertiary mt-0.5 line-clamp-1">{entry.verification_notes}</p>
                    )}
                  </td>

                  {/* Group */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-txt-secondary">
                      {entry.group_id ? (groupMap.get(entry.group_id) ?? 'Unknown') : 'General'}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-txt-secondary">
                      {CATEGORY_LABELS[entry.category] ?? entry.category}
                    </span>
                  </td>

                  {/* Difficulty */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-txt-secondary capitalize">{entry.difficulty}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status] ?? ''}`}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {savingId === entry.id ? (
                        <span className="text-xs text-txt-tertiary">Saving...</span>
                      ) : (
                        <>
                          {entry.status !== 'published' && STATUS_ORDER.indexOf(entry.status) < STATUS_ORDER.length - 2 && (
                            <button
                              onClick={() => promoteStatus(entry)}
                              className="text-xs text-info-text hover:underline"
                              title="Promote status"
                            >
                              Promote
                            </button>
                          )}
                          {entry.status !== 'draft' && entry.status !== 'published' && (
                            <button
                              onClick={() => demoteStatus(entry)}
                              className="text-xs text-txt-secondary hover:underline"
                              title="Demote status"
                            >
                              Demote
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded questions */}
                {expandedId === entry.id && (
                  <tr key={`${entry.id}-expanded`} className="bg-surface-secondary/30">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="max-h-80 overflow-y-auto space-y-3">
                        <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">
                          Questions ({(entry.questions as Record<string, unknown>[]).length})
                        </p>
                        {(entry.questions as Record<string, unknown>[]).map((q, qi) => (
                          <div key={qi} className="text-xs bg-surface-primary border border-border-light rounded-lg p-3">
                            <p className="font-medium text-txt-primary mb-1">
                              {qi + 1}. {q.question as string}
                            </p>
                            {Array.isArray(q.options) && (
                              <div className="grid grid-cols-2 gap-1 mb-1">
                                {(q.options as string[]).map((opt, oi) => (
                                  <span
                                    key={oi}
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      oi === (q.correct as number)
                                        ? 'bg-[#EAF3DE] text-[#27500A] font-medium'
                                        : 'text-txt-secondary'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + oi)}. {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                            {typeof q.correct === 'boolean' && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                q.correct ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#FCEBEB] text-[#791F1F]'
                              }`}>
                                {q.correct ? 'True' : 'False'}
                              </span>
                            )}
                            {q.fun_fact ? (
                              <p className="text-txt-tertiary mt-1 italic">{String(q.fun_fact)}</p>
                            ) : null}
                            {q.source ? (
                              <a
                                href={String(q.source)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-info-text hover:underline text-xs mt-0.5 block truncate"
                              >
                                {String(q.source)}
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
